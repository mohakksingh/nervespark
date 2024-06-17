const express = require("express");
const jwt = require("jsonwebtoken");
const {
  jwtAuthMiddleware,
  generateToken,
} = require("../middleware/middleware.js");
const User = require("../models/User.model.js");
const connectDB = require("../db.js");
const bcrypt = require("bcrypt");
const DealerShip = require("../models/Dealership.model.js");
const Deal = require("../models/Deal.model.js");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const db = await connectDB();
    const data = req.body;
    const userModel = new User(db);

    if (!data.user_email || !data.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingUser = await userModel.findUserByEmail(data.user_email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await userModel.createUser({
      user_email: data.user_email,
      user_location: data.user_location,
      user_info: data.user_info,
      password: data.password,
      role: data.role || "client",
    });

    console.log("User Created");

    const payload = { id: newUser.user_id, role: newUser.role };
    const token = generateToken(payload);

    res.status(201).json({
      message: "User Registered successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "User already exists") {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

router.post("/login", async (req, res) => {
  try {
    const db = await connectDB();
    const data = req.body;

    if (!data.user_email || !data.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const userModel = new User(db);

    const user = await userModel.findUserByEmail(data.user_email);
    if (!user) {
      return res.status(400).json({ message: "No User Found" });
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const payload = { id: user.user_id, role: user.role };
    const token = generateToken(payload);

    res.status(200).json({
      message: "Logged in successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/change-password", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const userModel = new User(db);

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    const user = await userModel.findUserById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const updated = await userModel.updateUser(userId, {
      password: newPassword,
    });
    if (!updated.success) {
      return res.status(500).json({ message: "Error updating password" });
    }

    await userModel.blacklistAllTokens(userId);

    const payload = { id: userId, role: user.role };
    const token = generateToken(payload);

    res.status(200).json({
      message: "Password Changed Successfully",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/logout", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const userModel = new User(db);

    const token = req.headers.authorization.split(" ")[1];

    const result = await userModel.blacklistToken(token);
    if (!result) {
      return res.status(500).json({ message: "Failed to blackList token" });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/car/:car_id", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const dealershipModel = new DealerShip(db);
    const car_id = req.params.car_id;
    const dealership = await dealershipModel.findDealershipWithCar(car_id);

    if (dealership) {
      res.status(200).json({ dealership });
    } else {
      res.status(404).json({ message: "Dealership not found" });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/deals/:car_id", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const dealModel = new Deal(db);
    const car_id = req.params.car_id;

    const deal=await dealModel.findDealByCar({car_id});
    
    if (deal) {
      res.status(200).json( deal );
    } else {
      res.status(404).json({ message: "No Deals not found" });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});


// b. To view all vehicles owned by user along with dealer info.
router.get("/view-vehicles",jwtAuthMiddleware,async(req,res)=>{
  try{
    const db=await connectDB();
    const userModel=new User(db);

    const user_id=req.user.id;
    const user=await userModel.findUserById(user_id);
    if(!user){
      return res.status(400).json({message:"User not found"});
    }

    const vehicles=await userModel.findUserVehicle(user_id)
    res.status(200).json({message:vehicles})
  }catch(e){
    console.log(e);
    res.status(500).json({
      message:"internal server error" 
    })
  }
})

module.exports = router;
