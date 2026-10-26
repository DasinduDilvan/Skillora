import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["freelancer", "client", "admin"],
      required: true,
    },
    location: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ FIXED: Auto-increment userId safely by finding the highest existing ID
userSchema.pre("save", async function () {
  if (!this.userId) {
    const lastUser = await mongoose
      .model("User")
      .findOne({}, { userId: 1 })
      .sort({ userId: -1 }); // Gets the highest userId (e.g. USR00002)

    let nextNumber = 1;
    if (lastUser && lastUser.userId) {
      const match = lastUser.userId.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    this.userId = `USR${String(nextNumber).padStart(5, "0")}`;
  }

  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);