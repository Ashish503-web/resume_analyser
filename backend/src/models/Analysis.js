const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    title: String,
    severity: { type: String, enum: ["low", "medium", "high"] },
    explanation: String,
    fix: String,
  },
  { _id: false }
);

const strengthSchema = new mongoose.Schema(
  {
    title: String,
    evidence: String,
  },
  { _id: false }
);

const bulletRewriteSchema = new mongoose.Schema(
  {
    section: String,
    original: String,
    rewritten: String,
    rationale: String,
  },
  { _id: false }
);

const scoreBreakdownSchema = new mongoose.Schema(
  {
    keywords: { type: Number, min: 0, max: 25 },
    formatting: { type: Number, min: 0, max: 25 },
    impact: { type: Number, min: 0, max: 25 },
    clarity: { type: Number, min: 0, max: 25 },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", index: true },
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeVersion", index: true },

    atsScore: { type: Number, min: 0, max: 100 },

    scoreBreakdown: scoreBreakdownSchema,

    issues: [issueSchema],
    strengths: [strengthSchema],
    bulletRewrites: [bulletRewriteSchema],

    keywordsPresent: [String],
    keywordsMissing: [String],

    summary: String,

    model: String,
    promptTokens: Number,
    responseTokens: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);