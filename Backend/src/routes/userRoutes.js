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
    if (!req.user) {
      return res.status(401).json({ error: "Login failed" });
    }

    // Gửi JSON thay vì redirect
    res.json({
      userInfo: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    });
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
