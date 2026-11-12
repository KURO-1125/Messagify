import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true
        },
        receiverId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:false,
            default:null
        },
        groupId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Group",
            required:false,
            default:null
        },
        text:{
            type:String,
            trim:true,
            default:""
        },
        image:{
            type:String,
            default:null
        },
        audio:{
            type:String,
            default:null
        },
        audioDuration:{
            type:Number,
            default:0
        },
        isRead:{
            type:Boolean,
            default:false
        },
        readAt:{
            type:Date,
            default:null
        },
        isEdited:{
            type:Boolean,
            default:false
        },
        isDeleted:{
            type:Boolean,
            default:false
        },
        reactions:[
            {
                userId:{
                    type:mongoose.Schema.Types.ObjectId,
                    ref:"User",
                    required:true
                },
                emoji:{
                    type:String,
                    required:true
                }
            }
        ]
    },
    {timestamps: true}
)

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });
messageSchema.index({ groupId: 1, createdAt: 1 });

const Message = mongoose.model("Message",messageSchema);
export default Message