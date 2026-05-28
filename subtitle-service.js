const crypto = require("crypto");
const { Buffer } = require("buffer");
const { getSubtitleConfig } = require("./lib/config");
const { fetchText } = require("./lib/http-client");
const { normalizeStremioLanguage } = require("./lib/languages");
const logger = require("./lib/logger");
const { getPublicBaseUrl } = require("./lib/public-url");
const { rankSubtitles } = require("./lib/subtitle-ranker");
const { composeVtt, parseSubtitleCues } = require("./lib/subtitle-parser");
const { searchPublicStremioOpenSubtitles } = require("./lib/stremio-subtitles");
const { translateCues } = require("./lib/translator");

const RESULT_LIMIT = Number(process.env.SUBTITLE_RESULT_LIMIT || 3);
const jobs = new Map();

async function getSubtitleOptions(args) {
    const config = getSubtitleConfig(args.config || (args.extra && args.extra.__config));
    logger.info("subtitle options requested", {
        id: args.id,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        type: args.type,
    });

    try {
        const results = await searchPublicStremioOpenSubtitles(args);
        const sourceLanguageSubtitles = results.filter(
            (subtitle) => normalizeStremioLanguage(subtitle.lang) === config.stremioSourceLanguage,
        );
        const rankedSubtitles = rankSubtitles(sourceLanguageSubtitles, args);
        const subtitles = rankedSubtitles
            .map((subtitle) => createSubtitleOption(args, subtitle, config))
            .filter(Boolean)
            .slice(0, RESULT_LIMIT);

        logger.info("subtitle options resolved", {
            id: args.id,
            returnedCount: subtitles.length,
            sourceLanguageCount: sourceLanguageSubtitles.length,
            totalCount: results.length,
            topSubtitleIds: rankedSubtitles.slice(0, RESULT_LIMIT).map((subtitle) => subtitle.id),
        });
        return { subtitles };
    } catch (error) {
        logger.error("subtitle lookup failed", {
            error,
            id: args.id,
            type: args.type,
        });
        return { subtitles: [] };
    }
}

async function getGeneratedSubtitle(key) {
    const job = jobs.get(key);

    if (!job) {
        const error = new Error("Generated subtitle was not found");
        error.statusCode = 404;
        throw error;
    }

    if (job.vtt) {
        logger.debug("generated subtitle cache hit", { key });
        return job.vtt;
    }

    if (!job.promise) {
        logger.info("generated subtitle build queued", { key });
        job.promise = buildTranslatedVtt(job)
            .then((vtt) => {
                job.vtt = vtt;
                logger.info("generated subtitle cached", {
                    bytes: Buffer.byteLength(vtt, "utf8"),
                    key,
                });
                return vtt;
            })
            .catch((error) => {
                job.promise = null;
                logger.error("generated subtitle build failed", {
                    error,
                    key,
                });
                throw error;
            });
    } else {
        logger.debug("generated subtitle build joined", { key });
    }

    return job.promise;
}

function createSubtitleOption(args, subtitle, config) {
    const key = hashKey({
        type: args.type,
        id: args.id,
        sourceLanguage: config.stremioSourceLanguage,
        targetLanguage: config.stremioTargetLanguage,
        subtitleId: subtitle.id,
        subtitleUrl: subtitle.url,
    });

    if (!jobs.has(key)) {
        jobs.set(key, {
            key,
            config,
            subtitleUrl: subtitle.url,
            title: `OpenSubtitles v3 ${subtitle.id}`,
        });
    }

    return {
        id: `opensubtitles-v3-${subtitle.id}-to-${config.stremioTargetLanguage}`,
        url: `${getPublicBaseUrl()}/generated-subtitles/${key}.vtt`,
        lang: config.stremioTargetLanguage,
    };
}

async function buildTranslatedVtt(job) {
    const config = getSubtitleConfig(job.config);
    logger.info("source subtitle download started", {
        key: job.key,
        subtitleUrl: job.subtitleUrl,
    });
    const subtitleText = await fetchText(job.subtitleUrl);

    const cues = parseSubtitleCues(subtitleText);

    if (!cues.length) {
        throw new Error(`No subtitle cues found for ${job.title}`);
    }

    logger.info("subtitle translation started", {
        cueCount: cues.length,
        key: job.key,
        sourceLanguage: config.googleSourceLanguage,
        targetLanguage: config.googleTargetLanguage,
    });
    const translations = await translateCues(cues, config);
    const vtt = composeVtt(cues, translations);
    logger.info("subtitle translation finished", {
        cueCount: cues.length,
        key: job.key,
    });
    return vtt;
}

function hashKey(value) {
    return crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

module.exports = {
    getGeneratedSubtitle,
    getSubtitleOptions,
};
