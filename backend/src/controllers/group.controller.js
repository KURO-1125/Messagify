import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketIds } from "../lib/socket.js";

export const createGroup = async (req, res) => {
    try {
        const { name, description, memberIds, groupPic } = req.body;
        const adminId = req.user._id;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Group name is required" });
        }

        // Include admin in members list uniquely
        const membersSet = new Set([adminId.toString(), ...(memberIds || []).map(String)]);
        const members = Array.from(membersSet);

        if (members.length < 2) {
            return res.status(400).json({ success: false, message: "A group must have at least 2 members" });
        }

        let groupPicUrl = "";
        if (groupPic) {
            const uploadRes = await cloudinary.uploader.upload(groupPic);
            groupPicUrl = uploadRes.secure_url;
        }

        const newGroup = new Group({
            name: name.trim(),
            description: description ? description.trim() : "",
            groupPic: groupPicUrl,
            admin: adminId,
            members,
        });

        await newGroup.save();
        const populatedGroup = await Group.findById(newGroup._id)
            .populate("admin", "userName email profilePic")
            .populate("members", "userName email profilePic");

        // Join online members to socket room and notify them
        members.forEach((memberId) => {
            const socketIds = getReceiverSocketIds(memberId);
            socketIds.forEach((socketId) => {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`group:${newGroup._id}`);
                }
                io.to(socketId).emit("newGroupCreated", populatedGroup);
            });
        });

        res.status(201).json(populatedGroup);
    } catch (error) {
        console.error("Error in createGroup controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await Group.find({ members: userId })
            .populate("admin", "userName email profilePic")
            .populate("members", "userName email profilePic")
            .lean();

        // Enrich groups with lastMessage
        const enrichedGroups = await Promise.all(
            groups.map(async (group) => {
                const lastMessage = await Message.findOne({ groupId: group._id })
                    .populate("senderId", "userName profilePic")
                    .sort({ createdAt: -1 });

                return {
                    ...group,
                    lastMessage: lastMessage
                        ? {
                              text: lastMessage.text,
                              image: lastMessage.image,
                              audio: lastMessage.audio,
                              createdAt: lastMessage.createdAt,
                              sender: lastMessage.senderId,
                          }
                        : null,
                };
            })
        );

        // Sort by recent message activity
        enrichedGroups.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
            return timeB - timeA;
        });

        res.status(200).json(enrichedGroups);
    } catch (error) {
        console.error("Error in getGroups controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        const isMember = group.members.some((m) => m.toString() === userId.toString());
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You are not a member of this group" });
        }

        const messages = await Message.find({ groupId })
            .populate("senderId", "userName profilePic")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getGroupMessages controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { text, image, audio, audioDuration } = req.body;
        const senderId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        const isMember = group.members.some((m) => m.toString() === senderId.toString());
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You are not a member of this group" });
        }

        const trimmedText = text ? text.trim() : "";
        if (!trimmedText && !image && !audio) {
            return res.status(400).json({ success: false, message: "Message cannot be empty" });
        }

        let imageUrl = null;
        if (image) {
            const uploadRes = await cloudinary.uploader.upload(image);
            imageUrl = uploadRes.secure_url;
        }

        let audioUrl = null;
        if (audio) {
            const uploadAudioRes = await cloudinary.uploader.upload(audio, { resource_type: "video" });
            audioUrl = uploadAudioRes.secure_url;
        }

        const newMessage = new Message({
            senderId,
            groupId,
            text: trimmedText,
            image: imageUrl,
            audio: audioUrl,
            audioDuration: audioDuration || 0,
        });

        await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "userName profilePic");

        // Broadcast to the group room via Socket.IO
        io.to(`group:${groupId}`).emit("newGroupMessage", populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error in sendGroupMessage controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

