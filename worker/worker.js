const OWNER = "ZB2T";
const REPO = "olrd-streams";
const FILE_PATH = "assets/data.json";
const BRANCH = "main";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
};

function reply(obj, status) {
    return new Response(JSON.stringify(obj), {
        status: status,
        headers: { "Content-Type": "application/json", ...CORS }
    });
}

function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
}

function timingSafeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) { return false; }
    let diff = 0;
    for (let i = 0; i < a.length; i++) { diff |= a.charCodeAt(i) ^ b.charCodeAt(i); }
    return diff === 0;
}

function validData(d) {
    return d && typeof d === "object" && Array.isArray(d.streamers) && d.book && typeof d.book === "object";
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") { return new Response(null, { headers: CORS }); }
        if (request.method !== "POST") { return reply({ ok: false, error: "method" }, 405); }
        if (!env.GITHUB_TOKEN || !env.PUBLISH_KEY) { return reply({ ok: false, error: "worker not configured" }, 500); }

        let body;
        try { body = await request.json(); }
        catch (e) { return reply({ ok: false, error: "invalid request" }, 400); }

        if (!body || !timingSafeEqual(String(body.key || ""), env.PUBLISH_KEY)) {
            return reply({ ok: false, error: "unauthorized" }, 401);
        }
        if (!validData(body.data)) { return reply({ ok: false, error: "invalid data" }, 400); }

        const content = JSON.stringify(body.data, null, 2);
        const api = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH;
        const ghHeaders = {
            "Authorization": "Bearer " + env.GITHUB_TOKEN,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "olrd-publisher"
        };

        let sha;
        const current = await fetch(api + "?ref=" + BRANCH, { headers: ghHeaders });
        if (current.ok) {
            const meta = await current.json();
            sha = meta.sha;
        } else if (current.status !== 404) {
            const txt = await current.text();
            return reply({ ok: false, error: "github read " + current.status, detail: txt.slice(0, 160) }, 502);
        }

        const put = await fetch(api, {
            method: "PUT",
            headers: { ...ghHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Update roster & book via admin panel",
                content: toBase64(content),
                branch: BRANCH,
                sha: sha
            })
        });

        if (!put.ok) {
            const txt = await put.text();
            return reply({ ok: false, error: "github write " + put.status, detail: txt.slice(0, 160) }, 502);
        }

        return reply({ ok: true }, 200);
    }
};
