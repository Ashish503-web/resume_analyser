const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);

async function connectDB() {
     const conn = await mongoose.connect(env.mongoUri, {
          serverSelectionTimeoutMS: 10_000,
     });

     console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

     mongoose.connection.on("error", (err) => {
          console.error("err", err.message);
     });

     mongoose.connection.on("disconnected", () => {
          console.log("MongoDB disconnected");
     });
}

module.exports = { connectDB };