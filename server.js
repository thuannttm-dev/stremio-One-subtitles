#!/usr/bin/env node

const http = require("http");
const querystring = require("querystring");
const addonInterface = require("./addon");
const { parseConfigPrefix } = require("./lib/config");
const { readWebAsset, renderConfigPage } = require("./lib/web-page");
const { getGeneratedSubtitle } = require("./subtitle-service");

const port = Number(process.env.PORT || 53100);

const server = http.createServer(async (req, res) => {
	setCorsHeaders(res);

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		res.end();
		return;
	}

	try {
		const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

		if (isReadRequest(req) && url.pathname === "/") {
			sendHtml(res, renderConfigPage(addonInterface.manifest));
			return;
		}

		if (isReadRequest(req) && url.pathname === "/assets/styles.css") {
			sendCss(res, readWebAsset("styles.css"));
			return;
		}

		if (isReadRequest(req) && url.pathname === "/assets/config.js") {
			sendJavascript(res, readWebAsset("config.js"));
			return;
		}

		const configuredManifest = parseConfiguredManifest(url);
		if (isReadRequest(req) && configuredManifest) {
			sendJson(res, configuredManifest.manifest);
			return;
		}

		if (isReadRequest(req) && url.pathname === "/manifest.json") {
			sendJson(res, addonInterface.manifest);
			return;
		}

		const generatedMatch = url.pathname.match(/^\/generated-subtitles\/([a-f0-9]+)\.vtt$/);
		if (isReadRequest(req) && generatedMatch) {
			const vtt = await getGeneratedSubtitle(generatedMatch[1]);
			sendVtt(res, vtt);
			return;
		}

		const request = parseAddonRequest(url);
		if (isReadRequest(req) && request) {
			const response = await addonInterface.get(
				request.resource,
				request.type,
				request.id,
				request.extra
			);
			sendJson(res, response);
			return;
		}

		res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
		res.end(`Cannot ${req.method} ${url.pathname}`);
	} catch (error) {
		console.error(error);
		res.writeHead(error.statusCode || 500, { "Content-Type": "application/json; charset=utf-8" });
		res.end(JSON.stringify({ error: error.message || "Server error" }));
	}
});

server.listen(port, "127.0.0.1", () => {
	const manifestUrl = `http://127.0.0.1:${server.address().port}/manifest.json`;
	console.log("HTTP addon accessible at:", manifestUrl);
});

function parseAddonRequest(url) {
	const parts = url.pathname.split("/").filter(Boolean);
	const config = parseConfigPrefix(parts);

	if (config) parts.splice(0, 3);
	if (parts.length < 3) return null;

	const resource = decodeURIComponent(parts[0]);
	const type = decodeURIComponent(parts[1]);
	let id = decodeURIComponent(parts[2]);
	let extra = {};

	if (id.endsWith(".json")) id = id.slice(0, -5);

	if (parts[3]) {
		const extraPart = decodeURIComponent(parts[3].replace(/\.json$/, ""));
		extra = querystring.parse(extraPart);
	}

	for (const [key, value] of url.searchParams.entries()) {
		extra[key] = value;
	}

	if (config) extra.__config = config;

	if (!id || !type || !resource) return null;
	return { resource, type, id, extra, config };
}

function setCorsHeaders(res) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function isReadRequest(req) {
	return req.method === "GET" || req.method === "HEAD";
}

function sendJson(res, value) {
	res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}

function sendVtt(res, value) {
	res.writeHead(200, {
		"Content-Type": "text/vtt; charset=utf-8",
		"Cache-Control": "public, max-age=86400"
	});
	res.end(value);
}

function sendHtml(res, value) {
	res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
	res.end(value);
}

function sendCss(res, value) {
	res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
	res.end(value);
}

function sendJavascript(res, value) {
	res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
	res.end(value);
}

function parseConfiguredManifest(url) {
	const parts = url.pathname.split("/").filter(Boolean);
	const config = parseConfigPrefix(parts);

	if (!config || parts[3] !== "manifest.json") return null;

	return {
		config,
		manifest: {
			...addonInterface.manifest,
			name: `${addonInterface.manifest.name} ${config.sourceLang}->${config.targetLang}`,
			description: `${addonInterface.manifest.description}: ${config.sourceLang} subtitles with ${config.targetLang} translation`
		}
	};
}
