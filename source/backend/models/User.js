const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [6, "Mật khẩu phải từ 6 ký tự trở lên"],
      default: null, // Không bắt buộc nếu dùng Google OAuth
    },
    name: {
      type: String,
      required: [true, "Họ và tên là bắt buộc"],
      trim: true,
    },
    avatar: { type: String, default: "" }, // Lưu URL avatar (Google hoac S3)
    googleId: { type: String, unique: true, sparse: true }, // Google OAuth ID
    googleAvatar: { type: String, default: "" }, // Avatar từ Google
    mssv: { type: String, default: "" },
    major: { type: String, default: "" },
    class: { type: String, default: "" },
    university: { type: String, default: "" },
    program: { type: String, default: "" },
    currentSemester: { type: String, default: "Kỳ 2 - Năm học 3" },
    status: {
      type: String,
      enum: ["Đang học", "Bảo lưu", "Đã tốt nghiệp"],
      default: "Đang học",
    },
    targetGpa: { type: Number, default: 14.0 },
    gradingScale: {
      type: String,
      enum: ['scale20', 'scale4'],
      default: 'scale20',
    },
    onboardingCompleted: { type: Boolean, default: false },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },
    refreshTokens: [String],
    gradeCustomization: {
      year1: {
        color: String,
        imageUrl: String,
        slogan: String,
        subQuote: String,
        sticker: String,
      },
      year2: {
        color: String,
        imageUrl: String,
        slogan: String,
        subQuote: String,
        sticker: String,
      },
      year3: {
        color: String,
        imageUrl: String,
        slogan: String,
        subQuote: String,
        sticker: String,
      },
      year4: {
        color: String,
        imageUrl: String,
        slogan: String,
        subQuote: String,
        sticker: String,
      },
    },
    goals: {
      year1: [{
        id: { type: Number, required: true },
        text: { type: String, trim: true, default: '' },
        done: { type: Boolean, default: false },
      }],
      year2: [{
        id: { type: Number, required: true },
        text: { type: String, trim: true, default: '' },
        done: { type: Boolean, default: false },
      }],
      year3: [{
        id: { type: Number, required: true },
        text: { type: String, trim: true, default: '' },
        done: { type: Boolean, default: false },
      }],
      year4: [{
        id: { type: Number, required: true },
        text: { type: String, trim: true, default: '' },
        done: { type: Boolean, default: false },
      }],
    },
    achievements: {
      year1: [{ type: String, trim: true }],
      year2: [{ type: String, trim: true }],
      year3: [{ type: String, trim: true }],
      year4: [{ type: String, trim: true }],
    },
    creditProgress: {
      generalCredits: { type: Number, default: 30 },
      generalRequired: { type: Number, default: 40 },
      baseCredits: { type: Number, default: 40 },
      baseRequired: { type: Number, default: 60 },
      majorCredits: { type: Number, default: 17 },
      majorRequired: { type: Number, default: 55 },
    },
    // Tổng tín chỉ tích luỹ (tính riêng để FE dễ dùng)
    completedCredits: { type: Number, default: 0 },
    totalRequiredCredits: { type: Number, default: 155 },
    customColors: {
      type: Map,
      of: String,
      default: {},
    },
    notificationSettings: {
      emailAlerts: { type: Boolean, default: true },
      alertTime: { type: String, default: "20:00" }, // Giờ gửi email (HH:mm)
      deadlineAlerts: { type: Boolean, default: true },
      attendanceWarnings: { type: Boolean, default: true }
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
