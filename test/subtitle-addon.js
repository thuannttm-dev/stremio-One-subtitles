const assert = require("assert");
const { once } = require("events");
const { getJson, getText } = require("./helpers/http");

describe("live configured subtitle addon", function () {
	let server;
	let baseUrl;

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

	it("uses real Stremio OpenSubtitles and googletrans services", async function () {
		this.timeout(90000);

		const subtitlesResponse = await getJson(
			`${baseUrl}/configure/de/fr/subtitles/series/tt0428167%3A1%3A1/filename=Stromberg.S01E01.Der.Parkplatz.GERMAN.DVDRIP.ENGSUB.mkv&videoSize=242521670.json`
		);
		assert.ok(subtitlesResponse.subtitles.length > 0, "expected at least one German subtitle");
		assert.equal(subtitlesResponse.subtitles[0].lang, "fre");

		const vtt = await getText(subtitlesResponse.subtitles[0].url);
		assert.match(vtt, /^WEBVTT/);
		assert.match(vtt, /Büro/);
		assert.match(vtt, /bureau/i);
	});
});
