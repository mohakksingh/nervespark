const express = require("express");
const jwt = require("jsonwebtoken");
const {
  jwtAuthMiddleware,
  generateToken,
} = require("../middleware/middleware.js");
const connectDB = require("../db.js");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin.model.js");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const db = await connectDB();
    const data = req.body;
    const adminModel = new Admin(db);

    if (!data.admin_email || !data.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingAdmin = await adminModel.findAdminByEmail(
      data.admin_email
    );
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const newAdmin = await adminModel.createAdmin({
      admin_email: data.admin_email,
      password: data.password,
      role: "admin",
      admin_id: data.admin_id,
    });

    console.log("Admin Created");

    const payload = {
      id: newAdmin.admin_id,
      role: newAdmin.role,
    };
    const token = generateToken(payload);

    res.status(201).json({
      message: "Admin Registered successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Admin already exists") {
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

    if (!data.admin_email || !data.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const adminModel = new Admin(db);

    const admin=await adminModel.findAdminByEmail(data.admin_email)
    console.log(data.admin_email);
    if (!admin) {
      return res.status(400).json({ message: "No admin Found" });
    }

    const isMatch = await bcrypt.compare(data.password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const payload = { id: admin.admin_id, role: admin.role };
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
    const adminModel = new Admin(db);

    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    const admin = await adminModel.findAdminById(adminId);
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const updated = await adminModel.updateAdmin(adminId, {
      password: newPassword,
    });
    if (!updated.success) {
      return res.status(500).json({ message: "Error updating password" });
    }

    await adminModel.blacklistAllTokens(adminId)
    const payload = { id: adminId, role: admin.role };
    const token = generateToken(payload);

    res.status(200).json({
      message: "Password Changed Successfully",
      token
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/logout", jwtAuthMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const adminModel = new Admin(db);


    const token = req.headers.authorization.split(" ")[1];
    const isBlackListed = await adminModel.isTokenBlacklisted(token);

    if(isBlackListed){
      return res.status(400).json({ message: "Token already blacklisted" });
    }

    const result = await adminModel.blackListToken(token);
    if (!result) {
      return res.status(500).json({ message: "Failed to blackList token" });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
