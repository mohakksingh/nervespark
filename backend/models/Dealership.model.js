const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const Car = require("./Car.model");
const Deal = require("./Deal.model");

class DealerShip {
  constructor(db) {
    this.collection = db.collection("dealership");
    this.carModel = new Car(db);
    this.dealModel = new Deal(db);
    this.blacklistCollection = db.collection("blacklist");
    this.init();
  }

  async init() {
    await this.collection.createIndex(
      { dealership_email: 1 },
      { unique: true }
    );
    await this.collection.createIndex({ dealership_id: 1 }, { unique: true });
    await this.blacklistCollection.createIndex({ token: 1 }, { unique: true });
    await this.blacklistCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
  }

  async createDealership({
    dealership_email,
    dealership_name,
    dealership_location,
    password,
    dealership_info,
    cars,
    deals,
    sold_vehicles,
  }) {
    const dealership_id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDealership = {
      dealership_email,
      dealership_id,
      dealership_name,
      dealership_location,
      password: hashedPassword,
      dealership_info: dealership_info || {},
      cars,
      deals,
      sold_vehicles,
    };

    try {
      const result = await this.collection.insertOne(newDealership);
      const { password, ...dealearshipWithoutPassword } = newDealership;
      return { ...dealearshipWithoutPassword, _id: result.insertId };
    } catch (error) {
      console.log("Error in createDealership:", error);
      if (error.code === 11000) {
        throw new Error("Dealership already exists");
      }
      throw error;
    }
  }

  async findDealershipByEmail(dealership_email) {
    try {
      return await this.collection.findOne({ dealership_email });
    } catch (e) {
      console.log("Error in finding dealership by email:", e);
      throw e;
    }
  }

  async findDealershipById(dealership_id) {
    try {
      return await this.collection.findOne({ dealership_id });
    } catch (e) {
      console.log("Error in finding dealership by id:", e);
      throw e;
    }
  }

  async findDealershipCars(dealership_id) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      return dealership.cars;
    } catch (e) {
      console.log("Error in finding dealership cars:", e);
      throw e;
    }
  }

  async findDealershipWithCar(car_id) {
    try {
      const carData = await this.carModel.findCarById({ car_id });
      const dealership = await this.collection.findOne({
        cars: carData,
      });
      return dealership.dealership_email;
    } catch (e) {
      console.log("Error in finding cars in all dealerships:", e);
      throw e;
    }
  }

  async findDealsWithCar(car_id) {
    try {
      const carData = await this.dealModel.findDealByCar({car_id} );
      return carData
    } catch (e) {
      console.log("Error in finding cars in all dealerships:", e);
      throw e;
    }
  }

  async findDealershipDeals(dealership_id) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      return dealership.deals;
    } catch (e) {
      console.log("Error in finding dealership deals:", e);
      throw e;
    }
  }

  async findSoldVehicles(dealership_id) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      return dealership.sold_vehicles;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async addCarsToDealership(dealership_id, cars) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      if (!dealership) {
        throw new Error("Dealership not found");
      }

      const updatedCars = await this.carModel.createCar(cars);
      const updatedCarsId = updatedCars.map((car) => car.car_id);

      const result = await this.collection.updateOne(
        { dealership_id },
        { $push: { cars: { $each: updatedCarsId } } }
      );

      return { success: result.modifiedCount > 0 };
    } catch (e) {
      console.log("Error in adding cars to dealership:", e);
      throw e;
    }
  }

  async updateDealership(dealership_id, updates) {
    const { password, ...otherUpdates } = updates;
    const updateDoc = { $set: otherUpdates };

    if (password) {
      updateDoc.$set.password = await bcrypt.hash(password, 10);
    }

    try {
      const result = await this.collection.updateOne(
        { dealership_id },
        updateDoc
      );
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.error("Error in update dealership:", error);
      throw error;
    }
  }

  async updateDealershipCars(dealership_id, newCars) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      if (!dealership) {
        throw new Error("Dealership not found");
      }

      const existingCars = await this.carModel.findCarById({
        car_id: newCars[0],
      });

      let result;
      result = await this.collection.updateOne(
        { dealership_id },
        { $push: { cars: existingCars } }
      );
      console.log(result, "result");
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.log("Error updating dealership cars:", error);
      throw error;
    }
  }

  async updateDealershipDeals(dealership_id, newDeals) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      if (!dealership) {
        throw new Error("Dealership not found");
      }
      console.log(dealership_id);
      const existingDeals = await this.dealModel.findDealById({
        deal_id: newDeals[0],
      });

      let result;
      result = await this.collection.updateOne(
        { dealership_id },
        { $push: { deals: existingDeals } }
      );
      console.log(result, "result");
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.log("Error updating dealership cars:", error);
      throw error;
    }
  }
  async updateDealershipSoldVehicles(dealership_id, newDeals) {
    try {
      const dealership = await this.collection.findOne({ dealership_id });
      if (!dealership) {
        throw new Error("Dealership not found");
      }
      console.log(dealership_id);
      const existingDeals = await this.dealModel.findDealById({
        deal_id: newDeals[0],
      });

      let result;
      result = await this.collection.updateOne(
        { dealership_id },
        { $push: { deals: existingDeals } }
      );
      console.log(result, "result");
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.log("Error updating dealership cars:", error);
      throw error;
    }
  }

  async updateSoldVehicles(dealership_email, sold_vehicles) {
    return await this.collection.updateOne(
      {
        dealership_email,
      },
      { $set: { sold_vehicles } }
    );
  }

  async blackListToken(token) {
    try {
      const decodedToken = jwt.decode(token);
      const expiresAt = new Date(decodedToken.exp * 1000);

      await this.blacklistCollection.insertOne({ token, expiresAt });
      return true;
    } catch (e) {
      console.log("Error in blacklisting token:", e);
      return false;
    }
  }

  async isTokenBlacklisted(token) {
    try {
      const blackListedToken = await this.blacklistCollection.findOne({
        token,
      });
      return !!blackListedToken;
    } catch (e) {
      console.log("Error in is token blacklisted");
      throw e;
    }
  }

  async blacklistAllTokens(dealership_id) {
    try {
      const dealership = await this.findDealershipById(dealership_id);
      if (!dealership) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        { id: dealership_id, role: dealership.role, iat: currentTime - 1 },
        process.env.JWT_SECRET
      );

      await this.blacklistCollection.insertOne({
        token,
        expiresAt: new Date((currentTime + 7 * 24 * 60 * 60) * 1000),
      });

      return true;
    } catch (error) {
      console.error("Error in blacklistAllTokens:", error);
      return false;
    }
  }
}

module.exports = DealerShip;
