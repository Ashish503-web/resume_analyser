const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const analyzerLimiter = rateLimit({
     limit: 5,
     windowMs: 60 * 100,
     standardHeaders: "draft-7",
     legacyHeaders: false,
     keyGenerator: (req,res) => 
          req.user?._id?.toString() || ipKeyGenerator(req, res),
     message: {
          error: { message: "Too many analyzer - please wait a minute and retry."}
     },
});