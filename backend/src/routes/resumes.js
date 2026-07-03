const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadPdf } = require("../middleware/upload");
const { authLimiter } = require("../middleware/rateLimit");


const { diffText, summarize } = require("../services/diffService");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const Analysis = require("../models/Analysis");

const { analyzerResume } = require("../services/geminiService");
const { extractText } = require("../services/pdfService");
const { parseResume: parseStructure } = require("../services/structureParser");

const router = express.Router();
router.use(requireAuth);

const objectIdSchema = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: "Invalid id",
});

const idParam = z.object({ id: objectIdSchema });

/* -------------------------
   LOAD HELPERS
--------------------------*/

async function loadOwnerResume(req) {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!resume) throw ApiError.notFound("Resume not found");
  return resume;
}

async function loadVersion(resumeId, versionId) {
  const version = await ResumeVersion.findOne({
    _id: versionId,
    resumeId,
  });

  if (!version) throw ApiError.notFound("Version not found");
  return version;
}

/* -------------------------
   UPLOAD RESUME
--------------------------*/
router.post(
  "/",
  uploadPdf("file"),
  asyncHandler(async (req, res) => {
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
    });

    resume.currentVersionId = version._id;
    await resume.save();

    res.status(201).json({ resume, version, meta });
  })
);

/* -------------------------
   GET ALL RESUMES
--------------------------*/
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const resumes = await Resume.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    const resumeIds = resumes.map((r) => r._id);

    const versions = await ResumeVersion.find({
      resumeId: { $in: resumeIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      resume: resumes,
      versions,
    });
  })
);

/* -------------------------
   GET SINGLE RESUME
--------------------------*/
router.get(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnerResume(req);

    const versions = await ResumeVersion.find({
      resumeId: resume._id,
    })
      .sort({ versionNumber: 1 })
      .lean();

    res.json({ resume, versions });
  })
);

/* -------------------------
   ANALYZE RESUME
--------------------------*/
const analyzerBody = z.object({
  versionId: objectIdSchema.optional(),
  targetRole: z.string().trim().max(100).optional(),
});
function normalizeSeverity(s) {
          if (!s) return "medium";

          const val = s.toLowerCase();

          if (val === "low") return "low";
          if (val === "medium") return "medium";
          if (val === "high") return "high";

          return "medium";
          }

     function normalizeScore(n) {
          if (typeof n !== "number") return 0;
          return Math.round((n / 100) * 25);
     }

router.post(
  "/:id/analyze",
  authLimiter,
  validate(analyzerBody),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnerResume(req);

    const versionId = req.body.versionId || resume.currentVersionId;
    if (!versionId) throw ApiError.badRequest("No version found");

    const version = await loadVersion(resume._id, versionId);

    const { analysis: aiResult, model, promptTokens, responseTokens } =
      await analyzerResume({
        rawText: version.rawText,
        targetRole: req.body.targetRole,
      });

      

    const saved = await Analysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      versionId: version._id,

      atsScore: aiResult.atsScore,
      scoreBreakdown: {
          keywords: normalizeScore(aiResult.scoreBreakdown?.keywords),
          formatting: normalizeScore(aiResult.scoreBreakdown?.formatting),
          impact: normalizeScore(aiResult.scoreBreakdown?.impact),
          clarity: normalizeScore(aiResult.scoreBreakdown?.clarity),
          },
      issues: (aiResult.issues || []).map((i) => ({
          title: i.title,
          explanation: i.explanation,
          fix: i.fix,
          severity: normalizeSeverity(i.severity),
          })),
      strengths: (aiResult.strengths || []).map((s) => ({
          title: s.title,
          evidence: s.evidence || "",
          })),
      bulletRewrites: aiResult.bulletRewrites,
      keywordsPresent: aiResult.keywordsPresent,
      keywordsMissing: aiResult.keywordsMissing,
      summary: aiResult.summary,

      model,
      promptTokens,
      responseTokens,
    });

    version.latestAnalysisId = saved._id;
    await version.save();

    res.status(201).json({ analysis: saved });
  })
);

/* -------------------------
   GET ANALYSIS (LATEST)
--------------------------*/
router.get(
  "/:id/analysis",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnerResume(req);

    const analyses = await Analysis.find({ resumeId: resume._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ analyses });
  })
);

const rewrittenBody = z.object({
    analysisId: objectIdSchema,
    rewriteIds: z.array(objectIdSchema).optional(),
    label: z.string().optional(),
});

function applyRewritesToText(rawText, rewrites) {
     let result = rawText;
     for(const r of rewrites) {
          const ids = result.indexOf(r.original);
          if(ids >= 0){
               result = result.slice(0, ids) + r.rewritten + result.slice(ids + r.original.length);
          }else{
               result += `\n${r.rewritten}`;
          }
     }
     return result;
}

function patchBulletsInSections(sections, rewrites){
     if(!sections) return null;
     const cloned = JSON.parse(JSON.stringify(sections));
     for(const r of rewrites) {
          if(!r?.original || !r?.rewritten) continue;
          for(const exp of cloned.experience || []){
               if(!Array.isArray(exp.bullets)) continue;
               exp.bullets = exp.bullets.map((b) =>
                    b=== r.original ? r.rewritten : b 
               );
          }
     }
     return cloned;
}

function looksEmpty(sections) {
     if(!sections) return true;
     const b = sections.basics || {};
     const hasIdentity = b.name || b.email || b.title;
     const hasBody = 
          sections.summary ||
          sections.experience?.length ||
          sections.education?.length ||
          sections.skills?.length;
          
     return !hasIdentity && !hasBody;
}

router.post(
    "/:id/rewrite",
    validate(idParam, "params"),
    validate(rewrittenBody),
    asyncHandler(async (req, res) => {
        const resume = await loadOwnerResume(req);

        const analysis = await Analysis.findOne({
            _id: req.body.analysisId, // or req.body.analysis depending on your schema
            resumeId: resume._id,
        });

        if (!analysis) {
            throw ApiError.notFound("Analysis not found");
        }

        const baseVersion = await loadVersion(resume._id, analysis.versionId);

        const selected = req.body.rewriteIds?.length
            ? analysis.bulletRewrites.filter((r) =>
                  req.body.rewriteIds.includes(r._id.toString())
              )
            : analysis.bulletRewrites;

        if (!selected.length) {
            throw ApiError.badRequest("No rewrites selected to apply");
        }

        const newRaw = applyRewritesToText(baseVersion.rawText, selected);

        // Build a structured copy from the base version in case parsing fails.
        const patchedFromBase = patchBulletsInSections(
            baseVersion.parsedSections,
            selected
        );

        const reParsed = await parseStructure(newRaw);

        const finalParsed = looksEmpty(reParsed)
            ? patchedFromBase
            : reParsed;

        const nextNumber = resume.latestVersionNumber + 1;

        const newVersion = await ResumeVersion.create({
            resumeId: resume._id,
            versionNumber: nextNumber,
            label: req.body.label?.trim() || `V${nextNumber}`,
            rawText: newRaw,
            parsedSections: finalParsed,
            sourceType: "rewrite",
            parentVersionId: baseVersion._id,
        });

        resume.latestVersionNumber = nextNumber;
        resume.currentVersionId = newVersion._id;

        await resume.save();

        res.status(201).json({
            version: newVersion,
            appliedCount: selected.length,
        });
    })
);

router.get(
    "/:id/versions/:versionId/analysis",
    validate(
        z.object({
            id: objectIdSchema,
            versionId: objectIdSchema,
        }),
        "params"
    ),
     asyncHandler(async (req, res) => {
          const resume = await loadOwnerResume(req);
          const version = await loadVersion(resume._id, req.params.versionId);
          const analysis = await Analysis.findOne({
               resumeId: resume._id,
               versionId: version._id,
          }).sort({ createdAt: -1 }).lean();
          res.json({ analysis: analysis || null });
     })
)

/* -------------------------
   DELETE RESUME
--------------------------*/
router.delete(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnerResume(req);

    await ResumeVersion.deleteMany({ resumeId: resume._id });
    await Analysis.deleteMany({ resumeId: resume._id });
    await resume.deleteOne();

    res.json({ ok: true });
  })
);

const diffQuery = z.object({
     from: objectIdSchema,
     to: objectIdSchema,
     mode: z.enum(["words","lines"]).optional(),
});

router.get(
     "/:id/diff",
     validate(idParam, "params"),
     validate(diffQuery, "query"),
     asyncHandler(async (req, res) => {
          const resume = await loadOwnerResume(req);
          const [fromV, toV] = await Promise.all([
               loadVersion(resume._id, req.query.from),
               loadVersion(resume._id, req.query.to),
          ]);

          const parts = diffText(fromV.rawText, toV.rawText, req.query.mode);
          res.json({
               from: { id:fromV._id, label: fromV.label, versionNumber: fromV.versionNumber },
               to: { id: toV._id, label: toV.label, versionNumber: toV.versionNumber },
               parts,
               stats: summarize(parts),
          });
     })
)

module.exports = router;