const { GoogleGenAI, Type } = require("@google/genai");
const env = require("../config/env");
const ApiError = require("../utils/apiError");

const ai = env.geminiApiKey
  ? new GoogleGenAI({ apiKey: env.geminiApiKey })
  : null;

/* -------------------------
   GEMINI RESPONSE SCHEMA
--------------------------*/
const responseSchema = {
  type: Type.OBJECT,
  required: [
    "atsScore",
    "scoreBreakdown",
    "issues",
    "strengths",
    "bulletRewrites",
    "keywordsPresent",
    "keywordsMissing",
    "summary",
  ],
  properties: {
    atsScore: { type: Type.NUMBER },

    scoreBreakdown: {
      type: Type.OBJECT,
      properties: {
        keywords: { type: Type.NUMBER },
        formatting: { type: Type.NUMBER },
        impact: { type: Type.NUMBER },
        clarity: { type: Type.NUMBER },
      },
    },

    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING },
          explanation: { type: Type.STRING },
          fix: { type: Type.STRING },
        },
      },
    },

    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
      },
    },

    bulletRewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          original: { type: Type.STRING },
          rewritten: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
      },
    },

    keywordsPresent: { type: Type.ARRAY, items: { type: Type.STRING } },
    keywordsMissing: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
};

/* -------------------------
   PROMPT BUILDER
--------------------------*/
function buildPrompt({ rawText, targetRole }) {
  return `
You are an expert ATS resume reviewer.

Target role: ${targetRole || "Not specified"}

Return STRICT JSON only.

Evaluate:
- ATS score (0–100)
- score breakdown (keywords, formatting, impact, clarity)
- 5 issues
- 5 strengths
- 5–10 bullet rewrites
- keywords present
- keywords missing
- summary

Resume:
--------------------
${rawText}
--------------------
`;
}

/* -------------------------
   GEMINI CALL
--------------------------*/
async function callGemini(prompt) {
  const result = await ai.models.generateContent({
    model: env.geminiModel,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3,
    },
  });

  const text =
    typeof result.text === "function" ? result.text() : result.text;

  if (!text) throw new Error("Empty Gemini response");

  return JSON.parse(text);
}

/* -------------------------
   MAIN SERVICE
--------------------------*/
async function analyzerResume({ rawText, targetRole }) {
  if (!ai) {
    throw ApiError.internal("Gemini API key not configured");
  }

  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const data = await callGemini(buildPrompt({ rawText, targetRole }));

      return {
        analysis: data,
        model: env.geminiModel,
        promptTokens: 0,
        responseTokens: 0,
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw ApiError.internal(
    `Gemini failed: ${lastError?.message || "Unknown error"}`
  );
}

module.exports = { analyzerResume };