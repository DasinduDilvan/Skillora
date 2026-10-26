import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Freelancer from "../models/Freelancer.js";
import Client from "../models/Client.js";
import generateToken from "../utils/generateToken.js";

// Sign up user
const signUpUser = async (userData) => {
  // Check if email or username already exists
  const existingUser = await User.findOne({
    $or: [{ email: userData.email }, { username: userData.username }],
  });

  if (existingUser) {
    if (existingUser.email === userData.email) {
      throw new Error("Email already registered");
    }
    throw new Error("Username already taken");
  }

  // Create user
  const user = await User.create(userData);

  // Create freelancer or client profile based on role
  if (user.role === "freelancer") {
    await Freelancer.create({
      userId: user.userId,
      bio: user.bio || "",
      profileImage: user.profileImage || "",
      location: user.location || "",
    });
  } else if (user.role === "client") {
    await Client.create({
      userId: user.userId,
      bio: user.bio || "",
      location: user.location || "",
    });
  }

  // Generate token
  const token = generateToken(user.userId, user.role);

  return {
    user: {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
    token,
  };
};

// Sign in user
const signInUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.isBlocked) {
    throw new Error("Your account has been blocked");
  }

  if (!user.isActive) {
    throw new Error("Your account is deactivated");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user.userId, user.role);

  return {
    user: {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
    token,
  };
};

// Get all users
const getAllUsers = async (query = {}) => {
  const filter = {};

  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
  if (query.isBlocked !== undefined)
    filter.isBlocked = query.isBlocked === "true";
  if (query.search) {
    filter.$or = [
      { firstName: { $regex: query.search, $options: "i" } },
      { lastName: { $regex: query.search, $options: "i" } },
      { username: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }

  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  return users;
};

// Get user by userId
const getUserById = async (userId) => {
  const user = await User.findOne({ userId }).select("-password");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

// Update user
const updateUser = async (userId, updateData) => {
  // Don't allow direct password update through this method without hashing
  if (updateData.password) {
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }

  const user = await User.findOneAndUpdate({ userId }, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Delete user
const deleteUser = async (userId) => {
  const user = await User.findOneAndDelete({ userId });
  if (!user) {
    throw new Error("User not found");
  }

  // Also delete associated freelancer or client profile
  if (user.role === "freelancer") {
    await Freelancer.findOneAndDelete({ userId });
  } else if (user.role === "client") {
    await Client.findOneAndDelete({ userId });
  }

  return user;
};

// Verify user identity by email + username
const verifyUserIdentity = async (email, username) => {
  const user = await User.findOne({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
  });

  if (!user) {
    throw new Error("No account found with that email and username");
  }

  return {
    verified: true,
    userId: user.userId || user._id,
  };
};

// Reset user password by email + username
const resetUserPassword = async (email, username, newPassword) => {
  const user = await User.findOne({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
  });

  if (!user) {
    throw new Error("No account found with that email and username");
  }

  // Hash password the same way your signUpUser does it
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

  return { message: "Password has been reset" };
};

export default {
  signUpUser,
  signInUser,
  getAllUsers,
  verifyUserIdentity,    // ← NEW
  resetUserPassword,     // ← NEW
  getUserById,
  updateUser,
  deleteUser,
};