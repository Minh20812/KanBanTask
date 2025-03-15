import User from "../models/UserModel.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import bcrypt from "bcryptjs";
import createToken from "../utils/createToken.js";
import axios from "axios";
import { oauth2Client } from "../utils/googleClient.js";

const createUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    throw new Error("Please provide all the required fields");
  }

  const userExists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (userExists) {
    res.status(400);
    throw new Error(
      userExists.email === email.toLowerCase()
        ? "Email already registered"
        : "Username already taken"
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const newUser = new User({ username, email, password: hashedPassword });

  try {
    await newUser.save();
    createToken(res, newUser._id);

    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
    });
  } catch (err) {
    res.status(400).send(err);
    throw new Error(err);
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    createToken(res, existingUser._id);
    res.status(200).json({
      _id: existingUser._id,
      username: existingUser.username,
      email: existingUser.email,
      isAdmin: existingUser.isAdmin,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

const loginGoogleUser = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  try {
    // Check if the user already exists
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // If user doesn't exist, create a new user
      user = await User.create({
        username: email.split("@")[0],
        email,
        isGoogleUser: true,
      });
      isNewUser = true;
    }

    // Generate token
    createToken(res, user._id);

    // Send response
    res.status(isNewUser ? 201 : 200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Server error during Google login: " + error.message);
  }
});

// const loginGoogleUser = asyncHandler(async (req, res) => {
//   const code = req.query.code;

//   try {
//     const googleRes = await oauth2Client.getToken(code);
//     oauth2Client.setCredentials(googleRes.tokens);
//     const userRes = await axios.get(
//       `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
//     );
//     const { email, name, picture } = userRes.data;

//     // Kiểm tra email đã được xác minh
//     if (!userRes.data.verified_email) {
//       return res.status(400).json({ message: "Email chưa được xác minh" });
//     }

//     let user = await User.findOne({ email });
//     const username = name || email.split("@")[0]; // Tạo username từ name hoặc email

//     if (!user) {
//       user = await User.create({
//         username,
//         email,
//         image: picture,
//         isGoogleUser: true,
//       });
//     }

//     // Tạo token
//     const token = createToken(res, user._id);

//     res.status(200).json({
//       message: "success",
//       token,
//       user: {
//         _id: user._id,
//         username: user.username,
//         email: user.email,
//         image: user.image,
//       },
//     });
//   } catch (err) {
//     console.error("Google login error:", err);
//     res.status(500).json({
//       message: "Internal Server Error",
//       error: process.env.NODE_ENV === "development" ? err.message : undefined,
//     });
//   }
// });

const logoutCurrentUser = asyncHandler(async (req, res) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      user.password = hashedPassword;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const deleteUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.isAdmin) {
      res.status(400);
      throw new Error("You can't delete an admin");
    }

    await User.deleteOne({ _id: user._id });
    res.json({ message: "User deleted successfully" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const updateUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.isAdmin = Boolean(req.body.isAdmin);

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const searchUser = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email parameter is required" });
  }

  try {
    const users = await User.find({
      email: { $regex: email, $options: "i" },
    }).select("-password");

    res.json(users);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      message: "Server error during search",
      error: error.message,
    });
  }
});

export {
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
};
