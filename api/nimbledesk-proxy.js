// /api/nimbledesk-proxy.js  (Vercel Serverless Function)
export default async function handler(req, res) {
    // --- CORS headers (set this to your real domain when live) ---
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    try {
        const GAS_ENDPOINT = process.env.GAS_ENDPOINT; // e.g. https://script.google.com/macros/s/XXX/exec
        if (!GAS_ENDPOINT) {
            return res.status(500).json({ ok: false, message: "GAS_ENDPOINT not set" });
        }

        // Forward the raw body to GAS. Use text/plain to keep GAS happy.
        const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

        const gasRes = await fetch(GAS_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: payload,
        });

        const text = await gasRes.text();
        // Try parse; if it’s not JSON, wrap it
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { ok: gasRes.ok, raw: text };
        }

        return res.status(gasRes.status).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, message: String(err) });
    }
}
