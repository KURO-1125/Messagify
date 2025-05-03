import cloudinary from '../lib/cloudinary.js';
import generateToken from '../lib/utils.js'
import User from '../models/user.model.js'
import bcrypt from 'bcryptjs'


export const signup = async (req,res)=>{
    const { userName, email, password } = req.body;
    try {

        if(!userName || !email || !password) return res.status(400).json({success:false,message:"All fields are required"})

        if(password.length<8) return res.status(400).json({success:false,message:"Password must be at least 8 characters"})

        const user = await User.findOne({email})
        if(user)return res.status(400).json({success:false,message:"Email already exists"})

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)

        const newUser = new User({
            userName:userName,
            email:email,
            password:hashedPassword,
        })

        if(newUser){
            generateToken(newUser._id,res)
            await newUser.save();

            res.status(201).json({success:true,message:"User Created Successfully",data:{
                _id:newUser._id,
                userName:newUser.userName,
                email: newUser.email,
                profilePic:newUser.profilePic
            }})
        }
        else{
            res.status(400).json({success:false,message:"Invalid User Data"})
        }

    } catch (error) {
        console.log("Error in Signup Controller",error.message);
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

export const login = async (req,res)=>{
    const { email, password } = req.body;
    try {
        const user = await User.findOne({email})

        if(!user) return res.status(400).json({success:false,message:"Invalid Credentials"})

        const isPasswordCorrect = await bcrypt.compare(password,user.password)

        if(!isPasswordCorrect) return res.status(400).json({success:false,message:"Invalid Credentials"})

        generateToken(user._id,res)

        res.status(200).json({success:true,message:"Login Successfull",data:{
            _id:user._id,
            userName:user.userName,
            email: user.email,
            profilePic:user.profilePic
        }})
    } catch (error) {
        console.log("Error in Login Controller: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

export const logout = (req,res)=>{
    try {
        res.cookie('jwt',"",{
            maxAge:0
        })

        res.status(200).json({success:true,message:"LoggedOut Successfully"})
    } catch (error) {
        console.log("Error in LogoutController: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

export const updateProfile = async (req,res)=>{
    try {
        const {profilePic} = req.body;
        const userId = req.user._id 

        if(!profilePic) return res.status(400).json({success:false,message:"Profile Pic is required"})

        const uploadResponse = await cloudinary.uploader.upload(profilePic)
        const updatedUser = await User.findByIdAndUpdate(userId,{profilePic:uploadResponse.secure_url},{new:true})


        res.status(200).json(updatedUser)
    } catch (error) {
        console.log("Error in UpdateController: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

export const checkAuth = (req,res)=>{
    try {
        res.status(200).json(req.user)
    } catch (error) {
        console.log("Error in CheckAuthController: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}