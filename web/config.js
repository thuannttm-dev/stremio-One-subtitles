const form = document.getElementById("configForm");
const source = document.getElementById("sourceLang");
const target = document.getElementById("targetLang");
const copyButton = document.getElementById("copyManifest");
const copyStatus = document.getElementById("copyStatus");

function manifestUrl() {
    return `${location.origin}/configure/${encodeURIComponent(source.value)}/${encodeURIComponent(target.value)}/manifest.json`;
}

function updateStatus() {
    copyStatus.textContent = "";
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    location.href = manifestUrl().replace(/^https:\/\//, "stremio://");
});

copyButton.addEventListener("click", async () => {
    try {
        await copyText(manifestUrl());
        copyStatus.textContent = "Copied";
    } catch {
        copyStatus.textContent = "Copy failed";
    }
});

source.addEventListener("change", updateStatus);
target.addEventListener("change", updateStatus);

async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
    }
}
