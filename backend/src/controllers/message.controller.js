import cloudinary from '../lib/cloudinary.js';
import { getReceiverSocketId , io } from '../lib/socket.js';
import Message from '../models/message.model.js'
import User from '../models/user.model.js'

export const getUsersForSideBar = async (req,res)=>{
    try {
        const getLoggedInUser = req.user._id;
        const filteredUsers  = await User.find({_id:{$ne:getLoggedInUser}}).select("-password")

        res.status(200).json(filteredUsers)
    } catch (error) {
        console.log("Error in getUsersForSideBarController: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

export const getMessages = async (req,res)=>{
    try {
        const {id:userToChatId} = req.params
        const myId = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderId:myId,receiverId:userToChatId},{senderId:userToChatId,receiverId:myId}
            ]
        })

        res.status(200).json(messages)
    } catch (error) {
        console.log("Error in MessagesController: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}

export const sendMessage = async (req,res)=>{
    try {
        const {text,image} = req.body;
        const {id:receiverId} = req.params;
        const senderId = req.user._id;

        let imageURL;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageURL = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image:imageURL
        })

        await newMessage.save();

        //TODO - socket.io
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage",newMessage);
        }
        res.status(201).json(newMessage)
    } catch (error) {
        console.log("Error in getMessagesController: ", error.message)
        res.status(500).json({success:false,message:"Internal Server Error"})
    }
}