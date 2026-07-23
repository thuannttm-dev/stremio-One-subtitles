// Bỏ qua toàn bộ bộ nhớ đệm (Cache Disabled)
class GeneratedSubtitleCache {
  async get(key) {
    return null; // Luôn trả về null để bắt buộc hệ thống dịch mới
  }

  async set(key, value) {
    return; // Không lưu bất kỳ cái gì vào bộ nhớ đệm
  }
}

module.exports = new GeneratedSubtitleCache();
