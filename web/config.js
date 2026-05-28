const form = document.getElementById("configForm");
const source = document.getElementById("sourceLang");
const target = document.getElementById("targetLang");
const deeplApiKey = document.getElementById("deeplApiKey");
const deeplKeyField = document.getElementById("deeplKeyField");
const copyButton = document.getElementById("copyManifest");
const openStremioWebButton = document.getElementById("openStremioWeb");
const copyStatus = document.getElementById("copyStatus");

function manifestUrl() {
    const baseUrl = `${location.origin}/configure/${encodeURIComponent(source.value)}/${encodeURIComponent(target.value)}`;
    if (selectedProvider() !== "deepl") return `${baseUrl}/manifest.json`;

    return `${baseUrl}/deepl/${encodeProviderKey(deeplApiKey.value.trim())}/manifest.json`;
}

function stremioWebUrl() {
    return `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl())}`;
}

function updateView() {
    deeplKeyField.hidden = selectedProvider() !== "deepl";
    copyStatus.textContent = "";
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateConfig()) return;

    location.href = manifestUrl().replace(/^https?:\/\//, "stremio://");
});

copyButton.addEventListener("click", async () => {
    if (!validateConfig()) return;

    try {
        await copyText(manifestUrl());
        copyStatus.textContent = "Copied";
    } catch {
        copyStatus.textContent = "Copy failed";
    }
});

openStremioWebButton.addEventListener("click", () => {
    if (!validateConfig()) return;

    location.href = stremioWebUrl();
});

source.addEventListener("change", updateView);
target.addEventListener("change", updateView);
deeplApiKey.addEventListener("input", updateView);
document.querySelectorAll("input[name='translationProvider']").forEach((input) => {
    input.addEventListener("change", updateView);
});
updateView();

function selectedProvider() {
    return document.querySelector("input[name='translationProvider']:checked").value;
}

function encodeProviderKey(value) {
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function validateConfig() {
    if (source.value === target.value) {
        copyStatus.textContent = "Choose different source and target languages";
        return false;
    }

    if (selectedProvider() === "deepl" && !deeplApiKey.value.trim()) {
        copyStatus.textContent = "Enter DeepL API key";
        return false;
    }

    return true;
}

async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
    }
}
