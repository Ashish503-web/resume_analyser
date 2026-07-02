const { GoogleGenAI, Type } = require("@google/genai");


const { z } = require("zod");

const env = require("../config/env");

const ai = env.geminiApiKey
    ? new GoogleGenAI({
          apiKey: env.geminiApiKey,
      })
    : null;

const linkSchema = {
    type: Type.OBJECT,
    required: ["label", "url"],
    properties: {
        label: { type: Type.STRING },
        url: { type: Type.STRING },
    },
};

const responseSchema = {
    type: Type.OBJECT,
    required: [
        "basics",
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certification",
        "languages",
        "interests",
    ],
    properties: {
        basics: {
            type: Type.OBJECT,
            required: [
                "name",
                "title",
                "location",
                "email",
                "phone",
                "links",
            ],
            properties: {
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                location: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                links: {
                    type: Type.ARRAY,
                    items: linkSchema,
                },
            },
        },

        summary: {
            type: Type.STRING,
        },

        experience: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                required: [
                    "company",
                    "role",
                    "location",
                    "period",
                    "bullets",
                ],
                properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    location: { type: Type.STRING },
                    period: { type: Type.STRING },
                    bullets: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },
                },
            },
        },

        education: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                required: [
                    "degree",
                    "school",
                    "location",
                    "period",
                    "details",
                ],
                properties: {
                    degree: { type: Type.STRING },
                    school: { type: Type.STRING },
                    location: { type: Type.STRING },
                    period: { type: Type.STRING },
                    details: { type: Type.STRING },
                },
            },
        },

        skills: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
        },

        projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                required: ["name", "description"],
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    tech: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },
                    links: {
                        type: Type.ARRAY,
                        items: linkSchema,
                    },
                },
            },
        },

        certification: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                required: ["name"],
                properties: {
                    name: { type: Type.STRING },
                    issuer: { type: Type.STRING },
                    year: { type: Type.STRING },
                },
            },
        },

        languages: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
        },

        interests: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
        },
    },
};

const validator = z.object({
    basics: z.object({
        name: z.string().default(""),
        title: z.string().default(""),
        location: z.string().default(""),
        email: z.string().default(""),
        phone: z.string().default(""),
        links: z
            .array(
                z.object({
                    label: z.string(),
                    url: z.string(),
                })
            )
            .default([]),
    }),

    summary: z.string().default(""),

    experience: z
        .array(
            z.object({
                company: z.string().default(""),
                role: z.string().default(""),
                location: z.string().default(""),
                period: z.string().default(""),
                bullets: z.array(z.string()).default([]),
            })
        )
        .default([]),

    education: z
        .array(
            z.object({
                degree: z.string().default(""),
                school: z.string().default(""),
                location: z.string().default(""),
                period: z.string().default(""),
                details: z.string().default(""),
            })
        )
        .default([]),

    skills: z.array(z.string()).default([]),

    projects: z
        .array(
            z.object({
                name: z.string().default(""),
                description: z.string().default(""),
                tech: z.array(z.string()).default([]),
                links: z
                    .array(
                        z.object({
                            label: z.string(),
                            url: z.string(),
                        })
                    )
                    .default([]),
            })
        )
        .default([]),

    certification: z
        .array(
            z.object({
                name: z.string().default(""),
                issuer: z.string().default(""),
                year: z.string().default(""),
            })
        )
        .default([]),

    languages: z.array(z.string()).default([]),

    interests: z.array(z.string()).default([]),
});

module.exports = {
    ai,
    responseSchema,
    validator,
};