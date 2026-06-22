const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// 1. Fixed: Turned into a proper array
const required = ["MONGO_URI", "JWT_SECRET"];

// 2. Fixed: Filtering the 'required' array instead of the 'require' function
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
     console.error(`Missing required env vars: ${missing.join(", ")}`);
     process.exit(1);
}

module.exports = {
     nodeEnv: process.env.NODE_ENV || "development",
     // 3. Fixed: Using parentheses for function invocation
     port: Number(process.env.PORT) || 5000,
     mongoUri: process.env.MONGO_URI,
     jwtSecret: process.env.JWT_SECRET,
     jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
     cookieName: process.env.COOKIE_NAME || "arr_token",
     // 4. Fixed: Added .split(",") so .map() can execute on an array
     clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
     geminiApiKey: process.env.GEMINI_API_KEY || "",
     geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
     isProd: process.env.NODE_ENV === "production",
};