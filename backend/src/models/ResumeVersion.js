const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema(
  { label: String, url: String },
  { _id: false }
);

const basicsSchema = new mongoose.Schema(
  {
    name: String,
    title: String,
    location: String,
    email: String,
    phone: String,
    links: [linkSchema],
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    company: String,
    role: String,
    location: String,
    period: String,
    bullets: [String],
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    degree: String,
    school: String,
    location: String,
    period: String,
    details: String,
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    tech: [String],
    links: [linkSchema],
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: String,
    issuer: String,
    year: String,
  },
  { _id: false }
);

const parsedSectionsSchema = new mongoose.Schema(
  {
    basics: { type: basicsSchema, default: () => ({}) },
    summary: { type: String, default: "" },

    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    skills: { type: [String], default: [] },

    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },

    languages: { type: [String], default: [] },
    interests: { type: [String], default: [] },
  },
  { _id: false }
);

const resumeVersionSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },

    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    label: String,
    rawText: String,

    parsedSections: {
      type: parsedSectionsSchema,
      default: () => ({}),
    },

    sourceType: {
      type: String,
      enum: ["upload", "rewrite"],
      required: true,
    },

    parentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeVersion",
      default: null,
    },

    latestAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Analysis",
      default: null,
    },
  },
  { timestamps: true }
);

resumeVersionSchema.index({ resumeId: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model("ResumeVersion", resumeVersionSchema);