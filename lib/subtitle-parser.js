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
		const text = translated && translated !== cue.text
			? `${cue.text}\n${translated}`
			: translated || cue.text;

		blocks.push(`${index + 1}\n${cue.timing}\n${escapeVttText(text)}`);
	});

	return `${blocks.join("\n\n")}\n`;
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
