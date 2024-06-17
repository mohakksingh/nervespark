const express = require("express");
const jwt = require("jsonwebtoken");
const {
  jwtAuthMiddleware,
  generateToken,
} = require("../middleware/middleware.js");
const connectDB = require("../db.js");
const bcrypt = require("bcrypt");
const DealerShip = require("../models/Dealership.model.js");
const Car = require("../models/Car.model.js");
const Deal = require("../models/Deal.model.js");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const db = await connectDB();
    const data = req.body;
    const dealershipModel = new DealerShip(db);

    if (!data.dealership_email || !data.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingDealership = await dealershipModel.findDealershipByEmail(
      data.dealership_email
    );
    if (existingDealership) {
      return res.status(400).json({ message: "Dealership already exists" });
    }

    const newDealership = await dealershipModel.createDealership({
      dealership_email: data.dealership_email,
      password: data.password,
      role: "dealership",
      dealership_id: data.dealership_id,
      dealership_name: data.dealership_name,
      dealership_location: data.dealership_location,
      dealership_info: data.dealership_info,
      cars: data.cars,
      deals: data.deals,
      sold_vehicles: data.sold_vehicles,
    });

    console.log("Dealership Created");

    const payload = {
      id: newDealership.dealership_id,
      role: newDealership.role,
    };
    const token = generateToken(payload);

    res.status(201).json({
      message: "Dealership Registered successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Dealership already exists") {
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

    if (!data.dealership_email || !data.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const dealershipModel = new DealerShip(db);

    const dealership = await dealershipModel.findDealershipByEmail(
      data.dealership_email
    );
    console.log(data.dealership_email);
    if (!dealership) {
      return res.status(400).json({ message: "No Dealership Found" });
    }

    const isMatch = await bcrypt.compare(data.password, dealership.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const payload = { id: dealership.dealership_id, role: dealership.role };
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
    const dealershipModel = new DealerShip(db);

    const dealershipId = req.dealership.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    const dealership = await dealershipModel.findDealershipById(dealershipId);
    if (!dealership) {
      return res.status(400).json({ message: "Dealership not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, dealership.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const updated = await dealershipModel.updateDealership(dealershipId, {
      password: newPassword,
    });
    if (!updated.success) {
      return res.status(500).json({ message: "Error updating password" });
    }

    await dealershipModel.blacklistAllTokens(dealershipId);
    const payload = { id: dealershipId, role: dealership.role };
    const token = generateToken(payload);

    res.status(200).json({
      message: "Password Changed Successfully",
      token,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/logout", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const dealershipModel = new DealerShip(db);

    const token = req.headers.authorization.split(" ")[1];
    const isBlackListed = await dealershipModel.isTokenBlacklisted(token);

    if (isBlackListed) {
      return res.status(400).json({ message: "Token already blacklisted" });
    }

    const result = await dealershipModel.blackListToken(token);
    if (!result) {
      return res.status(500).json({ message: "Failed to blackList token" });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/add-cars", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const car = req.body;
    const carModel = new Car(db);
    const dealershipModel = new DealerShip(db);

    const dealshipid=req.dealership.id;

    if(!dealshipid){
      return res.status(400).json({message:"Dealership id is required"});
    }

    if (!car.car_name) {
      return res.status(400).json({ message: "Car name is required" });
    }

    let newCar;
    const existingCar = await carModel.findCarByName(car.car_name);
    if (existingCar) {
      return res.status(400).json({ message: "car already exists" });
    } else {
      newCar = await carModel.createCar({
        type: car.type,
        car_name: car.car_name,
        model: car.model,
        car_info: car.car_info,
      });
    }

    const updateDealer = await dealershipModel.updateDealershipCars(
      req.dealership.id,
      [newCar.car_id]
    );
    if (!updateDealer.success) {
      return res
        .status(500)
        .json({ message: "Error updating dealership with new cars" });
    }

    res.status(200).json({
      message: "Car added successfully",
      car: newCar,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/add-deals", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const deal = req.body;
    const dealModel = new Deal(db);
    const dealershipModel = new DealerShip(db);

    const dealshipId=req.dealership.id;

    if(!dealshipId){
      return res.status(400).json({message:"Dealership id is required"});
    }

    if (!deal.deal_info) {
      return res.status(400).json({ message: "Car name is required" });
    }

    let newDeal;
    const existingDeal = await dealModel.findDealById(deal.deal_id);
    if (existingDeal) {
      return res.status(400).json({ message: "car already exists" });
    } else {
      newDeal = await dealModel.createDeal({
        car_id: deal.car_id,
        deal_info: deal.deal_info,
      });
    }

    const updateDealer = await dealershipModel.updateDealershipDeals(
      req.dealership.id,
      [newDeal.deal_id]
    );
    if (!updateDealer.success) {
      return res
        .status(500)
        .json({ message: "Error updating dealership with new Deals" });
    }

    res.status(200).json({
      message: "Deal added successfully",
      deal: newDeal,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/view-sold/:dealership_id", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const dealershipModel = new DealerShip(db);

    const { dealership_id } = req.params;


    if (!dealership_id) {
      return res.status(400).json({ message: "Dealership id is required" });
    }

    const soldVehicles = await dealershipModel.findSoldVehicles(dealership_id);

    if (!soldVehicles) {
      return res.status(400).json({ message: "No sold vehicles found" });
    }

    res.status(200).json({
      message: "Sold Vehicles: ",
      soldVehicles,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
