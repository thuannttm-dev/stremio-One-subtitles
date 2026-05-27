const crypto = require("crypto");
const { getSubtitleConfig } = require("./lib/config");
const { fetchText } = require("./lib/http-client");
const { normalizeStremioLanguage } = require("./lib/languages");
const { composeVtt, parseSubtitleCues } = require("./lib/subtitle-parser");
const { searchPublicStremioOpenSubtitles } = require("./lib/stremio-subtitles");
const { translateCues } = require("./lib/translator");

const DEFAULT_PORT = process.env.PORT || "53100";
const RESULT_LIMIT = Number(process.env.SUBTITLE_RESULT_LIMIT || 3);
const jobs = new Map();

async function getSubtitleOptions(args) {
    console.log("subtitle request:", args);
    const config = getSubtitleConfig(args.config || (args.extra && args.extra.__config));

    try {
        const results = await searchPublicStremioOpenSubtitles(args);
        const subtitles = results
            .filter((subtitle) => normalizeStremioLanguage(subtitle.lang) === config.stremioSourceLanguage)
            .map((subtitle) => createSubtitleOption(args, subtitle, config))
            .filter(Boolean)
            .slice(0, RESULT_LIMIT);

        return { subtitles };
    } catch (error) {
        console.error("Public Stremio subtitle lookup failed:", error.message);
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

    if (job.vtt) return job.vtt;

    if (!job.promise) {
        job.promise = buildTranslatedVtt(job)
            .then((vtt) => {
                job.vtt = vtt;
                return vtt;
            })
            .catch((error) => {
                job.promise = null;
                throw error;
            });
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
        url: `${getBaseUrl()}/generated-subtitles/${key}.vtt`,
        lang: config.stremioTargetLanguage,
    };
}

async function buildTranslatedVtt(job) {
    const config = getSubtitleConfig(job.config);
    console.log(`Downloading subtitle ${job.subtitleUrl}`);
    const subtitleText = await fetchText(job.subtitleUrl);
    const cues = parseSubtitleCues(subtitleText);

    if (!cues.length) {
        throw new Error(`No subtitle cues found for ${job.title}`);
    }

    console.log(
        `Translating ${cues.length} cues from ${config.googleSourceLanguage} to ${config.googleTargetLanguage}`,
    );
    const translations = await translateCues(cues, config);
    return composeVtt(cues, translations);
}

function getBaseUrl() {
    return process.env.ADDON_BASE_URL || `http://127.0.0.1:${DEFAULT_PORT}`;
}

function hashKey(value) {
    return crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

module.exports = {
    getGeneratedSubtitle,
    getSubtitleOptions,
};
