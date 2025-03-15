import jwt from "jsonwebtoken";

const createToken = (res, userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Giảm thời gian xuống còn 7 ngày hoặc phù hợp với yêu cầu bảo mật
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Thời gian sống của cookie phải khớp với thời gian hết hạn token
  });

  return token;
};

export default createToken;
