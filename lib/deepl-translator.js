function chunkArray(array, chunkSize) {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        results.push(array.slice(i, i + chunkSize));
    }
    return results;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateDeepLBatch(texts, config) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) return [];

    const apiKey = (config?.deeplApiKey || process.env.DEEPL_API_KEY || "").trim();
    if (!apiKey) {
        console.error("Thiếu Gemini API Key!");
        return texts;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const chunks = chunkArray(texts, 100);
    let allTranslated = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        if (i > 0) {
            await delay(1500);
        }

        try {
            const promptText = "Translate the following lines to Vietnamese. Maintain line order and original format exactly:\n" + chunk.join("\n");
            
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                const translatedLines = data.candidates[0].content.parts[0].text.trim().split("\n");
                allTranslated = allTranslated.concat(translatedLines);
            } else {
                console.error("Gemini Response Error:", data);
                allTranslated = allTranslated.concat(chunk);
            }
        } catch (err) {
            console.error("Gemini Fetch Error:", err);
            allTranslated = allTranslated.concat(chunk);
        }
    }

    return allTranslated;
}

module.exports = { translateDeepLBatch };
