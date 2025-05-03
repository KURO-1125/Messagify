import mongoose from 'mongoose';

const connectDB = async ()=>{
    try{
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MONGODB CONNECTED : ${connection.connection.host}`)
    }
    catch(error){
        console.log("Error Connecting MongoDB: " + error)
    }
}

export default connectDB 