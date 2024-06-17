const { v4: uuidv4 } = require("uuid");
const express = require("express");


class Sold_Vehicles{
    constructor(db){
        this.collection=db.collection('sold_vehicles');
        this.init();
    }

    async init(){
        await this.collection.createIndex({sold_vehicle_id:1},{unique:true});
        await this.collection.createIndex({car_id:1},{unique:true});
    }

    async createSoldVehicle({
        car_id,
        vehicle_info
    }){
        const vehicle_id=uuidv4();

        const newSoldVehicle={
            vehicle_id,
            car_id,
            vehicle_info
        }
        try{
            const result=await this.collection.insertOne(newSoldVehicle);
            const {vehicle_info,...vehicleWithoutInfo}=newSoldVehicle;
            return {...vehicleWithoutInfo,_id:result.insertId};
        }catch(e){
            console.log("Error in createSoldVehicle:",e);
            if(e.code===11000){
                throw new Error("Vehicle already exists");
            }
            throw e;
        }
    }

    async findSoldVehicleById(vehicle_id){
        return await this.collection.findOne(vehicle_id);
    }
}

module.exports=Sold_Vehicles;