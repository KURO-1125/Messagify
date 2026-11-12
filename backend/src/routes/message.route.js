import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    getUsersForSideBar, 
    getMessages, 
    sendMessage, 
    markMessagesAsRead,
    editMessage,
    deleteMessage,
    reactToMessage 
} from "../controllers/message.controller.js";

const router = express.Router()

// Get all users for sidebar
router.get('/users', protectRoute, getUsersForSideBar)

// Get messages for a specific user
router.get('/conversation/:userId', protectRoute, getMessages)

// Send message to a specific user
router.post('/send/:userId', protectRoute, sendMessage)

// Mark messages as read
router.put('/read/:userId', protectRoute, markMessagesAsRead)

// Edit message
router.put('/:messageId', protectRoute, editMessage)

// Delete message
router.delete('/:messageId', protectRoute, deleteMessage)

// React to message with emoji
router.post('/:messageId/react', protectRoute, reactToMessage)

export default router;