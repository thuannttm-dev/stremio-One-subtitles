const DEFAULT_PORT = process.env.PORT || "53100";

function getPublicBaseUrl() {
    if (process.env.ADDON_BASE_URL) {
        return stripTrailingSlash(process.env.ADDON_BASE_URL);
    }

    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }

    return `http://127.0.0.1:${DEFAULT_PORT}`;
}

function getListenHost() {
    return process.env.HOST || "0.0.0.0";
}

function getDisplayBaseUrl(port) {
    if (process.env.ADDON_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN) {
        return getPublicBaseUrl();
    }

    const host = getListenHost();
    const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
    return `http://${displayHost}:${port}`;
}

function getTrustProxySetting() {
    return process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN ? 1 : false;
}

function stripTrailingSlash(value) {
    return String(value).replace(/\/+$/, "");
}

module.exports = {
    getDisplayBaseUrl,
    getListenHost,
    getPublicBaseUrl,
    getTrustProxySetting,
};
