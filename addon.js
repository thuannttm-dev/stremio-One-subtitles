const { addonBuilder } = require("stremio-addon-sdk");

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.doublesubtitles",
	"version": "0.0.1",
	"catalogs": [],
	"resources": [
		"subtitles"
	],
	"types": [
		"movie",
		"series"
	],
	"name": "double-subtitles",
	"description": "Double subtitles for Stremio"
};
const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(function (args) {
	console.log("subtitle request:", args);

	return Promise.resolve({
		subtitles: [
			{
				id: "double-subtitles-test-en",
				url: "https://mkvtoolnix.download/samples/vsshort-en.srt",
				lang: "eng"
			}
		]
	});
});

module.exports = builder.getInterface();
