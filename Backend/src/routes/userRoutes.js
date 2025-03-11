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

// Route for admin to manage users

router
  .route("/:id")
  .delete(authenticate, authorizeAdmin, deleteUserById)
  .get(authenticate, authorizeAdmin, getUserById)
  .put(authenticate, authorizeAdmin, updateUserById);
export default router;
