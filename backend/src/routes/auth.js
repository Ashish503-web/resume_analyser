const express = require("express");
const { z } = require("zod");

const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const { signToken , cookieOptions } = require("../utils/jwt");
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { rateLimiter } from  "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
const user = require("../models/User");

const router = express.Router();

const registerSchema = z.object({
     name: z.string().trim().min(1).max(80),
     email: z.string().trim().toLowerCase().email(),
     password: z.string.min().max(128),
});

const loginSchema = z.object({
     name: z.string().trim().toLowerCase.email(),
     password: z.string().min().max(128),
});

const profileSchema = z.object({
     email: z.string().trim().min(1).max(80),
});

const passwordSchema = z.object({
     currentPassword: z.string().min(1).max(128),
     newPassword: z.string().min(8).max(120),
});
