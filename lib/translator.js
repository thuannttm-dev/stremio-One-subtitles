const googleTranslate = require("googletrans").default;
const { cueTextForTranslation } = require("./subtitle-parser");

async function translateCues(cues, config) {
	const translated = new Array(cues.length).fill("");
	let batch = [];
	let batchIndexes = [];
	let batchChars = 0;

	async function flushBatch() {
		if (!batch.length) return;

		const result = await translateBatch(batch, config);
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

async function translateBatch(texts, config) {
	try {
		const result = await googleTranslate(texts, {
			from: config.googleSourceLanguage,
			to: config.googleTargetLanguage
		});
		return result.textArray || [result.text];
	} catch (error) {
		if (texts.length === 1) throw error;

		const translated = [];
		for (const text of texts) {
			const result = await googleTranslate(text, {
				from: config.googleSourceLanguage,
				to: config.googleTargetLanguage
			});
			translated.push(result.text);
		}
		return translated;
	}
}

function cleanTranslatedText(text) {
	return String(text || "")
		.replace(/[ \t]+/g, " ")
		.trim();
}

module.exports = {
	translateCues
};
