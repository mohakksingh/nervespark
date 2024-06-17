const express = require("express");
const connectDB = require("../db.js");
const Car = require("../models/Car.model");
const Dealership = require("../models/Dealership.model");
const User = require("../models/User.model");
const { jwtAuthMiddleware } = require("../middleware/middleware.js");

const router = express.Router();

router.get("/allcars",jwtAuthMiddleware,async (req, res) => {
    try{
        const db=await connectDB();
        const carModel=new Car(db);
        
        const cars=await carModel.getAllCars();

        res.status(200).json(cars);
    }catch(e){
        console.log(e);
        res.status(500).json({message:"Internal Server Error"});
    }
});

router.get("/cars/:dealership_id",jwtAuthMiddleware,async (req, res) => {
    try{
        const db=await connectDB();
        const dealershipModel=new Dealership(db);
        
        const cars=await dealershipModel.findDealershipCars(req.params.dealership_id);

        res.status(200).json({cars});
    }catch(e){
        console.log(e);
        res.status(500).json({message:"Internal Server Error"});
    }
});


// TODO: To add new vehicle to the list of owned/sold vehicles at user/dealership end after a deal is
// complete (to check it)
router.post("/add_vehicle",jwtAuthMiddleware,async (req, res) => {
    try{
        const db=await connectDB();
        const userModel=new User(db);
        const dealershipModel=new Dealership(db);

        if(!req.user.id){
            return res.status(400).json({message:"User ID is required"});
        }
        
        const {user_id,dealership_id,vehicle_id}=req.body;

        const user=await userModel.updateUser(user_id,{vehicle_id});
        const dealership=await dealershipModel.updateDealership(dealership_id,{vehicle_id});


        res.status(200).json({message:"Vehicle added successfully"});
        
    }catch(e){
        console.log(e);
        res.status(500).json({message:"Internal Server Error"});
    }
});


router.get("/deals/:dealership_id",jwtAuthMiddleware,async (req, res) => {
    try{
        const db=await connectDB();
        const dealershipModel=new Dealership(db);
        
        const deals=await dealershipModel.findDealershipDeals(req.params.dealership_id);

        res.status(200).json({deals});
    }catch(e){
        console.log(e);
        res.status(500).json({message:"Internal Server Error"});
    }
});



module.exports = router;
