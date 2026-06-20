const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Attendance = require('../models/Attendance');

// Transporter (Chờ cấu hình .env, nếu không có sẽ log thay vì lỗi sập server)
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

// Hàm format ngày YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const initCronJobs = () => {
  // Chạy mỗi phút
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Chỉnh múi giờ về local (ví dụ GMT+7, nhưng đơn giản thì nodejs lấy local time trên máy server)
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;

      // Tìm user cần báo cáo lúc này
      const users = await User.find({
        'notificationSettings.emailAlerts': true,
        'notificationSettings.alertTime': currentTimeStr
      });

      if (users.length === 0) return;

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = formatDate(tomorrowDate);

      const in3DaysDate = new Date();
      in3DaysDate.setDate(in3DaysDate.getDate() + 3);
      const in3DaysStr = formatDate(in3DaysDate);
      const todayStr = formatDate(new Date());

      for (const user of users) {
        let htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaebee; border-radius: 12px;">
            <h2 style="color: #2563eb; text-align: center;">Báo cáo Trợ lý Học tập Hằng ngày</h2>
            <p>Chào <b>${user.name}</b>,</p>
            <p>Dưới đây là tổng hợp lịch trình và các cảnh báo quan trọng dành cho bạn:</p>
            <hr style="border: none; border-top: 1px solid #eaebee; margin: 20px 0;"/>
        `;

        let hasContent = false;

        // 1. LỊCH TRÌNH NGÀY MAI
        const tomorrowEvents = await Schedule.find({
          userId: user._id,
          specificDate: tomorrowStr
        }).sort({ startTime: 1 });

        if (tomorrowEvents.length > 0) {
          hasContent = true;
          htmlBody += `<h3 style="color: #334155;">📅 Lịch trình ngày mai (${tomorrowStr.split('-').reverse().join('/')})</h3><ul>`;
          tomorrowEvents.forEach(ev => {
            const evType = ev.type === 'class' ? '🏫 Lớp học' : ev.type === 'exam' ? '📝 Lịch thi' : '⏳ Deadline';
            htmlBody += `<li style="margin-bottom: 8px;"><b>${evType}: ${ev.name}</b> <br/> 
              <span style="color: #64748b; font-size: 13px;">⏰ ${ev.startTime} ${ev.endTime ? '- ' + ev.endTime : ''} ${ev.room ? '| 📍 ' + ev.room : ''}</span></li>`;
          });
          htmlBody += `</ul>`;
        } else {
          htmlBody += `<p style="color: #64748b;">📅 Ngày mai bạn không có sự kiện nào. Hãy dành thời gian nghỉ ngơi nhé!</p>`;
        }

        // 2. DEADLINE TỚI HẠN (nếu bật)
        if (user.notificationSettings.deadlineAlerts) {
          const deadlines = await Schedule.find({
            userId: user._id,
            type: 'deadline',
            isCompleted: false,
            specificDate: { $gte: todayStr, $lte: in3DaysStr }
          }).sort({ specificDate: 1 });

          if (deadlines.length > 0) {
            hasContent = true;
            htmlBody += `<h3 style="color: #d97706; margin-top: 24px;">🔥 Các Deadline cần hoàn thành gấp</h3><ul style="color: #92400e;">`;
            deadlines.forEach(ev => {
              const dlDateStr = ev.specificDate.split('-').reverse().join('/');
              htmlBody += `<li style="margin-bottom: 8px;"><b>${ev.name}</b> - Hạn chót: ${dlDateStr} lúc ${ev.startTime}</li>`;
            });
            htmlBody += `</ul>`;
          }
        }

        // 3. CẢNH BÁO ĐIỂM DANH (nếu bật)
        if (user.notificationSettings.attendanceWarnings) {
          const attendances = await Attendance.find({ userId: user._id });
          const warnings = attendances.filter(att => {
            if (!att.maxAbsencesAllowed || att.maxAbsencesAllowed === 0) return false;
            return (att.absentDates.length / att.maxAbsencesAllowed) >= 0.7;
          });

          if (warnings.length > 0) {
            hasContent = true;
            htmlBody += `<h3 style="color: #e11d48; margin-top: 24px;">⚠️ Cảnh báo Chuyên cần (Nguy cơ cấm thi)</h3><ul style="color: #9f1239;">`;
            warnings.forEach(att => {
              const abs = att.absentDates.length;
              const max = att.maxAbsencesAllowed;
              htmlBody += `<li style="margin-bottom: 8px;">Môn <b>${att.subjectName}</b>: Đã vắng ${abs}/${max} buổi. Hãy chú ý không được nghỉ thêm!</li>`;
            });
            htmlBody += `</ul>`;
          }
        }

        htmlBody += `
            <hr style="border: none; border-top: 1px solid #eaebee; margin: 20px 0;"/>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email gửi tự động từ hệ thống quản lý học tập.<br/>Để thay đổi giờ nhận thông báo, vui lòng truy cập Cài đặt hệ thống.</p>
          </div>
        `;

        if (!hasContent) continue; // Nếu ko có gì để báo thì thôi

        // Gửi Mail
        if (transporter) {
          try {
            await transporter.sendMail({
              from: '"Trợ lý Học tập" <noreply@gpamanager.com>',
              to: user.email,
              subject: `[Báo cáo hằng ngày] Cập nhật lịch trình ngày ${tomorrowStr.split('-').reverse().join('/')}`,
              html: htmlBody
            });
            console.log(`[CronService] Đã gửi báo cáo cho ${user.email}`);
          } catch (err) {
            console.error(`[CronService] Lỗi gửi mail cho ${user.email}:`, err);
          }
        } else {
          // Log console mô phỏng (Dành cho Dev chưa config SMTP)
          console.log(`\n\n=== MÔ PHỎNG GỬI EMAIL TỚI: ${user.email} ===`);
          console.log(`Tiêu đề: [Báo cáo hằng ngày] Cập nhật lịch trình ngày ${tomorrowStr.split('-').reverse().join('/')}`);
          console.log(`Nội dung (HTML format): Đã render ${tomorrowEvents.length} Lịch, ${user.notificationSettings.deadlineAlerts ? 'Có' : 'Không'} check Deadline, ${user.notificationSettings.attendanceWarnings ? 'Có' : 'Không'} check Chuyên cần.`);
          console.log(`(Do chưa có thông tin EMAIL_USER và EMAIL_PASS trong .env nên không gửi thật)`);
          console.log(`=========================================\n\n`);
        }
      }
    } catch (err) {
      console.error("[CronService] Lỗi xử lý cronjob:", err);
    }
  });

  console.log("✅ Hệ thống Cron Job đã được khởi động.");
};

module.exports = { initCronJobs };
