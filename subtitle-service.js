const crypto = require("crypto");
const googleTranslate = require("googletrans").default;

const STREMIO_OPEN_SUBTITLES_URL = "https://opensubtitles-v3.strem.io";
const DEFAULT_PORT = process.env.PORT || "53100";
const STREMIO_SOURCE_LANGUAGE = normalizeStremioLanguage(
	process.env.SUBTITLE_SOURCE_LANG || "de"
);
const GOOGLE_SOURCE_LANGUAGE = normalizeGoogleLanguage(
	process.env.GOOGLETRANS_SOURCE_LANG || process.env.SUBTITLE_SOURCE_LANG || "de"
);
const GOOGLE_TARGET_LANGUAGE = normalizeGoogleLanguage(
	process.env.GOOGLETRANS_TARGET_LANG || "en"
);
const STREMIO_OUTPUT_LANGUAGE = process.env.STREMIO_OUTPUT_LANG || "eng";
const RESULT_LIMIT = Number(process.env.SUBTITLE_RESULT_LIMIT || 3);
const jobs = new Map();

async function getSubtitleOptions(args) {
	console.log("subtitle request:", args);
	try {
		const results = await searchPublicStremioOpenSubtitles(args);
		const subtitles = results
			.filter((subtitle) => normalizeStremioLanguage(subtitle.lang) === STREMIO_SOURCE_LANGUAGE)
			.map((subtitle) => createPublicStremioSubtitleOption(args, subtitle))
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

async function searchPublicStremioOpenSubtitles(args) {
	const url = `${STREMIO_OPEN_SUBTITLES_URL}${buildStremioAddonPath(args)}`;
	const response = await fetchJson(url);
	if (!Array.isArray(response.subtitles)) return [];
	return response.subtitles.filter((subtitle) => subtitle.url);
}

function createPublicStremioSubtitleOption(args, subtitle) {
	const key = hashKey({
		type: args.type,
		id: args.id,
		sourceLanguage: STREMIO_SOURCE_LANGUAGE,
		subtitleId: subtitle.id,
		subtitleUrl: subtitle.url,
	});

	if (!jobs.has(key)) {
		jobs.set(key, {
			key,
			sourceLanguage: STREMIO_SOURCE_LANGUAGE,
			subtitleUrl: subtitle.url,
			title: `OpenSubtitles v3 ${subtitle.id}`
		});
	}

	return {
		id: `opensubtitles-v3-${subtitle.id}-to-${STREMIO_OUTPUT_LANGUAGE}`,
		url: `${getBaseUrl()}/generated-subtitles/${key}.vtt`,
		lang: STREMIO_OUTPUT_LANGUAGE
	};
}

async function buildTranslatedVtt(job) {
	console.log(`Downloading subtitle ${job.subtitleUrl}`);
	const subtitleText = await fetchText(job.subtitleUrl);
	const cues = parseSubtitleCues(subtitleText);

	if (!cues.length) {
		throw new Error(`No subtitle cues found for ${job.title}`);
	}

	console.log(`Translating ${cues.length} cues from ${GOOGLE_SOURCE_LANGUAGE} to ${GOOGLE_TARGET_LANGUAGE}`);
	const translations = await translateCues(cues);
	return composeVtt(cues, translations);
}

async function translateCues(cues) {
	const translated = new Array(cues.length).fill("");
	let batch = [];
	let batchIndexes = [];
	let batchChars = 0;

	async function flushBatch() {
		if (!batch.length) return;

		const result = await translateBatch(batch);
		result.forEach((text, index) => {
			translated[batchIndexes[index]] = cleanTranslatedText(text);
		});

		batch = [];
		batchIndexes = [];
		batchChars = 0;
	}

	for (let index = 0; index < cues.length; index += 1) {
		const text = cueTextForTranslation(cues[index]);
		if (!text) continue;

		if (batch.length >= 35 || batchChars + text.length > 3500) {
			await flushBatch();
		}

		batch.push(text);
		batchIndexes.push(index);
		batchChars += text.length;
	}

	await flushBatch();
	return translated;
}

async function translateBatch(texts) {
	try {
		const result = await googleTranslate(texts, {
			from: GOOGLE_SOURCE_LANGUAGE,
			to: GOOGLE_TARGET_LANGUAGE
		});
		return result.textArray || [result.text];
	} catch (error) {
		if (texts.length === 1) throw error;

		const translated = [];
		for (const text of texts) {
			const result = await googleTranslate(text, {
				from: GOOGLE_SOURCE_LANGUAGE,
				to: GOOGLE_TARGET_LANGUAGE
			});
			translated.push(result.text);
		}
		return translated;
	}
}

async function fetchJson(url, options = {}) {
	const response = await fetchWithTimeout(url, options);
	const body = await response.text();
	let json = {};

	if (body) {
		try {
			json = JSON.parse(body);
		} catch (error) {
			throw new Error(`Expected JSON from ${url}, got: ${body.slice(0, 160)}`);
		}
	}

	if (!response.ok) {
		throw new Error(json.message || json.error || `${response.status} ${response.statusText}`);
	}

	return json;
}

async function fetchText(url) {
	const response = await fetchWithTimeout(url, {
		headers: {
			"User-Agent": process.env.SUBTITLE_USER_AGENT || "stremio-addon-doublesubtitles"
		}
	});

	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}

	return response.text();
}

async function fetchWithTimeout(url, options = {}) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), Number(process.env.REQUEST_TIMEOUT_MS || 30000));

	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

function parseSubtitleCues(text) {
	const normalized = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.trim();
	const withoutHeader = normalized.startsWith("WEBVTT")
		? normalized.replace(/^WEBVTT[^\n]*(\n[^\n]*)*?\n\n/, "")
		: normalized;

	return withoutHeader
		.split(/\n{2,}/)
		.map(parseCueBlock)
		.filter(Boolean);
}

function parseCueBlock(block) {
	const lines = block
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	if (!lines.length) return null;
	if (/^\d+$/.test(lines[0])) lines.shift();
	if (!lines[0] || !lines[0].includes("-->")) return null;

	const timing = lines.shift().replace(/,/g, ".");
	const text = cleanCueText(lines.join("\n"));
	if (!text) return null;

	return { timing, text };
}

function composeVtt(cues, translations) {
	const blocks = ["WEBVTT"];

	cues.forEach((cue, index) => {
		const translated = translations[index];
		let text = translated || cue.text;

		if (translated && translated !== cue.text) {
			text = composeDoubleSubtitleText(cue.text, translated);
		}

		blocks.push(`${index + 1}\n${cue.timing}\n${escapeVttText(text)}`);
	});

	return `${blocks.join("\n\n")}\n`;
}

function composeDoubleSubtitleText(sourceText, translatedText) {
	return `${sourceText}\n${translatedText}`;
}

function buildStremioAddonPath(args) {
	const encodedId = encodeURIComponent(args.id);
	const encodedExtra = args.extra && Object.keys(args.extra).length
		? `/${encodeExtra(args.extra)}`
		: "";

	return `/subtitles/${encodeURIComponent(args.type)}/${encodedId}${encodedExtra}.json`;
}

function encodeExtra(extra) {
	return Object.entries(extra)
		.filter(([, value]) => value !== undefined && value !== null && value !== "")
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
		.join("&");
}

function cueTextForTranslation(cue) {
	return cleanCueText(cue.text.replace(/\n/g, " ")).trim();
}

function cleanCueText(text) {
	return text
		.replace(/\{\\[^}]+}/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function cleanTranslatedText(text) {
	return String(text || "")
		.replace(/[ \t]+/g, " ")
		.trim();
}

function escapeVttText(text) {
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function normalizeGoogleLanguage(language) {
	const aliases = {
		eng: "en",
		en: "en",
		ger: "de",
		deu: "de",
		de: "de",
		fre: "fr",
		fra: "fr",
		fr: "fr",
		spa: "es",
		es: "es",
		ita: "it",
		it: "it",
		por: "pt",
		pt: "pt"
	};
	const normalized = String(language || "").toLowerCase();

	return aliases[normalized] || normalized;
}

function normalizeStremioLanguage(language) {
	const aliases = {
		en: "eng",
		eng: "eng",
		de: "ger",
		deu: "ger",
		ger: "ger",
		fr: "fre",
		fra: "fre",
		fre: "fre",
		es: "spa",
		spa: "spa",
		it: "ita",
		ita: "ita",
		pt: "por",
		por: "por"
	};
	const normalized = String(language || "").toLowerCase();

	return aliases[normalized] || normalized;
}

function getBaseUrl() {
	return process.env.ADDON_BASE_URL || `http://127.0.0.1:${DEFAULT_PORT}`;
}

function hashKey(value) {
	return crypto
		.createHash("sha1")
		.update(JSON.stringify(value))
		.digest("hex")
		.slice(0, 24);
}

module.exports = {
	getGeneratedSubtitle,
	getSubtitleOptions
};
