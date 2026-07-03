const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const Resume = require("../models/Resume");
const Analysis = require("../models/Analysis");

const router = express.Router();
router.use(requireAuth);

function topN(items, getKey, n = 8) {
    const counts = new Map();
    const extra = new Map();

    for (const item of items) {
        const key = getKey(item);
        if (!key) continue;

        counts.set(key, (counts.get(key) || 0) + 1);

        if (!extra.has(key)) {
            extra.set(key, item);
        }
    }

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([key, count]) => ({
            key,
            count,
            sample: extra.get(key),
        }));
}

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const userId = req.user._id;

        // 1. Get resumes
        const resumes = await Resume.find({ userId })
            .sort({ updatedAt: -1 })
            .lean();

        if (!resumes.length) {
            return res.json({
                empty: true,
                totalAnalyses: 0,
                resumes: [],
            });
        }

        // 2. Resume map
        const resumeMap = new Map(
            resumes.map((r) => [r._id.toString(), r])
        );

        const resumeIds = resumes.map((r) => r._id);

        // 3. Get analyses
        const analyses = await Analysis.find({
            resumeId: { $in: resumeIds },
        })
            .sort({ createdAt: 1 })
            .lean();

        if (!analyses.length) {
            return res.json({
                empty: true,
                totalAnalyses: 0,
                resumes: resumes.map((r) => ({
                    _id: r._id,
                    title: r.title,
                    latestVersionNumber: r.latestVersionNumber,
                })),
            });
        }

        // 4. Score stats
        const totalScore = analyses.reduce(
            (s, a) => s + (a.atsScore || 0),
            0
        );

        const averageScore = Math.round(totalScore / analyses.length);

        const bestEntry = analyses.reduce((best, a) =>
            (a.atsScore || 0) > (best.atsScore || 0) ? a : best
        );

        const bestResume =
            resumeMap.get(bestEntry.resumeId?.toString());

        // 5. Score trend
        const scoreTrend = analyses.map((a) => ({
            at: a.createdAt,
            score: a.atsScore,
            resumeId: a.resumeId,
            resumeTitle:
                resumeMap.get(a.resumeId?.toString())?.title || "Resume",
        }));

        // 6. Issues frequency
        const allIssues = analyses.flatMap((a) => a.issues || []);

        const topIssues = topN(
            allIssues,
            (i) => i.title?.trim().toLowerCase(),
            6
        ).map((raw) => ({
            title: raw.sample?.title || raw.key,
            count: raw.count,
            severity: raw.sample?.severity || "medium",
        }));

        // 7. Keywords
        const allMissing = analyses.flatMap(
            (a) => a.keywordsMissing || []
        );
        const allPresent = analyses.flatMap(
            (a) => a.keywordsPresent || []
        );

        const topMissing = topN(
            allMissing,
            (k) => k.toLowerCase(),
            12
        ).map((r) => ({
            keyword: r.sample,
            count: r.count,
        }));

        const topPresent = topN(
            allPresent,
            (k) => k.toLowerCase(),
            12
        ).map((r) => ({
            keyword: r.sample,
            count: r.count,
        }));

        // 8. Resume performance
        const resumePerformance = resumes
            .map((r) => {
                const ras = analyses.filter(
                    (a) => a.resumeId.toString() === r._id.toString()
                );

                if (!ras.length) return null;

                const latest = ras[ras.length - 1];
                const best = ras.reduce((b, a) =>
                    (a.atsScore || 0) > (b.atsScore || 0) ? a : b
                );

                const first = ras[0];

                return {
                    resumeId: r._id,
                    title: r.title,
                    analysesCount: ras.length,
                    latestScore: latest.atsScore,
                    bestScore: best.atsScore,
                    improvement:
                        (latest.atsScore || 0) - (first.atsScore || 0),
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.latestScore - a.latestScore);

        // 9. Response
        res.json({
            empty: false,
            totalAnalyses: analyses.length,
            averageScore,
            bestScore: {
                value: bestEntry.atsScore,
                resumeId: bestEntry.resumeId,
                resumeTitle: bestResume?.title || "Resume",
                at: bestEntry.createdAt,
            },
            scoreTrend,
            topIssues,
            topMissingKeywords: topMissing,
            topPresentKeywords: topPresent,
            resumePerformance,
        });
    })
);

module.exports = router;