const { MemoryCache } = require("memory-cache-node");

// Cấu hình lưu cache nguyên bản của addon
const cache = new MemoryCache(60, 100);

class GeneratedSubtitleCache {
  async get(key) {
    return cache.get(key);
  }

  async set(key, value) {
    return cache.set(key, value);
  }
}

module.exports = new GeneratedSubtitleCache();
