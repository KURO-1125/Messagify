import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:{
            type:mongoose.Schema.ObjectId,
            ref:"User",
            reuired:true
        },
        receiverId:{
            type:mongoose.Schema.ObjectId,
            ref:"User",
            reuired:true
        },
        text:{
            type:String,
        },
        image:{
            type:String,
        }
    },
    {timestamps: true}
)

const Message = mongoose.model("Message",messageSchema);
export default Message