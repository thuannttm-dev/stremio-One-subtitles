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

  // Sử dụng Gemini 2.5 Flash - Dòng model mới nhất dịch siêu mượt như Subtito
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Gom 80 câu/lần gọi
  const chunks = chunkArray(texts, 80);
  let allTranslated = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (i > 0) {
      await delay(2000);
    }

    const requestBody = {
      system_instruction: {
        parts: [
          {
            text: "Bạn là biên dịch viên phụ đề phim chiếu rạp. Hãy dịch lời thoại sang tiếng Việt mượt mà, tự nhiên, đúng ngữ cảnh giao tiếp đời thực, thoát ý linh hoạt và không dịch thô từng từ."
          }
        ]
      },
      contents: [
        {
          parts: [
            {
              text: `Dịch danh sách phụ đề sau sang tiếng Việt tự nhiên:

YÊU CẦU:
1. Trả về ĐÚNG 1 mảng JSON chứa các câu đã dịch theo đúng thứ tự.
2. Không thêm bớt câu, không giải thích, không dùng markdown.

${JSON.stringify(chunk)}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3
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
