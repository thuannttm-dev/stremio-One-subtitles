const { fetchJson } = require("./http-client");

const STREMIO_OPEN_SUBTITLES_URL = "https://opensubtitles-v3.strem.io";

async function searchPublicStremioOpenSubtitles(args) {
    const url = `${STREMIO_OPEN_SUBTITLES_URL}${buildStremioAddonPath(args)}`;
    const response = await fetchJson(url);

    if (!Array.isArray(response.subtitles)) return [];
    return response.subtitles.filter((subtitle) => subtitle.url);
}

function buildStremioAddonPath(args) {
    const encodedId = encodeURIComponent(args.id);
    const encodedExtra = args.extra && Object.keys(args.extra).length ? `/${encodeExtra(args.extra)}` : "";

    return `/subtitles/${encodeURIComponent(args.type)}/${encodedId}${encodedExtra}.json`;
}

function encodeExtra(extra) {
    return Object.entries(extra)
        .filter(([key, value]) => key !== "__config" && value !== undefined && value !== null && value !== "")
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");
}

module.exports = {
    searchPublicStremioOpenSubtitles,
};
