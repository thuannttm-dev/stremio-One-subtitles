const form = document.getElementById("configForm");
const source = document.getElementById("sourceLang");
const target = document.getElementById("targetLang");
const manifestLink = document.getElementById("manifestLink");
const copyButton = document.getElementById("copyManifest");
const copyStatus = document.getElementById("copyStatus");

function manifestUrl() {
    return `${location.origin}/configure/${encodeURIComponent(source.value)}/${encodeURIComponent(target.value)}/manifest.json`;
}

function updateLink() {
    const url = manifestUrl();
    manifestLink.href = url;
    manifestLink.textContent = url;
    copyStatus.textContent = "";
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    location.href = manifestUrl().replace(/^http:\/\//, "stremio://");
});

copyButton.addEventListener("click", async () => {
    try {
        await copyText(manifestUrl());
        copyStatus.textContent = "Copied";
    } catch {
        copyStatus.textContent = "Copy failed";
    }
});

source.addEventListener("change", updateLink);
target.addEventListener("change", updateLink);
updateLink();

async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
    }
}
