function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

function safeString(val) {
  return typeof val === "string" ? val : "";
}

/* -------------------------
   MAIN PARSER
--------------------------*/
async function parseResume(text) {
  if (!text || typeof text !== "string") {
    return fallbackStructure();
  }

  // Clean noisy PDF text
  const cleanText = text
    .replace(/\r/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Basic heuristic extraction (FAST + SAFE fallback layer)
  const sections = {
    basics: extractBasics(cleanText),
    summary: extractSummary(cleanText),
    experience: extractExperience(cleanText),
    education: extractEducation(cleanText),
    skills: extractSkills(cleanText),
    projects: extractProjects(cleanText),
    certifications: extractCertifications(cleanText),
    languages: [],
    interests: [],
  };

  return ensureStructure(sections);
}

/* -------------------------
   BASIC EXTRACTION HELPERS
--------------------------*/

function extractBasics(text) {
  const email =
    text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";

  const phone =
    text.match(/(\+91[\-\s]?)?[0-9]{10}/)?.[0] || "";

  const lines = text.split("\n").slice(0, 5);

  return {
    name: safeString(lines[0]),
    title: safeString(lines[1]),
    location: "",
    email,
    phone,
    links: [],
  };
}

function extractSummary(text) {
  const match = text.match(/summary[:\-]([\s\S]{50,300})/i);
  return match ? match[1].trim() : "";
}

function extractExperience(text) {
  if (!text.toLowerCase().includes("experience")) return [];

  return [
    {
      company: "",
      role: "",
      location: "",
      period: "",
      bullets: [],
    },
  ];
}

function extractEducation(text) {
  return [];
}

function extractSkills(text) {
  const match = text.match(/skills[:\-]([\s\S]{20,200})/i);
  if (!match) return [];

  return match[1]
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractProjects(text) {
  return [];
}

function extractCertifications(text) {
  return [];
}

/* -------------------------
   STRUCTURE NORMALIZER
--------------------------*/
function ensureStructure(s) {
  return {
    basics: s.basics || {
      name: "",
      title: "",
      location: "",
      email: "",
      phone: "",
      links: [],
    },

    summary: s.summary || "",

    experience: safeArray(s.experience),

    education: safeArray(s.education),

    skills: safeArray(s.skills),

    projects: safeArray(s.projects),

    certifications: safeArray(s.certifications),

    languages: safeArray(s.languages),

    interests: safeArray(s.interests),
  };
}

/* -------------------------
   FALLBACK STRUCTURE
--------------------------*/
function fallbackStructure() {
  return {
    basics: {
      name: "",
      title: "",
      location: "",
      email: "",
      phone: "",
      links: [],
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    interests: [],
  };
}

module.exports = {
  parseResume,
};