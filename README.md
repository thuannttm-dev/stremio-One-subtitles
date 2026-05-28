# Stremio Double Subtitles

Fetches subtitles from the public Stremio OpenSubtitles v3 addon, translates them with `googletrans` or DeepL, merges them together and serves generated WebVTT subtitles to Stremio. No OpenSubtitles or Google Translate credentials are required.

![Screenshot of web interface](img/screenshot.webp "Stremio with double subtitles")

## Setup

Install dependencies:

```bash
pnpm install
```

Open the local web interface and choose the source and target languages:

```text
http://127.0.0.1:53100/
```

The generated subtitle is one double subtitle: source language on top, translated language on the bottom.

## Run

```bash
pnpm start -- --launch
```

The local manifest URL is:

```text
http://127.0.0.1:53100/manifest.json
```

## Self-host

### Docker

```bash
docker run -p 53100:53100 ghcr.io/awerks/stremio-double-subtitles:latest
```

then open the local web interface:
