const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class Admin {
  constructor(db) {
    this.collection = db.collection("admin");
    this.blacklistCollection = db.collection("blacklist");
    this.init();
  }

  async init() {
    await this.collection.createIndex({ admin_email: 1 }, { unique: true });
    await this.collection.createIndex({ admin_id: 1 }, { unique: true });
    await this.blacklistCollection.createIndex({ token: 1 }, { unique: true });
    await this.blacklistCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
  }

  async createAdmin({ admin_email, password }) {
    const admin_id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = {
      admin_email,
      admin_id,
      password: hashedPassword,
    };
    try {
      const result = await this.collection.insertOne(newAdmin);
      const { password, ...adminWithoutPassword } = newAdmin;
      return { ...adminWithoutPassword, _id: result.insertedId };
    } catch (error) {
      console.error("Error in createAdmin:", error);
      if (error.code === 11000) {
        throw new Error("Admin already exists");
      }
      throw error;
    }
  }

  async findAdminById(admin_id) {
    try {
      return await this.collection.findOne({ admin_id });
    } catch (error) {
      console.error("Error in findAdminById:", error);
      throw error;
    }
  }

  async findAdminByEmail(admin_email) {
    try {
      return await this.collection.findOne({ admin_email });
    } catch (error) {
      console.error("Error in findAdminByEmail:", error);
      throw error;
    }
  }

  async updateAdmin(admin_id, updates) {
    const { password, ...otherUpdates } = updates;
    const updateDoc = { $set: otherUpdates };

    if (password) {
      updateDoc.$set.password = await bcrypt.hash(password, 10);
    }
    try {
      const result=await this.collection.updateOne({ admin_id }, updateDoc);
      return {success:result.modifiedCount>0}
    } catch (e) {
      console.error("Error in updateAdmin:", e);
      throw e;
    }
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

  async blacklistAllTokens(admin_id) {
    try {
      const admin = await this.findAdminById(admin_id);
      if (!admin) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        { id: admin_id, role: admin.role, iat: currentTime - 1 },
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

module.exports = Admin;
