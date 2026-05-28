const assert = require("assert");
const {
    clearGeneratedSubtitleCacheForTests,
    getCachedGeneratedSubtitle,
    setCachedGeneratedSubtitle,
    setRedisClientForTests,
} = require("../lib/generated-subtitle-cache");

describe("generated subtitle cache", function () {
    let previousTtl;

    beforeEach(function () {
        previousTtl = process.env.GENERATED_SUBTITLE_CACHE_TTL_SECONDS;
        process.env.GENERATED_SUBTITLE_CACHE_TTL_SECONDS = "60";
        clearGeneratedSubtitleCacheForTests();
    });

    afterEach(function () {
        restoreEnv("GENERATED_SUBTITLE_CACHE_TTL_SECONDS", previousTtl);
        clearGeneratedSubtitleCacheForTests();
    });

    it("stores generated subtitles in memory when redis is unavailable", async function () {
        setRedisClientForTests(null);

        await setCachedGeneratedSubtitle("abc", "WEBVTT\n\ncached");

        assert.deepEqual(await getCachedGeneratedSubtitle("abc"), {
            source: "memory",
            vtt: "WEBVTT\n\ncached",
        });
    });

    it("reads generated subtitles from redis and warms memory", async function () {
        const client = createFakeRedisClient();
        setRedisClientForTests(client);

        await setCachedGeneratedSubtitle("abc", "WEBVTT\n\nredis");
        clearGeneratedSubtitleCacheForTests();
        setRedisClientForTests(client);

        assert.deepEqual(await getCachedGeneratedSubtitle("abc"), {
            source: "redis",
            vtt: "WEBVTT\n\nredis",
        });
        assert.deepEqual(await getCachedGeneratedSubtitle("abc"), {
            source: "memory",
            vtt: "WEBVTT\n\nredis",
        });
    });

    it("does not fail requests when redis writes fail", async function () {
        setRedisClientForTests({
            async get() {
                return null;
            },
            async set() {
                throw new Error("redis unavailable");
            },
        });

        await setCachedGeneratedSubtitle("abc", "WEBVTT\n\nfallback");

        assert.deepEqual(await getCachedGeneratedSubtitle("abc"), {
            source: "memory",
            vtt: "WEBVTT\n\nfallback",
        });
    });
});

function createFakeRedisClient() {
    const values = new Map();

    return {
        async get(key) {
            return values.get(key) || null;
        },
        async set(key, value) {
            values.set(key, value);
        },
    };
}

function restoreEnv(name, value) {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}
