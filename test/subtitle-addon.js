const assert = require("assert");
const { once } = require("events");
const { getJson, getText } = require("./helpers/http");

describe("live configured subtitle addon", function () {
	let server;
	let baseUrl;
	let generatedSubtitleUrl;
	let generatedVtt;

	before(async function () {
		this.timeout(10000);
		const { createApp } = require("../server");
		server = createApp().listen(0, "127.0.0.1");
		await once(server, "listening");
		baseUrl = `http://127.0.0.1:${server.address().port}`;
		process.env.ADDON_BASE_URL = baseUrl;
	});

	after(async function () {
		delete process.env.ADDON_BASE_URL;

		if (server) {
			server.close();
			await once(server, "close");
		}
	});

	it("serves configured manifests for different language pairs", async function () {
		const frenchManifest = await getJson(`${baseUrl}/configure/de/fr/manifest.json`);
		assert.equal(frenchManifest.name, "double-subtitles de->fr");
		assert.match(frenchManifest.description, /de subtitles with fr translation/);

		const portugueseManifest = await getJson(`${baseUrl}/configure/de/pt-BR/manifest.json`);
		assert.equal(portugueseManifest.name, "double-subtitles de->pt-BR");
		assert.match(portugueseManifest.description, /de subtitles with pt-BR translation/);
	});

	it("maps configured target language to Stremio subtitle language code", async function () {
		const subtitlesResponse = await getJson(
			`${baseUrl}/configure/de/pt-BR/subtitles/series/tt0428167%3A1%3A1/filename=Stromberg.S01E01.Der.Parkplatz.GERMAN.DVDRIP.ENGSUB.mkv&videoSize=242521670.json`,
		);

		assert.ok(subtitlesResponse.subtitles.length > 0, "expected at least one German subtitle");
		assert.equal(subtitlesResponse.subtitles[0].lang, "pob");
		assert.match(subtitlesResponse.subtitles[0].id, /-to-pob$/);
	});

	it("uses Stremio OpenSubtitles and googletrans services", async function () {
		this.timeout(90000);

		const subtitlesResponse = await getJson(
			`${baseUrl}/configure/de/fr/subtitles/series/tt0428167%3A1%3A1/filename=Stromberg.S01E01.Der.Parkplatz.GERMAN.DVDRIP.ENGSUB.mkv&videoSize=242521670.json`,
		);
		assert.ok(subtitlesResponse.subtitles.length > 0, "expected at least one German subtitle");
		assert.equal(subtitlesResponse.subtitles[0].lang, "fre");
		generatedSubtitleUrl = subtitlesResponse.subtitles[0].url;

		generatedVtt = await getText(generatedSubtitleUrl);
		assert.match(generatedVtt, /^WEBVTT/);
		assert.match(generatedVtt, /Büro/);
		assert.match(generatedVtt, /bureau/i);
	});

	it("serves the cached generated subtitle on repeated requests", async function () {
		if (!generatedSubtitleUrl || !generatedVtt) {
			this.skip();
		}

		const cachedVtt = await getText(generatedSubtitleUrl);
		assert.equal(cachedVtt, generatedVtt);
	});
});
