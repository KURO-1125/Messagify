import dns from 'dns';
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded if db.js is imported directly
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
    dotenv.config();
}

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("❌ MONGODB_URI is not defined in backend/.env");
            return;
        }

        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout faster instead of hanging indefinitely
        });
        console.log(`✅ MongoDB Connected successfully: ${connection.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        if (error.message.includes("ENOTFOUND")) {
            console.error("💡 Cause: The MongoDB cluster domain does not exist or was paused/deleted by MongoDB Atlas due to inactivity.");
            console.error("👉 Please log into https://cloud.mongodb.com to resume/recreate your cluster and update backend/.env.");
        }
    }
};

export default connectDB; 