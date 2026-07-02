const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const Analysis = require("../models/Analysis");

const router = express.Router();
router.use(requireAuth);

function topN(items, getKey, n=8 ){
     const counts = new Map();
     const extra = new Map();
     for(const item of items) {
          const key = getKey(item);
          if(!key) continue;
          counts.set(key,(counts.get(key) || 0) + 1);
          if(!extra.has(key)) extra.set(key, item);
     }
     return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([key, count]) => ({
               key, count, sample: extra.get(key)
          }));
}