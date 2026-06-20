const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const { isGoogleOAuthEnabled } = require("./env");

const isGoogleAuthConfigured = Boolean(
  isGoogleOAuthEnabled() &&
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL,
);

if (isGoogleAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Kiểm tra user đã tồn tại hay chưa
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // User đã tồn tại, trả về
            return done(null, user);
          }

          // Kiểm tra nếu email đã tồn tại (user cũ muốn liên kết Google)
          let existingUser = await User.findOne({
            email: profile.emails[0].value,
          });

          if (existingUser) {
            // Liên kết Google với tài khoản cũ
            existingUser.googleId = profile.id;
            existingUser.googleAvatar = profile.photos[0]?.value || "";
            await existingUser.save();
            return done(null, existingUser);
          }

          // Tạo user mới
          const newUser = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            googleAvatar: profile.photos[0]?.value || "",
            avatar: profile.photos[0]?.value || "", // Sử dụng Google avatar ban đầu
          });

          await newUser.save();
          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
} else {
  if (process.env.NODE_ENV !== 'test') {
    console.warn("⚠️ Bỏ qua khởi tạo Google OAuth vì thiếu biến môi trường");
  }
}

module.exports = passport;
module.exports.isGoogleAuthConfigured = isGoogleAuthConfigured;
