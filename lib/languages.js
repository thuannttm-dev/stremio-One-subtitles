const LANGUAGES = [
	{ code: "de", label: "German" },
	{ code: "en", label: "English" },
	{ code: "fr", label: "French" },
	{ code: "es", label: "Spanish" },
	{ code: "it", label: "Italian" },
	{ code: "pt", label: "Portuguese" },
	{ code: "nl", label: "Dutch" },
	{ code: "sv", label: "Swedish" },
	{ code: "tr", label: "Turkish" },
	{ code: "pl", label: "Polish" }
];

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

module.exports = {
	LANGUAGES,
	normalizeGoogleLanguage,
	normalizeStremioLanguage
};
