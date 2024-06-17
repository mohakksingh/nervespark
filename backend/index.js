const express=require('express');
const bodyParser=require('body-parser');
require('dotenv').config();
const connectDB = require('./db');


const app=express();
const db=connectDB();
const PORT=process.env.PORT||3000


app.use(express.json());
app.use(bodyParser.json());


const userRoutes=require('./routes/user.routes');
const dealershipRoutes=require('./routes/dealership.routes');
const adminRoutes=require('./routes/admin.routes');
const commonRoutes=require('./routes/common.routes');


app.use('/api/user',userRoutes);
app.use('/api/dealer',dealershipRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/common',commonRoutes);

app.listen(PORT,(req,res)=>{
    console.log(`Server is running on port ${PORT}`)
})