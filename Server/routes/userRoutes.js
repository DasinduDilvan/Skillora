import express from "express";
import userController from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

// Public routes
router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);
router.post("/verify-identity", userController.verifyIdentity);   // ← ADD THIS
router.post("/reset-password", userController.resetPassword);     // ← ADD THIS

// Protected routes
router.get("/me", auth, userController.getMe);

// Admin routes
router.get("/", auth, roleCheck("admin"), userController.getAllUsers);
router.get("/:userId", auth, userController.getUserById);
router.post("/", auth, roleCheck("admin"), userController.createUser);
router.put("/:userId", auth, userController.updateUser);
router.delete("/:userId", auth, roleCheck("admin"), userController.deleteUser);

export default router;