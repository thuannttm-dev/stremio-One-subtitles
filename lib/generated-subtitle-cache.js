const cache = new Map();

class GeneratedSubtitleCache {
  async get(key) {
    return cache.get(key);
  }

  async set(key, value) {
    return cache.set(key, value);
  }
}

module.exports = new GeneratedSubtitleCache();
