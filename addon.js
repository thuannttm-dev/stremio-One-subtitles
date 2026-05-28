const { addonBuilder } = require("stremio-addon-sdk");
const { getSubtitleOptions } = require("./subtitle-service");

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
    id: "community.doublesubtitles",
    version: "1.0.0",
    catalogs: [],
    resources: ["subtitles"],
    types: ["movie", "series"],
    name: "Double Subtitles",
    logo: "https://raw.githubusercontent.com/awerks/stremio-double-subtitles/main/assets/logo.png",
    description: "Double subtitles for Stremio",
    behaviorHints: {
        configurable: true,
    },
};
function createAddonInterface(config) {
    const builder = new addonBuilder(createManifest(config));

    builder.defineSubtitlesHandler((args) => getSubtitleOptions({ ...args, config }));
    return builder.getInterface();
}

function createManifest(config) {
    if (!config) return manifest;
    const provider = config.translationProvider === "deepl" ? "DeepL" : "Google";

    return {
        ...manifest,
        name: `${manifest.name} ${config.sourceLang}->${config.targetLang}`,
        description: `${manifest.description}: ${config.sourceLang} subtitles with ${config.targetLang} translation via ${provider}`,
    };
}

module.exports = createAddonInterface();
module.exports.createAddonInterface = createAddonInterface;
module.exports.createManifest = createManifest;
module.exports.manifest = manifest;
