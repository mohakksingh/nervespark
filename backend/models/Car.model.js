const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

class Car {
  constructor(db) {
    this.collection = db.collection("car");
    this.init();
  }

  async init() {
    await this.collection.createIndex({ car_id: 1 }, { unique: true });
    await this.collection.createIndex({ car_name: 1 }, { unique: true });

    // await this.collection.dropIndex({car_name:1})
  }

  async createCar({ type, car_name, model, car_info }) {
    const car_id = uuidv4();

    const newCar = {
      car_id,
      type,
      car_name,
      model,
      car_info,
    };

    try {
      const result = await this.collection.insertOne(newCar);
      return { ...newCar, _id: result.insertId };
    } catch (error) {
      console.log("Error in createCar:", error);
      if (error.code === 11000) {
        throw new Error("Car already exists");
      }
      throw error;
    }
  }

  async findCarById(car_id) {
    try {
      return await this.collection.findOne({ car_id:car_id.car_id });
    } catch (e) {
      console.log("Error in findCarById:", e);
      throw e;
    }
  }

  async findCarByName(car_name) {
    try {
      return await this.collection.findOne({ car_name });
    } catch (e) {
      console.log("Error in findCarByName:", e);
      throw e;
    }
  }

  async getAllCars() {
    try {
      return await this.collection.find({}).toArray();
    } catch (e) {
      console.log("Error in getAllCars:", e);
      throw e;
    }
  }
}

module.exports = Car;
