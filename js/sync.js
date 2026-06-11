(function (root) {
    "use strict";

    function cfg() { return (root.OLRD && root.OLRD.config) || {}; }

    function base() { return String(cfg().supabaseUrl || "").replace(/\/+$/, ""); }

    function available() {
        var c = cfg();
        return !!(c.supabaseUrl && c.supabaseAnonKey);
    }

    function headers() {
        var key = cfg().supabaseAnonKey;
        return {
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json"
        };
    }

    function fetchContent() {
        if (!available() || !root.fetch) { return Promise.resolve(null); }
        var url = base() + "/rest/v1/site_content?id=eq.1&select=data";
        return root.fetch(url, { headers: headers(), cache: "no-store" })
            .then(function (r) { return r && r.ok ? r.json() : null; })
            .then(function (rows) {
                if (rows && rows[0] && rows[0].data && Array.isArray(rows[0].data.streamers)) {
                    return rows[0].data;
                }
                return null;
            })
            .catch(function () { return null; });
    }

    function publish(data, key) {
        if (!available()) { return Promise.resolve({ ok: false, error: "config" }); }
        if (!key) { return Promise.resolve({ ok: false, error: "key" }); }
        var url = base() + "/rest/v1/rpc/publish_content";
        return root.fetch(url, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ p_key: key, p_data: data })
        }).then(function (r) {
            return { ok: r.ok, status: r.status };
        }).catch(function () { return { ok: false }; });
    }

    root.OLRD = root.OLRD || {};
    root.OLRD.sync = {
        available: available,
        fetchContent: fetchContent,
        publish: publish
    };

})(typeof self !== "undefined" ? self : this);
