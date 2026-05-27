const { normalizeGoogleLanguage, normalizeStremioLanguage } = require("./languages");

function getSubtitleConfig(config = {}) {
  const sourceLanguage = config.sourceLang || config.sourceLanguage || process.env.SUBTITLE_SOURCE_LANG || "de";
  const targetLanguage = config.targetLang || config.targetLanguage || process.env.SUBTITLE_TARGET_LANG || "en";

  return {
    sourceLanguage,
    targetLanguage,
    stremioSourceLanguage: normalizeStremioLanguage(sourceLanguage),
    stremioTargetLanguage: normalizeStremioLanguage(targetLanguage),
    googleSourceLanguage: normalizeGoogleLanguage(sourceLanguage),
    googleTargetLanguage: normalizeGoogleLanguage(targetLanguage),
  };
}

function parseConfigPrefix(parts) {
  if (parts[0] !== "configure" || !parts[1] || !parts[2]) return null;

  return {
    sourceLang: decodeURIComponent(parts[1]),
    targetLang: decodeURIComponent(parts[2]),
  };
}

module.exports = {
  getSubtitleConfig,
  parseConfigPrefix,
};
