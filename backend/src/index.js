import dns from 'dns';
// Use reliable public DNS resolvers to prevent Windows/ISP querySrv/queryTxt ESERVFAIL errors with MongoDB Atlas
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
    // Ignore if not supported in environment
}

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env regardless of where the node command was launched
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

import authRoutes from './routes/auth.route.js';
import connectDB from './lib/db.js';
import cookieParser from 'cookie-parser';
import messageRoutes from './routes/message.route.js';
import groupRoutes from './routes/group.route.js';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { app, server } from './lib/socket.js';

const PORT = process.env.PORT || 5001;

const clientUrls = (process.env.CLIENT_URL || "")
    .split(",")
    .map(url => url.trim().replace(/\/$/, ""))
    .filter(Boolean);

const allowedOrigins = [
    ...clientUrls,
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(helmet({
    crossOriginResourcePolicy: false,
}));

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: "Too many authentication attempts, please try again in 15 minutes" }
});

const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: "Too many messages sent, please slow down" }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/messages', messageLimiter, messageRoutes);
app.use('/api/groups', messageLimiter, groupRoutes);

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    });
}

if (process.env.NODE_ENV !== "test") {
    server.listen(PORT, async () => {
        console.log(`SERVER IS RUNNING ON http://localhost:${PORT}`);
        await connectDB();
    });
}

export { app, server };