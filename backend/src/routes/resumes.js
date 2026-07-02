const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");

const asyncHandle = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const { requireAuth } = require("../middleware/auth");
const { validate }= require("../middleware/validate");
const { uploadPdf } = require("../middleware/upload");

const resume = require("../models/Resume");
const resumeVersion = require("../models/ResumeVersion");

const { analyzerLimiter } = require("../middleware/rateLimit");
const analysis = require("../models/Analysis");
const { analyzerResume } = require("../services/geminiService");

const { diffText, summarize } = require("../services/diffService");

const { extractText } = require("../services/pdfService");

const { parseResume: parseStructure } = require("../services/structureParser");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");

const  router = express.Router();
router.use(requireAuth);

const objectIdSchema = z.string().refine((v) => mongoose.isValidObjectId(v), {
     message: "Invalid id"
});

const idParam = z.object({ id: objectIdSchema});

async function loadOwnerResume(req) {
     const resume = await Resume.findOne({
          _id: req.params.id,
          userId: req.user._id,
     });
     if(!resume) throw ApiError.notFound("Resume not found");
     return resume;
}

async function loadVersion(resumeId, versionId) {
     const version = await ResumeVersion.findOne({
          _id: versionId, resumeId 
     });

     if(!version) throw ApiError.notFound("Version not found");
     return version;
}

router.post(
     "/",
     uploadPdf("file"),
     asyncHandle(async (req, res) => {
          const { text, meta } = await extractText(req.file.buffer);
          const parsedSections = await parseStructure(text);

          const title = 
          (req.body.title || "").trim() ||
          req.file.originalname.replace(/\.pdf$/i, "") ||
          "Untitled Resume";

          const resume = await Resume.create({
               userId: req.user._id,
               title,
               latestVersionNumber: 1,
          });

          const version = await ResumeVersion.create({
               resumeId: resume._id,
               versionNumber: 1,
               label: "V1",
               rawText: text,
               parsedSections,
               sourceType: "upload",
               parentVersionId: null,
          });

          resume.currentVersionId = version._id;
          await resume.save();

          res.status(201).json({ resume, version, meta });
     })
);

router.get(
     "/",
     asyncHandle(async (req, res) => {
          const resume = await Resume.find({ userId: req.user._id })
               .sort({ updatedAt: -1 }).lean();
               res.json({ resume })
     })
);

router.get(
     "/:id",
     validate(idParam, "params"),
     asyncHandle(async (req, res) => {
          const resume = await loadOwnerResume(req);
          const version = await ResumeVersion.find({ resumeId: resume._id })
               .sort({ versionNumber: 1 }).select("-rawText").lean();
               res.json({ resume, version });
     })
);

router.get(
     "/:id/versions/:version",
     validate(
          z.object({ id: objectIdSchema, versionId: objectIdSchema }),
          "params"
     ),
     asyncHandle(async (req, res ) => {
          const resume = await loadOwnerResume(req);
          const version = await loadVersion(resume._id, req.params.version);
          res.json({ version });
     })
);

router.delete(
     "/:id",
     validate(idParam, "params"),
     asyncHandle( async (req, res) => {
          const resume = await loadOwnerResume(req);
          await ResumeVersion.deleteMany({ resumeId: resume._id });
          await Analysis.deleteMany({ resumeId: resume._id });
          await resume.deleteOne();
          res.json({ ok: true });
     })
);


const analyzerBody = z.object({
     versionId: objectIdSchema.optional(),
     targetRole: z.string().trim().max.optional(),
});

route.post("/:id/analyze",
     analyzerLimiter,
     validate(analyzerBody),
     asyncHandle(async (req, res) => {
          const resume = await loadOwnerResume(req);

          const versionId = req.body.versionId || resume.currentVersionId;
          if(!versionId) throw ApiError.badRequest("No version to analyze");
          const version = await loadVersion(resume._id, versionId);

          const { analysis, model, promptTokens, responseTokens } = 
          await analyzerResume({
               rawText: version.rawText,
               targetRole: req.body.targetRole,
          });

          const saved = await analysis.create({
               userId: req.user._id,
               resumeId: resume._id,
               versionId: analysis.atsScore,
               scoreBreakdown: analysis.scoreBreakdown,
               issues: analysis.issues,
               strength: analysis.strengths,
               bulletRewrites: analysis.bulletRewrites,
               keywordsPresent: analysis.keywordsPresent,
               keywordMissing: analysis.keywordsMissing,
               summary: analysis.summary,
               model,
               promptTokens,
               responseTokens,
          });

          version.latestAnalysisId = saved._id;
          await version.save();
          res.status(201).json({ analysis: saved });
     })
);


router.get(
     "/:id/analysis",
     validate(idParams, "params"),
     asyncHandle(async (req, res)=> {
          const resume = await loadOwnerResume(req);
          const analyses = await Analysis.find({ resumeID: resume._id })
          .sort({ createdAt: -1 }).lean();
          res.json({ analysis });
     })
);

router.get(
     "/:id/version/:versionId/analysis",
     validate(z.object({
          id: objectIdSchema, versionId: objectIdSchema 
     }),),
     asyncHandle(async (req, res) => {
          const resume = await loadOwnerResume(req);
          const version = await loadVersion(resume._id, req.params.versionId);
          const analysis = await Analysis.findOne({
               resumeId: resume._id,
               versionId: version._id,
          }).sort({ createdAt: -1 }).lean();
          res.json({ analysis: analysis || null });
     })
)


const rewriteBody = z.object({
     analysisId: objectIdSchema,
     rewriteIds: z.array(objectIdSchema).optional(),
     label: z.string().trim().max(40).optional(),
});

function applyRewritesToText(rawText, rewrites) {
     let result = rawText;
     for(const r of rewrites) {
          const ids = result.indexOf(r.original);
          if(idx >= 0){
               result = result.slice(0, idx) + r.rewritten + resukt.slice(idx + r.original.length);
          }else{
               result += `\n${r.rewritten}`;
          }
     }
     return result;
}

// function patchBulletsInSections(sections, rewrites){
//      if(!sections) return null;
//      const cloned = JSON.parse(JSON.stringify(sections));
//      for(const r of rewrites) {
//           if(!r?.original)
//      }
// }
module.exports = router;