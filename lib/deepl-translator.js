function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

// Hàm hỗ trợ thời gian chờ (nghỉ) giữa các lần gọi API để tránh dính Rate Limit
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateDeepLBatch(texts, config) {
  const apiKey = (config.deeplApiKey || process.env.DEEPL_API_KEY || "").trim();
  if (!apiKey) {
    console.error("Thiếu Gemini API Key!");
    return texts;
  }

  // Đường dẫn Model chuẩn cho Key Free
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Với Key Free: Gom 100 câu / 1 lần gọi để tối ưu số lượt gọi
  const chunks = chunkArray(texts, 100);
  let allTranslated = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Tạo độ trễ 2.5 giây giữa mỗi lần gửi để Key FREE không bao giờ bị Google chặn 15 req/phút
    if (i > 0) {
      await delay(2500);
    }

const promptText = `Bạn là một dịch giả phụ đề phim điện ảnh chuyên nghiệp.
Hãy dịch danh sách các câu phụ đề sau từ tiếng Anh sang tiếng Việt.

QUY TẮC DỊCH THUẬT BẮT BÚOC:
1. Văn phong tự nhiên, đời thường, mượt mà như thoại phim truyền hình/chiếu rạp.
2. Không dịch thô, không dịch từng từ (literal). Hãy thoát ý và dùng xưng hô phù hợp ngữ cảnh phim.
3. Giữ nguyên cấu trúc JSON: Trả về ĐÚNG 1 mảng JSON chứa các chuỗi đã dịch theo đúng thứ tự.
4. KHÔNG thêm bớt số lượng câu, KHÔNG gộp câu.
5. KHÔNG thêm bất kỳ lời giải thích hay định dạng markdown nào khác.

Danh sách câu thoại:
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
        console.error("Lỗi Gemini API Free:", json);
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
        console.error("Lỗi Parse JSON:", e);
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
