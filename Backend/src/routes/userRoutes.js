import express from "express";
import {
  createUser,
  loginUser,
  loginGoogleUser,
  logoutCurrentUser,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  deleteUserById,
  getUserById,
  updateUserById,
  searchUser,
} from "../controllers/userController.js";
import passport from "passport";
import createToken from "../utils/createToken.js";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleWare.js";

const router = express.Router();

router.route("/register").post(createUser);
router.post("/login", loginUser);
router.post("/login-google", loginGoogleUser);
router.post("/logout", logoutCurrentUser);
router
  .route("/profile")
  .get(authenticate, getCurrentUserProfile)
  .put(authenticate, updateCurrentUserProfile);
router.route("/search").get(authenticate, searchUser);

// Route để bắt đầu quá trình xác thực Google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route callback sau khi Google xác thực
// Route callback sau khi Google xác thực
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Tạo JWT sau khi xác thực thành công
    createToken(res, req.user._id);

    // Tạo URL với thông tin người dùng để frontend có thể lưu vào Redux
    const frontendURL =
      process.env.FRONTEND_URL || "https://kanbantask.vercel.app";
    // const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";

    // Chuyển thông tin người dùng dưới dạng query parameter
    // Lưu ý: Trong thực tế, bạn có thể muốn hạn chế thông tin được truyền qua URL
    const userInfo = encodeURIComponent(
      JSON.stringify({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        // Thêm các thông tin cần thiết khác
      })
    );

    // Redirect đến trang frontend với thông tin người dùng
    res.redirect(`${frontendURL}/auth/success?userInfo=${userInfo}`);
  }
);
// Route for admin to manage users

router
  .route("/:id")
  .delete(authenticate, authorizeAdmin, deleteUserById)
  .get(authenticate, authorizeAdmin, getUserById)
  .put(authenticate, authorizeAdmin, updateUserById);

export default router;

// Middleware để kiểm tra xác thực
export const checkAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};
