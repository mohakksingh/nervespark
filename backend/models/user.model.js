const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const jwt = require("jsonwebtoken");

class User {
  constructor(db) {
    this.collection = db.collection("user");
    this.blacklistCollection = db.collection("blacklist");
    this.init();
  }

  async init() {
    await this.collection.createIndex({ user_email: 1 }, { unique: true });
    await this.collection.createIndex({ user_id: 1 }, { unique: true });
    await this.blacklistCollection.createIndex({ token: 1 }, { unique: true });
    await this.blacklistCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

  }

  async createUser({
    user_email,
    user_location,
    user_info,
    password,
    role = "client",
    vehicle_info = [],
  }) {
    const user_id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      user_email,
      user_id,
      user_location,
      user_info: user_info || {},
      password: hashedPassword,
      role,
      vehicle_info,
    };

    try {
      const result = await this.collection.insertOne(newUser);
      const { password, ...userWithoutPassword } = newUser;
      return { ...userWithoutPassword, _id: result.insertedId };
    } catch (error) {
      console.error("Error in createUser:", error);
      if (error.code === 11000) {
        // Duplicate key error
        throw new Error("User already exists");
      }
      throw error;
    }
  }

  async findUserByEmail(user_email) {
    try {
      return await this.collection.findOne({ user_email });
    } catch (error) {
      console.error("Error in findUserByEmail:", error);
      throw error;
    }
  }

  async findUserById(user_id) {
    try {
      return await this.collection.findOne({ user_id });
    } catch (error) {
      console.error("Error in findUserById:", error);
      throw error;
    }
  }


  async addVehicle(user_id, vehicle_id) {
    try {
      const result = await this.collection.updateOne(
        { user_id },
        { $addToSet: { vehicle_info: vehicle_id } }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error in addVehicle:", error);
      throw error;
    }
  }

  async removeVehicle(user_id, vehicle_id) {
    try {
      const result = await this.collection.updateOne(
        { user_id },
        { $pull: { vehicle_info: vehicle_id } }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error in removeVehicle:", error);
      throw error;
    }
  }

  async updateUser(user_id, updates) {
    const { password, ...otherUpdates } = updates;
    const updateDoc = { $set: otherUpdates };

    if (password) {
      updateDoc.$set.password = await bcrypt.hash(password, 10);
    }

    try {
      const result = await this.collection.updateOne({ user_id }, updateDoc);
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  }

  async deleteUser(user_id) {
    try {
      const result = await this.collection.deleteOne({ user_id });
      return { success: result.deletedCount > 0 };
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error;
    }
  }
  
  async getAllUsers() {
    try {
      return await this.collection
        .find({}, { projection: { password: 0 } })
        .toArray();
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      throw error;
    }
  }

  async findUserVehicle(user_id){
    try {
      const data=await this.collection.findOne({user_id});
      return data.vehicle_info;
    } catch (error) {
      console.error("Error in findUserVehicle:", error);
      throw error;
    }
  }

  async blacklistToken(token) {
    try {
      const decodedToken = jwt.decode(token);
      const expiresAt = new Date(decodedToken.exp * 1000);

      await this.blacklistCollection.insertOne({ token, expiresAt });
      return true;
    } catch (error) {
      console.error("Error in blacklistToken:", error);
      return false;
    }
  }

  async isTokenBlacklisted(token) {
    try {
      const blacklistedToken = await this.blacklistCollection.findOne({
        token,
      });
      return !!blacklistedToken;
    } catch (error) {
      console.error("Error in isTokenBlacklisted:", error);
      throw error;
    }
  }

  async blacklistAllTokens(user_id) {
    try {
      const user = await this.findUserById(user_id);
      if (!user) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        { id: user_id, role: user.role, iat: currentTime - 1 },
        process.env.JWT_SECRET
      );

      await this.blacklistCollection.insertOne({
        token,
        expiresAt: new Date((currentTime + 7 * 24 * 60 * 60) * 1000), // 7 days from now
      });

      return true;
    } catch (error) {
      console.error("Error in blacklistAllTokens:", error);
      return false;
    }
  }
}

module.exports = User;
