const LANGUAGES = [
    { code: "sq", label: "Albanian", stremio: "alb" },
    { code: "ar", label: "Arabic", stremio: "ara" },
    { code: "eu", label: "Basque", stremio: "baq" },
    { code: "bn", label: "Bengali", stremio: "ben" },
    { code: "bs", label: "Bosnian", stremio: "bos" },
    { code: "bg", label: "Bulgarian", stremio: "bul" },
    { code: "ca", label: "Catalan", stremio: "cat" },
    { code: "zh-CN", label: "Chinese Simplified", stremio: "chi" },
    { code: "zh-TW", label: "Chinese Traditional", stremio: "zht" },
    { code: "hr", label: "Croatian", stremio: "hrv" },
    { code: "cs", label: "Czech", stremio: "cze" },
    { code: "da", label: "Danish", stremio: "dan" },
    { code: "nl", label: "Dutch", stremio: "dut" },
    { code: "en", label: "English", stremio: "eng" },
    { code: "et", label: "Estonian", stremio: "est" },
    { code: "fi", label: "Finnish", stremio: "fin" },
    { code: "fr", label: "French", stremio: "fre" },
    { code: "gl", label: "Galician", stremio: "glg" },
    { code: "ka", label: "Georgian", stremio: "geo" },
    { code: "de", label: "German", stremio: "ger" },
    { code: "el", label: "Greek", stremio: "ell" },
    { code: "he", label: "Hebrew", stremio: "heb" },
    { code: "hi", label: "Hindi", stremio: "hin" },
    { code: "hu", label: "Hungarian", stremio: "hun" },
    { code: "is", label: "Icelandic", stremio: "ice" },
    { code: "id", label: "Indonesian", stremio: "ind" },
    { code: "it", label: "Italian", stremio: "ita" },
    { code: "ja", label: "Japanese", stremio: "jpn" },
    { code: "ko", label: "Korean", stremio: "kor" },
    { code: "lv", label: "Latvian", stremio: "lav" },
    { code: "lt", label: "Lithuanian", stremio: "lit" },
    { code: "mk", label: "Macedonian", stremio: "mac" },
    { code: "ms", label: "Malay", stremio: "may" },
    { code: "no", label: "Norwegian", stremio: "nor" },
    { code: "fa", label: "Persian", stremio: "per" },
    { code: "pl", label: "Polish", stremio: "pol" },
    { code: "pt", label: "Portuguese", stremio: "por" },
    { code: "pt-BR", label: "Portuguese Brazilian", stremio: "pob" },
    { code: "ro", label: "Romanian", stremio: "rum" },
    { code: "ru", label: "Russian", stremio: "rus" },
    { code: "sr", label: "Serbian", stremio: "scc" },
    { code: "sk", label: "Slovak", stremio: "slo" },
    { code: "sl", label: "Slovenian", stremio: "slv" },
    { code: "es", label: "Spanish", stremio: "spa" },
    { code: "sv", label: "Swedish", stremio: "swe" },
    { code: "th", label: "Thai", stremio: "tha" },
    { code: "tr", label: "Turkish", stremio: "tur" },
    { code: "uk", label: "Ukrainian", stremio: "ukr" },
    { code: "ur", label: "Urdu", stremio: "urd" },
    { code: "vi", label: "Vietnamese", stremio: "vie" },
];

const GOOGLE_ALIASES = buildAliasMap("code");
const STREMIO_ALIASES = buildAliasMap("stremio");

Object.assign(GOOGLE_ALIASES, {
    alb: "sq",
    baq: "eu",
    chi: "zh-CN",
    cze: "cs",
    dut: "nl",
    ell: "el",
    fre: "fr",
    geo: "ka",
    ger: "de",
    ice: "is",
    jpn: "ja",
    lav: "lv",
    mac: "mk",
    may: "ms",
    per: "fa",
    pob: "pt-BR",
    por: "pt",
    rum: "ro",
    scc: "sr",
    slo: "sk",
    slv: "sl",
    spa: "es",
    swe: "sv",
    zht: "zh-TW",
    zhc: "zh-CN",
    zhe: "zh-CN",
});

Object.assign(STREMIO_ALIASES, {
    baq: "baq",
    cze: "cze",
    deu: "ger",
    dut: "dut",
    ell: "ell",
    fra: "fre",
    fre: "fre",
    gre: "ell",
    nld: "dut",
    ron: "rum",
    slo: "slo",
    spn: "spa",
    zho: "chi",
    zhc: "chi",
    zhe: "chi",
});

function normalizeGoogleLanguage(language) {
    const normalized = normalizeCode(language);

    return GOOGLE_ALIASES[normalized] || normalized;
}

function normalizeStremioLanguage(language) {
    const normalized = normalizeCode(language);

    return STREMIO_ALIASES[normalized] || normalized;
}

function buildAliasMap(targetProperty) {
    const aliases = {};

    for (const language of LANGUAGES) {
        aliases[normalizeCode(language.code)] = normalizeLanguageValue(language[targetProperty], targetProperty);
        aliases[normalizeCode(language.stremio)] = normalizeLanguageValue(language[targetProperty], targetProperty);
    }

    return aliases;
}

function normalizeLanguageValue(value, targetProperty) {
    if (targetProperty === "code") return value;
    return normalizeCode(value);
}

function normalizeCode(language) {
    return String(language || "")
        .trim()
        .toLowerCase();
}

module.exports = {
    LANGUAGES,
    normalizeGoogleLanguage,
    normalizeStremioLanguage,
};
