import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSideBar, getMessages, sendMessage } from "../controllers/message.controller.js";

const router = express.Router()

router.get('/users', protectRoute, getUsersForSideBar)
router.get('/:userId', protectRoute, getMessages)

router.post('/send/:userId', protectRoute, sendMessage)

export default router;