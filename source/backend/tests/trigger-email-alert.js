const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Attendance = require('../models/Attendance');

// Hàm format ngày YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

async function testEmailAlert() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gpa_management';
  console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Tìm hoặc tạo user mẫu để gửi email thật (nghiemquocanh1507@gmail.com)
    const testEmail = 'nghiemquocanh1507@gmail.com';
    let user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log('Creating a temporary test user...');
      user = await User.create({
        name: 'Quốc Anh Nghiêm',
        email: testEmail,
        password: 'password123',
        notificationSettings: {
          emailAlerts: true,
          deadlineAlerts: true,
          attendanceWarnings: true,
          alertTime: '08:00'
        }
      });
    } else {
      // Đảm bảo bật thông báo
      user.notificationSettings = {
        emailAlerts: true,
        deadlineAlerts: true,
        attendanceWarnings: true,
        alertTime: '08:00'
      };
      await user.save();
    }
    console.log(`Using user: ${user.name} (${user.email})`);

    // Tính toán ngày mai
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = formatDate(tomorrowDate);

    // Tính toán hạn chót (trong vòng 3 ngày tới)
    const in2DaysDate = new Date();
    in2DaysDate.setDate(in2DaysDate.getDate() + 2);
    const in2DaysStr = formatDate(in2DaysDate);
    const todayStr = formatDate(new Date());

    console.log(`Today: ${todayStr}, Tomorrow: ${tomorrowStr}, In 2 days: ${in2DaysStr}`);

    // 2. Tạo dữ liệu lịch học mẫu cho ngày mai (class, exam, deadline)
    console.log('Creating test schedules for tomorrow...');
    const testSchedules = await Schedule.insertMany([
      {
        userId: user._id,
        name: 'Môn Toán Giải Tích 1',
        type: 'class',
        startTime: '08:00',
        endTime: '10:00',
        room: 'Phòng A101',
        instructor: 'TS. Nguyễn Văn Toàn',
        specificDate: tomorrowStr
      },
      {
        userId: user._id,
        name: 'Thi Giữa Kỳ Cấu Trúc Dữ Liệu',
        type: 'exam',
        startTime: '13:30',
        endTime: '15:00',
        room: 'Hội trường B',
        instructor: 'SBD: 095, Giám thị: Cô Hoa',
        specificDate: tomorrowStr
      },
      {
        userId: user._id,
        name: 'Nộp báo cáo Nhóm Phát triển Web',
        type: 'deadline',
        startTime: '23:59',
        endTime: '00:29',
        room: '',
        instructor: 'Nộp link GitHub của Project lên hệ thống LMS.',
        specificDate: tomorrowStr,
        isCompleted: false
      },
      // Một deadline nữa cho 2 ngày sau (để check tính năng alert deadline trong 3 ngày)
      {
        userId: user._id,
        name: 'Bài tập Tiếng Anh giao tiếp',
        type: 'deadline',
        startTime: '22:00',
        endTime: '22:30',
        room: '',
        instructor: 'Làm bài trắc nghiệm Unit 5.',
        specificDate: in2DaysStr,
        isCompleted: false
      }
    ]);
    console.log(`Created ${testSchedules.length} schedules.`);

    // 3. Tạo dữ liệu chuyên cần mẫu (cảnh báo nghỉ học nhiều)
    console.log('Creating test attendances with warning thresholds...');
    const testAttendance = await Attendance.create({
      userId: user._id,
      subjectName: 'Môn Hệ Quản Trị CSDL',
      totalSessions: 15,
      maxAbsencesAllowed: 3,
      absentDates: [formatDate(new Date(Date.now() - 86400000 * 5)), formatDate(new Date(Date.now() - 86400000 * 10))] // nghỉ 2 buổi
    });

    // 4. CHẠY THỬ LOGIC EMAIL
    console.log('\n--- BẮT ĐẦU CHẠY THỬ LOGIC EMAIL ---');

    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaebee; border-radius: 12px; background-color: #ffffff; color: #334155;">
        <h2 style="color: #2563eb; text-align: center; margin-bottom: 25px;">Báo cáo Trợ lý Học tập Hằng ngày</h2>
        <p>Chào <b>${user.name}</b>,</p>
        <p>Dưới đây là tổng hợp lịch trình và các cảnh báo quan trọng dành cho bạn vào ngày mai:</p>
        <hr style="border: none; border-top: 1px solid #eaebee; margin: 20px 0;"/>
    `;

    let hasContent = false;

    // A. Lịch trình ngày mai
    const tomorrowEvents = await Schedule.find({
      userId: user._id,
      specificDate: tomorrowStr
    }).sort({ startTime: 1 });

    if (tomorrowEvents.length > 0) {
      hasContent = true;
      htmlBody += `<h3 style="color: #1e40af; border-left: 4px solid #2563eb; padding-left: 10px; margin-top: 20px;">📅 Lịch trình ngày mai (${tomorrowStr.split('-').reverse().join('/')})</h3><ul style="padding-left: 20px;">`;
      tomorrowEvents.forEach(ev => {
        const evType = ev.type === 'class' ? '🏫 Lớp học' : ev.type === 'exam' ? '📝 Lịch thi' : '⏳ Deadline';
        htmlBody += `<li style="margin-bottom: 12px; line-height: 1.5;">
          <b>${evType}: ${ev.name}</b> <br/> 
          <span style="color: #64748b; font-size: 13px;">⏰ ${ev.startTime} ${ev.type !== 'deadline' ? '- ' + ev.endTime : ''} ${ev.room ? '| 📍 ' + ev.room : ''}</span>
        </li>`;
      });
      htmlBody += `</ul>`;
    } else {
      htmlBody += `<p style="color: #64748b; font-style: italic;">📅 Ngày mai bạn không có sự kiện nào. Hãy dành thời gian nghỉ ngơi nhé!</p>`;
    }

    // B. Deadline tới hạn trong vòng 3 ngày tới
    if (user.notificationSettings.deadlineAlerts) {
      const in3DaysDate = new Date();
      in3DaysDate.setDate(in3DaysDate.getDate() + 3);
      const in3DaysStr = formatDate(in3DaysDate);

      const deadlines = await Schedule.find({
        userId: user._id,
        type: 'deadline',
        isCompleted: false,
        specificDate: { $gte: todayStr, $lte: in3DaysStr }
      }).sort({ specificDate: 1 });

      if (deadlines.length > 0) {
        hasContent = true;
        htmlBody += `<h3 style="color: #b45309; border-left: 4px solid #d97706; padding-left: 10px; margin-top: 25px;">🔥 Các Deadline cần hoàn thành gấp (3 ngày tới)</h3><ul style="padding-left: 20px; color: #92400e;">`;
        deadlines.forEach(ev => {
          const dlDateStr = ev.specificDate.split('-').reverse().join('/');
          htmlBody += `<li style="margin-bottom: 8px;"><b>${ev.name}</b> - Hạn chót: ${dlDateStr} lúc ${ev.startTime}</li>`;
        });
        htmlBody += `</ul>`;
      }
    }

    // C. Cảnh báo chuyên cần
    if (user.notificationSettings.attendanceWarnings) {
      const attendances = await Attendance.find({ userId: user._id });
      const warnings = attendances.filter(att => {
        if (!att.maxAbsencesAllowed || att.maxAbsencesAllowed === 0) return false;
        return (att.absentDates.length / att.maxAbsencesAllowed) >= 0.7;
      });

      if (warnings.length > 0) {
        hasContent = true;
        htmlBody += `<h3 style="color: #be123c; border-left: 4px solid #e11d48; padding-left: 10px; margin-top: 25px;">⚠️ Cảnh báo Chuyên cần (Nguy cơ cấm thi)</h3><ul style="padding-left: 20px; color: #9f1239;">`;
        warnings.forEach(att => {
          const abs = att.absentDates.length;
          const max = att.maxAbsencesAllowed;
          htmlBody += `<li style="margin-bottom: 8px;">Môn <b>${att.subjectName}</b>: Đã vắng <b>${abs}/${max}</b> buổi. Hãy chú ý không được nghỉ thêm!</li>`;
        });
        htmlBody += `</ul>`;
      }
    }

    htmlBody += `
        <hr style="border: none; border-top: 1px solid #eaebee; margin: 25px 0;"/>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email gửi tự động từ hệ thống quản lý học tập.<br/>Để thay đổi giờ nhận thông báo, vui lòng truy cập Cài đặt hệ thống.</p>
      </div>
    `;

    console.log('Sending real email...');
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const info = await transporter.sendMail({
        from: '"Trợ lý Học tập" <noreply@gpamanager.com>',
        to: user.email,
        subject: `[Báo cáo hằng ngày] Cập nhật lịch trình ngày ${tomorrowStr.split('-').reverse().join('/')}`,
        html: htmlBody
      });
      console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
    } else {
      console.log('❌ Error: EMAIL_USER or EMAIL_PASS variables are missing in .env');
    }

    // 5. DỌN DẸP DỮ LIỆU SAU KHI TEST
    console.log('Cleaning up test data from database...');
    await Schedule.deleteMany({ userId: user._id });
    await Attendance.deleteMany({ userId: user._id });
    console.log('✅ Clean up completed.');

  } catch (err) {
    console.error('❌ Error during testing:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

testEmailAlert();
