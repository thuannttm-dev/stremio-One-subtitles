const {
    normalizeDeepLSourceLanguage,
    normalizeDeepLTargetLanguage,
    normalizeGoogleLanguage,
    normalizeStremioLanguage,
} = require("./languages");
const { Buffer } = require("buffer");

function getSubtitleConfig(config = {}) {
    const sourceLanguage = config.sourceLang || config.sourceLanguage || "de";
    const targetLanguage = config.targetLang || config.targetLanguage || "en";
    const deeplApiKey = config.deeplApiKey;
    const translationProvider = config.translationProvider;
    return {
        deeplApiKey,
        sourceLanguage,
        targetLanguage,
        translationProvider,
        deeplSourceLanguage: normalizeDeepLSourceLanguage(sourceLanguage),
        deeplTargetLanguage: normalizeDeepLTargetLanguage(targetLanguage),
        stremioSourceLanguage: normalizeStremioLanguage(sourceLanguage),
        stremioTargetLanguage: normalizeStremioLanguage(targetLanguage),
        googleSourceLanguage: normalizeGoogleLanguage(sourceLanguage),
        googleTargetLanguage: normalizeGoogleLanguage(targetLanguage),
    };
}

function parseConfigPrefix(parts) {
    if (parts[0] !== "configure" || !parts[1] || !parts[2]) return null;

    return {
        deeplApiKey: parts[4] ? decodeProviderKey(parts[4]) : "",
        sourceLang: decodeURIComponent(parts[1]),
        targetLang: decodeURIComponent(parts[2]),
        translationProvider: parts[3] ? decodeURIComponent(parts[3]) : "googletrans",
    };
}

function decodeProviderKey(value) {
    return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

module.exports = {
    getSubtitleConfig,
    parseConfigPrefix,
};
