const { v4: uuidv4 } = require("uuid");
const express = require("express");

class Deal {
  constructor(db) {
    this.collection = db.collection("deal");
    this.init();
  }

  async init() {
    await this.collection.createIndex({ deal_id: 1 }, { unique: true });
    await this.collection.createIndex({ deal_name: 1 }, { unique: true });
  }

  async createDeal({ car_id, deal_info }) {
    const deal_id = uuidv4();

    const newDeal = {
      deal_id,
      car_id,
      deal_info,
    };

    try {
      const result = await this.collection.insertOne(newDeal);
      const { deal_info, ...dealWithoutInfo } = newDeal;
      return { ...dealWithoutInfo, _id: result.insertId };
    } catch (error) {
      console.log("Error in createDeal:", error);
      if (error.code === 11000) {
        throw new Error("Deal already exists");
      }
      throw error;
    }
  }

  async findDealById(deal_id) {
    try {
      return await this.collection.findOne(deal_id);
    } catch (e) {
      console.log("Error in findDealById:", e);
      throw e;
    }
  }

  async findDealByCar(car_id) {
    try {
      return await this.collection.findOne(car_id);
    } catch (e) {
      console.log("Error in findDealByCar:", e);
      throw e;
    }
  }
}

module.exports = Deal;
