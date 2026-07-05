const env = require("../config/env");
const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/apiError");
const User = require("../models/User");

async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.[env.cookieName];
     console.log("Cookie Name:", env.cookieName);
console.log("Cookies:", req.cookies);
console.log("Headers:", req.headers.cookie);
     //    if (!token) {
     //        return next(ApiError.unauthorized("Authentication required"));
     //    }
   

        const payload = verifyToken(token);

        const user = await User.findById(payload.sub);

        if (!user) {
            return next(ApiError.unauthorized("Session no longer valid"));
        }

        req.user = user;

        next();
    } catch (err) {
        if (
            err.name === "JsonWebTokenError" ||
            err.name === "TokenExpiredError"
        ) {
            return next(ApiError.unauthorized("Invalid or expired session"));
        }

        next(err);
    }
}

module.exports = { requireAuth };