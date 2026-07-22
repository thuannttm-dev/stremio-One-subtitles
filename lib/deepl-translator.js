const { fetchWithTimeout } = require("./http-client");

async function translateDeepLBatch(texts, config) {
  const apiKey = config.deeplApiKey || process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("Cần nhập Gemini API Key!");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const promptText = `Bạn là dịch giả phụ đề phim chuyên nghiệp.
Hãy dịch danh sách phụ đề sau sang tiếng Việt.
Yêu cầu bắt buộc:
1. Trả về ĐÚNG 1 mảng JSON chứa các chuỗi đã dịch theo đúng thứ tự.
2. Không thêm bớt câu, không tự ý gộp câu.
3. KHÔNG thêm bất kỳ lời mở đầu, kết bài hay định dạng markdown nào ngoài mảng JSON.

Danh sách câu:
${JSON.stringify(texts)}`;

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
      throw new Error(json.error?.message || `Lỗi Gemini API: ${response.status}`);
    }

    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Gemini không trả về kết quả dịch");
    }

    const translatedArray = JSON.parse(rawText);
    return translatedArray;
  } catch (err) {
    console.error("Lỗi dịch Gemini:", err);
    throw err;
  }
}

module.exports = { translateDeepLBatch };
