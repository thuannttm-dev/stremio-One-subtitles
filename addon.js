const { addonBuilder } = require("stremio-addon-sdk");
const { getSubtitleOptions } = require("./subtitle-service");

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
  id: "community.doublesubtitles",
  version: "0.0.1",
  catalogs: [],
  resources: ["subtitles"],
  types: ["movie", "series"],
  name: "double-subtitles",
  description: "Double subtitles for Stremio",
};
function createAddonInterface(config) {
  const builder = new addonBuilder(createManifest(config));

  builder.defineSubtitlesHandler((args) => getSubtitleOptions({ ...args, config }));
  return builder.getInterface();
}

function createManifest(config) {
  if (!config) return manifest;

  return {
    ...manifest,
    name: `${manifest.name} ${config.sourceLang}->${config.targetLang}`,
    description: `${manifest.description}: ${config.sourceLang} subtitles with ${config.targetLang} translation`,
  };
}

module.exports = createAddonInterface();
module.exports.createAddonInterface = createAddonInterface;
module.exports.createManifest = createManifest;
module.exports.manifest = manifest;
