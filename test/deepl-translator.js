const assert = require("assert");
const { getSubtitleConfig } = require("../lib/config");
const { translateDeepLBatch } = require("../lib/deepl-translator");

describe("DeepL translator", function () {
    const originalFetch = global.fetch;

    afterEach(function () {
        delete process.env.DEEPL_API_KEY;
        delete process.env.DEEPL_API_URL;
        delete process.env.TRANSLATION_PROVIDER;
        global.fetch = originalFetch;
    });

    it("posts batches to DeepL", async function () {
        const config = getSubtitleConfig({ deeplApiKey: "secret:fx", sourceLang: "en", targetLang: "fr" });
        const requests = [];
        global.fetch = async (url, options) => {
            requests.push({ body: JSON.parse(options.body), headers: options.headers, url });
            return {
                ok: true,
                async json() {
                    return {
                        translations: [{ text: "Bonjour" }, { text: "Monde" }],
                    };
                },
            };
        };

        const translated = await translateDeepLBatch(["Hello", "World"], config);

        assert.deepEqual(translated, ["Bonjour", "Monde"]);
        assert.equal(requests[0].url, "https://api-free.deepl.com/v2/translate");
        assert.equal(requests[0].headers.Authorization, "DeepL-Auth-Key secret:fx");
        assert.deepEqual(requests[0].body.text, ["Hello", "World"]);
        assert.equal(requests[0].body.source_lang, "EN");
        assert.equal(requests[0].body.target_lang, "FR");
    });
});
