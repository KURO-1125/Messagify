import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSideBar, getMessages, sendMessage } from "../controllers/message.controller.js";

const router = express.Router()

// Get all users for sidebar
router.get('/users', protectRoute, getUsersForSideBar)

// Get messages for a specific user
router.get('/conversation/:userId', protectRoute, getMessages)

// Send message to a specific user
router.post('/send/:userId', protectRoute, sendMessage)

export default router;