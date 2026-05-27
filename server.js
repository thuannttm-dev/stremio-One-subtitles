#!/usr/bin/env node

const path = require("path");
const express = require("express");
const { getRouter } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
const { createAddonInterface } = require("./addon");
const { getDisplayBaseUrl, getListenHost, getTrustProxySetting } = require("./lib/public-url");
const { createRateLimiters } = require("./lib/rate-limit");
const { renderConfigPage } = require("./lib/web-page");
const { getGeneratedSubtitle } = require("./subtitle-service");

function createApp() {
    const app = express();
    const webDir = path.join(__dirname, "web");
    const configuredRouters = new Map();

    app.set("trust proxy", getTrustProxySetting());

    const rateLimiters = createRateLimiters();

    app.use((req, res, next) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Headers", "*");
        res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

        if (req.method === "OPTIONS") {
            res.sendStatus(204);
            return;
        }

        next();
    });
    app.use(rateLimiters.general);
    app.use(rateLimiters.subtitleWork);

    app.use("/assets", express.static(webDir));

    app.get("/", (req, res) => {
        res.type("html").send(renderConfigPage(addonInterface.manifest));
    });

    app.get("/generated-subtitles/:key.vtt", async (req, res, next) => {
        try {
            const vtt = await getGeneratedSubtitle(req.params.key);
            res.type("text/vtt").set("Cache-Control", "public, max-age=86400").send(vtt);
        } catch (error) {
            next(error);
        }
    });

    app.use("/configure/:sourceLang/:targetLang", (req, res, next) => {
        getConfiguredRouter(configuredRouters, req.params.sourceLang, req.params.targetLang)(req, res, next);
    });

    app.use(getRouter(addonInterface));

    app.use((error, req, res, next) => {
        if (res.headersSent) {
            next(error);
            return;
        }

        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
    });

    return app;
}

function getConfiguredRouter(configuredRouters, sourceLang, targetLang) {
    const key = `${sourceLang}:${targetLang}`;

    if (!configuredRouters.has(key)) {
        configuredRouters.set(key, getRouter(createAddonInterface({ sourceLang, targetLang })));
    }

    return configuredRouters.get(key);
}

if (require.main === module) {
    const port = Number(process.env.PORT || 53100);
    const host = getListenHost();
    const server = createApp().listen(port, host, () => {
        const manifestUrl = `${getDisplayBaseUrl(server.address().port)}/manifest.json`;
        console.log("HTTP addon accessible at:", manifestUrl);
    });
}

module.exports = {
    createApp,
};
