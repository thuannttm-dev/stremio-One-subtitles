const DEEPL_FREE_API_URL = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_API_URL = "https://api.deepl.com/v2/translate";

async function translateDeepLBatch(texts, config) {
    const apiKey = config.deeplApiKey || process.env.DEEPL_API_KEY;
    if (!apiKey) {
        throw new Error("DEEPL_API_KEY is required when using the DeepL translation provider");
    }

    const response = await fetch(deeplApiUrl(apiKey), {
        body: JSON.stringify({
            source_lang: config.deeplSourceLanguage,
            split_sentences: "0",
            target_lang: config.deeplTargetLanguage,
            text: texts,
        }),
        headers: {
            Authorization: `DeepL-Auth-Key ${apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "stremio-addon-doublesubtitles",
        },
        method: "POST",
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(json.message || `${response.status} ${response.statusText}`);
    }

    if (!Array.isArray(json.translations)) {
        throw new Error("DeepL response did not include translations");
    }

    return json.translations.map((translation) => translation.text);
}

function deeplApiUrl(apiKey) {
    if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL;
    return apiKey.endsWith(":fx") ? DEEPL_FREE_API_URL : DEEPL_PRO_API_URL;
}

module.exports = {
    deeplApiUrl,
    translateDeepLBatch,
};
