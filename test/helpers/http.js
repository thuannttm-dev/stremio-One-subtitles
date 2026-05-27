const http = require("http");

async function getJson(url) {
    return JSON.parse(await getText(url));
}

function getText(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (response) => {
            let body = "";

            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`${response.statusCode}: ${body}`));
                    return;
                }

                resolve(body);
            });
        }).on("error", reject);
    });
}

module.exports = {
    getJson,
    getText,
};
