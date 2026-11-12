import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);

const clientUrls = (process.env.CLIENT_URL || "")
    .split(",")
    .map(url => url.trim().replace(/\/$/, ""))
    .filter(Boolean);

const allowedOrigins = [
    ...clientUrls,
    "http://localhost:5173",
    "http://localhost:3000"
];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

// Helper to parse cookies from handshake headers
function getCookie(cookieString, name) {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
}

// Map of userId -> Set of socket IDs
const userSocketMap = {};

export function getReceiverSocketIds(userId) {
    if (!userId) return [];
    const socketSet = userSocketMap[userId.toString()];
    return socketSet ? Array.from(socketSet) : [];
}

export function getReceiverSocketId(userId) {
    if (!userId) return null;
    const socketSet = userSocketMap[userId.toString()];
    if (!socketSet || socketSet.size === 0) return null;
    return Array.from(socketSet)[0];
}

// Authentication middleware for Socket.io
io.use((socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        const token = socket.handshake.auth?.token || getCookie(cookieHeader, "jwt");

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.userId) {
                socket.userId = decoded.userId.toString();
                return next();
            }
        }

        // Fallback to query userId if verified handshake or in dev
        const queryUserId = socket.handshake.query?.userId;
        if (queryUserId && queryUserId !== "undefined") {
            socket.userId = queryUserId.toString();
            return next();
        }

        return next(new Error("Authentication failed: No valid token or userId provided"));
    } catch (err) {
        // In case token is expired or malformed
        const queryUserId = socket.handshake.query?.userId;
        if (queryUserId && queryUserId !== "undefined") {
            socket.userId = queryUserId.toString();
            return next();
        }
        return next(new Error("Authentication error: " + err.message));
    }
});

io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log("A user connected:", socket.id, "userId:", userId);

    if (userId) {
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = new Set();
        }
        userSocketMap[userId].add(socket.id);

        // Auto-join group rooms for this user
        try {
            const Group = (await import('../models/group.model.js')).default;
            const groups = await Group.find({ members: userId }).select('_id');
            groups.forEach((g) => {
                socket.join(`group:${g._id}`);
            });
        } catch (e) {
            console.error("Error joining user group rooms:", e);
        }
    }
     
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Group room management
    socket.on("joinGroup", (groupId) => {
        if (groupId) socket.join(`group:${groupId}`);
    });

    socket.on("leaveGroup", (groupId) => {
        if (groupId) socket.leave(`group:${groupId}`);
    });

    // Real-time typing indicators
    socket.on("typing", ({ toUserId }) => {
        if (!toUserId) return;
        const receiverSockets = getReceiverSocketIds(toUserId);
        receiverSockets.forEach((id) => io.to(id).emit("userTyping", { fromUserId: userId }));
    });

    socket.on("stopTyping", ({ toUserId }) => {
        if (!toUserId) return;
        const receiverSockets = getReceiverSocketIds(toUserId);
        receiverSockets.forEach((id) => io.to(id).emit("userStoppedTyping", { fromUserId: userId }));
    });

    // Group typing indicators
    socket.on("groupTyping", ({ groupId, userName }) => {
        if (groupId) socket.to(`group:${groupId}`).emit("groupUserTyping", { groupId, fromUserId: userId, userName });
    });

    socket.on("groupStopTyping", ({ groupId }) => {
        if (groupId) socket.to(`group:${groupId}`).emit("groupUserStoppedTyping", { groupId, fromUserId: userId });
    });

    // Real-time read receipts acknowledgement
    socket.on("markMessagesAsRead", ({ senderId }) => {
        if (!senderId) return;
        const senderSockets = getReceiverSocketIds(senderId);
        senderSockets.forEach((id) => io.to(id).emit("messagesRead", { byUserId: userId }));
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId].delete(socket.id);
            if (userSocketMap[userId].size === 0) {
                delete userSocketMap[userId];
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };