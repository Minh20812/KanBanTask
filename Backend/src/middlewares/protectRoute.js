import jwt from "jsonwebtoken";
import asyncHandler from "./asyncHandler.js";
import User from "../models/UserModel.js";

// Middleware bảo vệ routes - Kiểm tra xác thực người dùng
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Đọc JWT từ cookie
  token = req.cookies.jwt;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy thông tin user từ token (trừ password)
    req.user = await User.findById(decoded.userId).select("-password");

    if (!req.user) {
      res.status(401);
      throw new Error("User not found");
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});

// Middleware kiểm tra quyền Admin
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as admin");
  }
});

export { protect, admin };
