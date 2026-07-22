const { fetchWithTimeout } = require("./http-client");

// Hàm hỗ trợ chia mảng nhỏ (Batching) để tránh quá tải Token 1 lần gọi
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
    throw new Error("Cần nhập Gemini API Key!");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Chia nhỏ sub thành từng cụm 100 câu / 1 lần gọi (Rất an toàn cho Gemini)
  const chunks = chunkArray(texts, 100);
  let allTranslated = [];

  for (const chunk of chunks) {
    const promptText = `Bạn là dịch giả phụ đề phim chuyên nghiệp.
Hãy dịch danh sách phụ đề sau sang tiếng Việt.
Yêu cầu bắt buộc:
1. Trả về ĐÚNG 1 mảng JSON chứa các chuỗi đã dịch theo đúng thứ tự.
2. Không thêm bớt câu, không tự ý gộp câu.
3. KHÔNG thêm lời mở đầu, kết bài hay định dạng markdown.

Danh sách câu:
${JSON.stringify(chunk)}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Lỗi Gemini API Status:", response.status, json);
        // Nếu 1 cụm bị lỗi thì giữ nguyên tiếng Anh cụm đó chứ không crash cả phim
        allTranslated = allTranslated.concat(chunk);
        continue;
      }

      let rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Làm sạch chuỗi JSON nếu Gemini lỡ kèm markdown ```json ... ```
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const translatedChunk = JSON.parse(rawText);
      if (Array.isArray(translatedChunk)) {
        allTranslated = allTranslated.concat(translatedChunk);
      } else {
        allTranslated = allTranslated.concat(chunk);
      }
    } catch (err) {
      console.error("Lỗi xử lý cụm sub:", err);
      allTranslated = allTranslated.concat(chunk);
    }
  }

  return allTranslated;
}

module.exports = { translateDeepLBatch };
