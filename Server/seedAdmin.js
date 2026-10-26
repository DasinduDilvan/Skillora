import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/skillora";

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to database");

const User = (await import("./models/User.js")).default;

const existingAdmin = await User.findOne({ role: "admin" });
if (existingAdmin) {
  console.log("⚠️  Admin already exists:", existingAdmin.email);
  process.exit(0);
}

const admin = new User({
  firstName: "Dasindu",
  lastName: "Dilvan",
  username: "skillora_admin",
  email: "admin@skillora.com",
  password: "Admin@123",
  profileImage: "https://raw.githubusercontent.com/Ektazept/.github/main/profile/assets/dilvan.png",
  phone: "",
  role: "admin",
  location: "",
  bio: "",
  isEmailVerified: true,
  isActive: true,
  isBlocked: false,
});

await admin.save();

console.log("✅ Admin created successfully!");
console.log("   UserId:", admin.userId);
console.log("   Email:", admin.email);
console.log("   Username:", admin.username);
console.log("   Password: Admin@123");

await mongoose.disconnect();
console.log("✅ Disconnected");
process.exit(0);