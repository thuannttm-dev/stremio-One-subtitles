const { addonBuilder } = require("stremio-addon-sdk")

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
}
const builder = new addonBuilder(manifest)

builder.defineSubtitlesHandler(({type, id, extra}) => {
	console.log("request for subtitles: "+type+" "+id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineSubtitlesHandler.md
	return Promise.resolve({ subtitles: [] })
})

module.exports = builder.getInterface()