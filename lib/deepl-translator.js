const { GoogleGenerativeAI } = require("@google/generative-ai");

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

  // Khởi tạo SDK chuẩn của Google
  const genAI = new GoogleGenerativeAI(apiKey);
  // Dùng model 1.5-flash hoặc 1.5-pro chuẩn SDK
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Gom 80 câu/lần gọi
  const chunks = chunkArray(texts, 80);
  let allTranslated = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (i > 0) {
      await delay(1500); // Nghỉ 1.5s giữa các lần gọi để tránh rate limit
    }

    const prompt = `Bạn là một dịch giả phim chuyên nghiệp. Hãy dịch danh sách phụ đề sau sang tiếng Việt mượt mà, tự nhiên, xưng hô đúng ngữ cảnh phim. 
CHỈ TRẢ VỀ DẠNG MẢNG JSON DẠNG NGUYÊN BẢN KHÔNG KÈM GIẢI THÍCH (Ví dụ: ["Câu 1", "Câu 2"]):
${JSON.stringify(chunk)}`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Xử lý chuỗi JSON trả về từ Gemini
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length === chunk.length) {
        allTranslated = allTranslated.concat(parsed);
      } else {
        console.error(" Gemini trả về sai số lượng dòng, giữ nguyên bản gốc chunk này.");
        allTranslated = allTranslated.concat(chunk);
      }
    } catch (error) {
      console.error("Lỗi Gemini API SDK:", error);
      allTranslated = allTranslated.concat(chunk);
    }
  }

  return allTranslated;
}

module.exports = { translateDeepLBatch };
