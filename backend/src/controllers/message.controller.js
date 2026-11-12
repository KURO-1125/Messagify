import cloudinary from '../lib/cloudinary.js';
import { getReceiverSocketIds, io } from '../lib/socket.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';

export const getUsersForSideBar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password").lean();

        // Enrich each user with unreadCount and lastMessage
        const enrichedUsers = await Promise.all(
            users.map(async (user) => {
                const unreadCount = await Message.countDocuments({
                    senderId: user._id,
                    receiverId: loggedInUserId,
                    isRead: false
                });

                const lastMessage = await Message.findOne({
                    $or: [
                        { senderId: loggedInUserId, receiverId: user._id },
                        { senderId: user._id, receiverId: loggedInUserId }
                    ]
                }).sort({ createdAt: -1 });

                return {
                    ...user,
                    unreadCount,
                    lastMessage: lastMessage
                        ? {
                              text: lastMessage.text,
                              image: lastMessage.image,
                              createdAt: lastMessage.createdAt,
                              isRead: lastMessage.isRead,
                              senderId: lastMessage.senderId
                          }
                        : null
                };
            })
        );

        // Sort: users with most recent messages first, then alphabetical by userName
        enrichedUsers.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return a.userName.localeCompare(b.userName);
        });

        res.status(200).json(enrichedUsers);
    } catch (error) {
        console.log("Error in getUsersForSideBarController: ", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const userToChatId = req.params.userId || req.params.id;
        const myId = req.user._id;

        if (!userToChatId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // Mark incoming unread messages as read
        const unreadCount = await Message.countDocuments({
            senderId: userToChatId,
            receiverId: myId,
            isRead: false
        });

        if (unreadCount > 0) {
            await Message.updateMany(
                { senderId: userToChatId, receiverId: myId, isRead: false },
                { $set: { isRead: true, readAt: new Date() } }
            );

            // Notify sender's sockets that their messages are now read
            const senderSocketIds = getReceiverSocketIds(userToChatId);
            senderSocketIds.forEach((socketId) => {
                io.to(socketId).emit("messagesRead", { byUserId: myId.toString() });
            });
        }

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessagesController: ", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const markMessagesAsRead = async (req, res) => {
    try {
        const senderId = req.params.userId || req.params.id;
        const myId = req.user._id;

        if (!senderId) {
            return res.status(400).json({ success: false, message: "Sender ID is required" });
        }

        await Message.updateMany(
            { senderId, receiverId: myId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        const senderSocketIds = getReceiverSocketIds(senderId);
        senderSocketIds.forEach((socketId) => {
            io.to(socketId).emit("messagesRead", { byUserId: myId.toString() });
        });

        res.status(200).json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        console.log("Error in markMessagesAsReadController: ", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image, audio, audioDuration } = req.body;
        const receiverId = req.params.userId || req.params.id;
        const senderId = req.user._id;

        if (!receiverId) {
            return res.status(400).json({ success: false, message: "Receiver ID is required" });
        }

        if (receiverId.toString() === senderId.toString()) {
            return res.status(400).json({ success: false, message: "You cannot message yourself" });
        }

        const trimmedText = text ? text.trim() : "";
        if (!trimmedText && !image && !audio) {
            return res.status(400).json({ success: false, message: "Message must contain text, an image, or audio" });
        }

        let imageURL = null;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageURL = uploadResponse.secure_url;
        }

        let audioURL = null;
        if (audio) {
            const uploadAudioResponse = await cloudinary.uploader.upload(audio, { resource_type: "video" });
            audioURL = uploadAudioResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text: trimmedText,
            image: imageURL,
            audio: audioURL,
            audioDuration: audioDuration || 0,
            isRead: false
        });

        await newMessage.save();

        // Broadcast to all receiver's open sockets
        const receiverSocketIds = getReceiverSocketIds(receiverId);
        receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("newMessage", newMessage);
        });

        // Broadcast to sender's other open tabs/devices
        const senderSocketIds = getReceiverSocketIds(senderId.toString());
        senderSocketIds.forEach((socketId) => {
            io.to(socketId).emit("messageSent", newMessage);
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessageController: ", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: "Edited message text cannot be empty" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized to edit this message" });
        }

        if (message.isDeleted) {
            return res.status(400).json({ success: false, message: "Cannot edit a deleted message" });
        }

        message.text = text.trim();
        message.isEdited = true;
        await message.save();

        const payload = {
            messageId: message._id,
            text: message.text,
            isEdited: true
        };

        if (message.groupId) {
            io.to(`group:${message.groupId}`).emit("messageEdited", payload);
        } else {
            const receiverSocketIds = getReceiverSocketIds(message.receiverId);
            receiverSocketIds.forEach((sId) => io.to(sId).emit("messageEdited", payload));
            const senderSocketIds = getReceiverSocketIds(message.senderId);
            senderSocketIds.forEach((sId) => io.to(sId).emit("messageEdited", payload));
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in editMessageController:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this message" });
        }

        message.isDeleted = true;
        message.text = "This message was deleted";
        message.image = null;
        message.audio = null;
        await message.save();

        const payload = {
            messageId: message._id,
            isDeleted: true,
            text: message.text
        };

        if (message.groupId) {
            io.to(`group:${message.groupId}`).emit("messageDeleted", payload);
        } else {
            const receiverSocketIds = getReceiverSocketIds(message.receiverId);
            receiverSocketIds.forEach((sId) => io.to(sId).emit("messageDeleted", payload));
            const senderSocketIds = getReceiverSocketIds(message.senderId);
            senderSocketIds.forEach((sId) => io.to(sId).emit("messageDeleted", payload));
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in deleteMessageController:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const reactToMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        if (!emoji) {
            return res.status(400).json({ success: false, message: "Emoji is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Toggle off
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Remove any other reaction from this user and add the new one
            message.reactions = message.reactions.filter((r) => r.userId.toString() !== userId.toString());
            message.reactions.push({ userId, emoji });
        }

        await message.save();

        const payload = {
            messageId: message._id,
            reactions: message.reactions
        };

        if (message.groupId) {
            io.to(`group:${message.groupId}`).emit("messageReaction", payload);
        } else {
            const receiverSocketIds = getReceiverSocketIds(message.receiverId);
            receiverSocketIds.forEach((sId) => io.to(sId).emit("messageReaction", payload));
            const senderSocketIds = getReceiverSocketIds(message.senderId);
            senderSocketIds.forEach((sId) => io.to(sId).emit("messageReaction", payload));
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in reactToMessageController:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};