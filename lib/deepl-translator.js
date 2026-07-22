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

  // Đổi sang model Gemini 1.5 Pro chuyên sâu ngữ cảnh
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

  // Chia nhỏ sub thành cụm 60 câu để Pro tập trung xử lý câu từ mượt nhất
  const chunks = chunkArray(texts, 60);
  let allTranslated = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Tạo độ trễ 2.5s tránh dính Rate Limit trên Free Tier
    if (i > 0) {
      await delay(2500);
    }

    const requestBody = {
      // Thiết lập vai trò hệ thống cho Gemini Pro
      system_instruction: {
        parts: [
          {
            text: "Bạn là một biên dịch viên phụ đề phim điện ảnh xuất sắc. Nhiệm vụ của bạn là Việt hóa lời thoại từ tiếng Anh sang tiếng Việt mượt mà, tự nhiên, đúng sắc thái tâm lý nhân vật và văn hóa giao tiếp thực tế. Tuyệt đối không dịch thô/dịch đuổi theo từng từ."
          }
        ]
      },
      contents: [
        {
          parts: [
            {
              text: `Hãy dịch danh sách phụ đề sau sang tiếng Việt chuẩn văn phong phim chiếu rạp.

YÊU CẦU ĐỊNH DẠNG BẮT BỘC:
1. Trả về ĐÚNG 1 mảng JSON chứa các câu đã dịch theo đúng thứ tự.
2. Không thêm/bớt số lượng câu trong mảng.
3. Không gửi kèm giải thích, không dùng định dạng markdown block.

Danh sách câu thoại:
${JSON.stringify(chunk)}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3 // Giúp văn phong ổn định, không bị sáng tạo lung tung
      }
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const json = await response.json();

      if (!response.ok) {
        console.error("Lỗi Gemini Pro API:", json);
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
