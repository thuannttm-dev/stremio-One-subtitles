function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateDeepLBatch(texts, config) {
  const apiKey = (config.deeplApiKey || process.env.DEEPL_API_KEY || "").trim();
  if (!apiKey) {
    console.error("Thiếu Gemini API Key!");
    return texts;
  }

  // Cập nhật tên model mới nhất theo đúng yêu cầu từ Google
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Gom 100 câu/lần gọi để tiết kiệm request
  const chunks = chunkArray(texts, 100);
  let allTranslated = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (i > 0) {
      await delay(1500);
    }

    const prompt = `Bạn là dịch giả phim. Dịch mảng phụ đề sau sang tiếng Việt tự nhiên, xưng hô phù hợp. CHỈ TRẢ VỀ MẢNG JSON DẠNG NGUYÊN BẢN (VD: ["Câu 1", "Câu 2"]): ${JSON.stringify(chunk)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const responseText = data.candidates[0].content.parts[0].text;
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length === chunk.length) {
          allTranslated = allTranslated.concat(parsed);
        } else {
          allTranslated = allTranslated.concat(chunk);
        }
      } else {
        console.error("Lỗi Gemini API:", JSON.stringify(data));
        allTranslated = allTranslated.concat(chunk);
      }
    } catch (error) {
      console.error("Lỗi gọi Gemini API:", error);
      allTranslated = allTranslated.concat(chunk);
    }
  }

  return allTranslated;
}

module.exports = { translateDeepLBatch };
