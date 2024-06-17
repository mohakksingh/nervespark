const {MongoClient}=require('mongodb')

require('dotenv').config();

const mongoUrl=process.env.MONGODB_URL

let db;

const connectDB = async () => {
    if (db) return db; 
    try {
        const client = await MongoClient.connect(mongoUrl);
        db = client.db('car_dealership');
        console.log('Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        throw error;
    }
};



module.exports=connectDB;