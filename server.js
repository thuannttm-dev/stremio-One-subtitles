#!/usr/bin/env node

const http = require("http");
const querystring = require("querystring");
const { spawn } = require("child_process");
const addonInterface = require("./addon");
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

		if (req.method === "GET" && url.pathname === "/") {
			sendHtml(res, landingPage());
			return;
		}

		if (req.method === "GET" && url.pathname === "/manifest.json") {
			sendJson(res, addonInterface.manifest);
			return;
		}

		const generatedMatch = url.pathname.match(/^\/generated-subtitles\/([a-f0-9]+)\.vtt$/);
		if (req.method === "GET" && generatedMatch) {
			const vtt = await getGeneratedSubtitle(generatedMatch[1]);
			sendVtt(res, vtt);
			return;
		}

		const request = parseAddonRequest(url);
		if (req.method === "GET" && request) {
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

	if (!id || !type || !resource) return null;
	return { resource, type, id, extra };
}

function setCorsHeaders(res) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

function landingPage() {
	const manifestUrl = `http://127.0.0.1:${port}/manifest.json`;

	return `<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${addonInterface.manifest.name}</title>
	</head>
	<body>
		<h1>${addonInterface.manifest.name}</h1>
		<p>${addonInterface.manifest.description}</p>
		<p>Manifest: <a href="${manifestUrl}">${manifestUrl}</a></p>
		<p><a href="${manifestUrl.replace("http://", "stremio://")}">Install Add-on</a></p>
	</body>
</html>`;
}

