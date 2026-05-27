const form = document.getElementById("configForm");
const source = document.getElementById("sourceLang");
const target = document.getElementById("targetLang");
const manifestLink = document.getElementById("manifestLink");

function manifestUrl() {
    return `${location.origin}/configure/${encodeURIComponent(source.value)}/${encodeURIComponent(target.value)}/manifest.json`;
}

function updateLink() {
    const url = manifestUrl();
    manifestLink.href = url;
    manifestLink.textContent = url;
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    location.href = manifestUrl().replace(/^http:\/\//, "stremio://");
});

source.addEventListener("change", updateLink);
target.addEventListener("change", updateLink);
updateLink();
