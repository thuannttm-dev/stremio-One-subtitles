// Tắt Cache an toàn: Luôn báo không tìm thấy trong cache
// mà không làm phá hỏng kiểu dữ liệu Buffer của Stremio
class GeneratedSubtitleCache {
  async get(key) {
    return undefined; // Trả về undefined để code hiểu là chưa có cache và đi dịch mới
  }

  async set(key, value) {
    return; // Bỏ qua không lưu
  }
}

module.exports = new GeneratedSubtitleCache();
