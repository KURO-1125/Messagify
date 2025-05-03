import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        email:{
            type:String,
            requires:true,
            unique:true
        },
        userName:{
            type:String,
            required:true
        },
        password:{
            type:String,
            required: true,
            minlength:8
        },
        profilePic:{
            type:String,
            default:""
        }
    },
    {timestamps:true}
)

const User = mongoose.model('User',userSchema);
export default User;