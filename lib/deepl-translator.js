function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

async function translateDeepLBatch(texts, config) {
  const apiKey = (config.deeplApiKey || process.env.DEEPL_API_KEY || "").trim();
  if (!apiKey) {
    console.error("Thiếu Gemini API Key!");
    return texts;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Chia nhỏ sub thành từng cụm 80 câu để xử lý siêu nhanh và không bị lỗi quá tải
  const chunks = chunkArray(texts, 80);
  let allTranslated = [];

  for (const chunk of chunks) {
    const promptText = `Bạn là dịch giả phụ đề phim chuyên nghiệp.
Hãy dịch danh sách phụ đề sau sang tiếng Việt.
Yêu cầu bắt buộc:
1. Trả về ĐÚNG 1 mảng JSON chứa các chuỗi đã dịch theo đúng thứ tự.
2. Không thêm bớt câu, không tự ý gộp câu.
3. KHÔNG thêm lời mở đầu, kết bài hay bất kỳ định dạng markdown nào.

Danh sách câu:
${JSON.stringify(chunk)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const json = await response.json();

      if (!response.ok) {
        console.error("Lỗi Gemini API:", json);
        allTranslated = allTranslated.concat(chunk);
        continue;
      }

      let rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      try {
        const translatedChunk = JSON.parse(rawText);
        if (Array.isArray(translatedChunk) && translatedChunk.length === chunk.length) {
          allTranslated = allTranslated.concat(translatedChunk);
        } else {
          allTranslated = allTranslated.concat(chunk);
        }
      } catch (e) {
        console.error("Lỗi Parse JSON:", e, rawText);
        allTranslated = allTranslated.concat(chunk);
      }
    } catch (err) {
      console.error("Lỗi kết nối Gemini API:", err);
      allTranslated = allTranslated.concat(chunk);
    }
  }

  return allTranslated;
}

module.exports = { translateDeepLBatch };
