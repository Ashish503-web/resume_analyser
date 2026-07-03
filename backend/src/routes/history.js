const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const Analysis = require("../models/Analysis");

const router = express.Router();
router.use(requireAuth);

router.get(
     "/",
     asyncHandler(async (req, res) => {
          const userId = req.user._id;

          // ✅ STEP 1: FETCH RESUMES (MISSING IN YOUR CODE)
          const resumes = await Resume.find({ userId })
               .sort({ createdAt: -1 })
               .lean();

          const resumeIds = resumes.map((r) => r._id);

          const resumeMap = new Map(
               resumes.map((r) => [r._id.toString(), r])
          );

          // ✅ STEP 2: FETCH DATA
          const [versions, analyses] = await Promise.all([
               ResumeVersion.find({
                    resumeId: { $in: resumeIds },
               })
                    .select(
                         "_id resumeId label versionNumber sourceType createdAt"
                    )
                    .lean(),

               Analysis.find({ userId })
                    .select(
                         "_id resumeId atsScore createdAt"
                    )
                    .lean(),
          ]);

          // ✅ STEP 3: BUILD EVENTS
          const events = [];

          // Upload events
          for (const r of resumes) {
               events.push({
                    id: `r-${r._id}`,
                    type: "upload",
                    title: `${r.title} uploaded`,
                    subtitle:
                         "Parsed and version V1 created",
                    label: "V1",
                    at: r.createdAt,
                    resumeId: r._id,
                    resumeTitle: r.title,
               });
          }

          // Rewrite events
          for (const v of versions) {
               if (v.sourceType !== "rewrite")
                    continue;

               const resume = resumeMap.get(
                    v.resumeId.toString()
               );

               events.push({
                    id: `v-${v._id}`,
                    type: "rewrite",
                    title: `${v.label} created for ${
                         resume?.title || "resume"
                    }`,
                    subtitle: "Rewrites applied",
                    label: v.label,
                    at: v.createdAt,
                    resumeId: v.resumeId,
                    resumeTitle:
                         resume?.title || "Resume",
               });
          }

          // Analysis events
          for (const a of analyses) {
               const resume = resumeMap.get(
                    a.resumeId?.toString()
               );

               events.push({
                    id: `a-${a._id}`,
                    type: "analysis",
                    title: `Analysis complete on ${
                         resume?.title || "resume"
                    }`,
                    subtitle: `ATS score ${
                         a.atsScore
                    } / 100`,
                    label: "analysis",
                    at: a.createdAt,
                    resumeId: a.resumeId,
                    resumeTitle:
                         resume?.title || "Resume",
               });
          }

          // ✅ STEP 4: SORT EVENTS
          events.sort(
               (a, b) =>
                    new Date(b.at) - new Date(a.at)
          );

          // ✅ STEP 5: TOTALS
          const totals = {
               all: events.length,
               upload: events.filter(
                    (e) => e.type === "upload"
               ).length,
               analysis: events.filter(
                    (e) => e.type === "analysis"
               ).length,
               rewrite: events.filter(
                    (e) => e.type === "rewrite"
               ).length,
          };

          res.json({ events, totals });
     })
);

module.exports = router;