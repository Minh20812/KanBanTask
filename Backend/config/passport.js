import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../src/models/UserModel.js";
import createToken from "../src/utils/createToken.js";

export const configureGoogleStrategy = () => {
  // Serialize và deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Cấu hình Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/users/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Kiểm tra xem user đã tồn tại chưa
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Kiểm tra xem email đã được sử dụng chưa
            const existingEmail = await User.findOne({
              email: profile.emails[0].value,
            });

            if (existingEmail) {
              // Nếu email đã tồn tại, cập nhật googleId cho user này
              existingEmail.googleId = profile.id;
              existingEmail.image = profile.photos[0].value;
              await existingEmail.save();
              return done(null, existingEmail);
            }

            // Tạo user mới nếu chưa tồn tại
            user = new User({
              googleId: profile.id,
              username: profile.displayName.replace(/\s+/g, "").toLowerCase(),
              email: profile.emails[0].value,
              password: "google-auth-" + Math.random().toString(36).slice(-8),
              image: profile.photos[0].value,
            });

            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};
