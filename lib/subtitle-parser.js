const { parseSync, stringifySync } = require("subtitle");

function parseSubtitleCues(text) {
	return parseSync(text)
		.filter((node) => node.type === "cue" && node.data && node.data.text)
		.map((node) => ({
			start: node.data.start,
			end: node.data.end,
			settings: node.data.settings,
			text: cleanCueText(node.data.text)
		}))
		.filter((cue) => cue.text);
}

function composeVtt(cues, translations) {
	const nodes = cues.map((cue, index) => {
		const translated = translations[index];
		const text = translated && translated !== cue.text
			? `${cue.text}\n${translated}`
			: translated || cue.text;

		return {
			type: "cue",
			data: {
				start: cue.start,
				end: cue.end,
				text: escapeVttText(text),
				...(cue.settings ? { settings: cue.settings } : {})
			}
		};
	});

	return stringifySync(nodes, { format: "WebVTT" });
}

function cueTextForTranslation(cue) {
	return cleanCueText(cue.text.replace(/\n/g, " ")).trim();
}

function cleanCueText(text) {
	return String(text || "")
		.replace(/\{\\[^}]+}/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function escapeVttText(text) {
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

module.exports = {
	composeVtt,
	cueTextForTranslation,
	parseSubtitleCues
};
