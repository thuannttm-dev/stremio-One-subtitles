const crypto = require("crypto");
const { Buffer } = require("buffer");
const { LRUCache } = require("lru-cache");
const { getSubtitleConfig } = require("./lib/config");
const { getCachedGeneratedSubtitle, setCachedGeneratedSubtitle } = require("./lib/generated-subtitle-cache");
const { fetchText } = require("./lib/http-client");
const { normalizeStremioLanguage } = require("./lib/languages");
const logger = require("./lib/logger");
const {
    recordGeneratedSubtitleCache,
    recordSubtitleCandidates,
    recordSubtitleLookup,
    recordSubtitleTranslation,
} = require("./lib/metrics");
const { getPublicBaseUrl } = require("./lib/public-url");
const { composeVtt, parseSubtitleCues } = require("./lib/subtitle-parser");
const { searchPublicStremioOpenSubtitles } = require("./lib/stremio-subtitles");
const { translateCues } = require("./lib/translator");
const { translationProvider } = require("./lib/translator");
const RESULT_LIMIT = Number(process.env.SUBTITLE_RESULT_LIMIT || 3);
const DEFAULT_JOB_MAX = 1000;
const DEFAULT_JOB_TTL_SECONDS = 24 * 60 * 60;
const JOB_MAX = DEFAULT_JOB_MAX;
const JOB_TTL_SECONDS = DEFAULT_JOB_TTL_SECONDS;
const jobs = new LRUCache({
    max: JOB_MAX,
    ttl: JOB_TTL_SECONDS * 1000,
    updateAgeOnGet: true,
});

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
        recordSubtitleCandidates({
            count: results.length,
            sourceLanguage: config.sourceLanguage,
            stage: "upstream",
            targetLanguage: config.targetLanguage,
            type: args.type,
        });
        recordSubtitleCandidates({
            count: sourceLanguageSubtitles.length,
            sourceLanguage: config.sourceLanguage,
            stage: "source_language",
            targetLanguage: config.targetLanguage,
            type: args.type,
        });
        const subtitles = sourceLanguageSubtitles
            .map((subtitle) => createSubtitleOption(args, subtitle, config))
            .filter(Boolean)
            .slice(0, RESULT_LIMIT);
        recordSubtitleLookup({
            sourceLanguage: config.sourceLanguage,
            status: "success",
            targetLanguage: config.targetLanguage,
            type: args.type,
        });

        logger.info("subtitle options resolved", {
            id: args.id,
            returnedCount: subtitles.length,
            sourceLanguageCount: sourceLanguageSubtitles.length,
            totalCount: results.length,
            topSubtitleIds: sourceLanguageSubtitles.slice(0, RESULT_LIMIT).map((subtitle) => subtitle.id),
        });
        return { subtitles };
    } catch (error) {
        logger.error("subtitle lookup failed", {
            error,
            id: args.id,
            type: args.type,
        });
        recordSubtitleLookup({
            sourceLanguage: config.sourceLanguage,
            status: "failure",
            targetLanguage: config.targetLanguage,
            type: args.type,
        });
        return { subtitles: [] };
    }
}

async function getGeneratedSubtitle(key) {
    const cachedSubtitle = await getCachedGeneratedSubtitle(key);
    if (cachedSubtitle) {
        logger.debug("generated subtitle cache hit", { key, source: cachedSubtitle.source });
        recordGeneratedSubtitleCache(`${cachedSubtitle.source}_hit`);
        return cachedSubtitle.vtt;
    }

    const job = jobs.get(key);
    if (!job) {
        const error = new Error("Generated subtitle was not found");
        error.statusCode = 404;
        throw error;
    }

    if (!job.promise) {
        logger.info("generated subtitle build queued", { key });
        recordGeneratedSubtitleCache("miss");
        job.promise = buildTranslatedVtt(job)
            .then((vtt) => {
                return setCachedGeneratedSubtitle(key, vtt).then(() => {
                    if (jobs.get(key) === job) {
                        jobs.delete(key);
                    }
                    return vtt;
                });
            })
            .then((vtt) => {
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
        recordGeneratedSubtitleCache("joined");
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

    if (!jobs.get(key)) {
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
    const startedAt = process.hrtime.bigint();
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
        provider: translationProvider(config),
    });
    try {
        const translations = await translateCues(cues, config);
        const vtt = composeVtt(cues, translations);
        recordSubtitleTranslation({
            bytes: Buffer.byteLength(vtt, "utf8"),
            durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
            sourceLanguage: config.sourceLanguage,
            status: "success",
            targetLanguage: config.targetLanguage,
        });
        logger.info("subtitle translation finished", {
            cueCount: cues.length,
            key: job.key,
        });
        return vtt;
    } catch (error) {
        recordSubtitleTranslation({
            bytes: 0,
            durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
            sourceLanguage: config.sourceLanguage,
            status: "failure",
            targetLanguage: config.targetLanguage,
        });
        throw error;
    }
}

function hashKey(value) {
    return crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

module.exports = {
    getGeneratedSubtitle,
    getSubtitleOptions,
};
