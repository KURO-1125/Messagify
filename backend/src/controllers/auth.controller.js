import cloudinary from '../lib/cloudinary.js';
import generateToken from '../lib/utils.js';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';

export const signup = async (req, res) => {
    const { userName, email, password } = req.body;
    try {
        if (!userName || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const trimmedUserName = userName.trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            userName: trimmedUserName,
            email: normalizedEmail,
            password: hashedPassword,
        });

        await newUser.save();
        generateToken(newUser._id, res);

        const userResponse = {
            _id: newUser._id,
            userName: newUser.userName,
            email: newUser.email,
            profilePic: newUser.profilePic,
            createdAt: newUser.createdAt,
        };

        res.status(201).json(userResponse);
    } catch (error) {
        console.log("Error in Signup Controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid Credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ success: false, message: "Invalid Credentials" });
        }

        generateToken(user._id, res);

        const userResponse = {
            _id: user._id,
            userName: user.userName,
            email: user.email,
            profilePic: user.profilePic,
            createdAt: user.createdAt,
        };

        res.status(200).json(userResponse);
    } catch (error) {
        console.log("Error in Login Controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const logout = (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie('jwt', "", {
            maxAge: 0,
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction,
        });

        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in Logout Controller:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body;
        const userId = req.user._id;

        if (!profilePic) {
            return res.status(400).json({ success: false, message: "Profile Pic is required" });
        }

        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePic: uploadResponse.secure_url },
            { new: true }
        ).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in UpdateController:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in CheckAuthController:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};