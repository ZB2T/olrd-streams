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

    function login(password) {
        if (!available() || !root.fetch) { return Promise.resolve({ unreachable: true }); }
        var url = base() + "/rest/v1/rpc/admin_login";
        return root.fetch(url, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ p_password: password })
        }).then(function (r) {
            if (!r || !r.ok) { return { unreachable: true }; }
            return r.json().then(function (key) {
                if (typeof key === "string" && key) { return { ok: true, key: key }; }
                return { ok: false };
            });
        }).catch(function () { return { unreachable: true }; });
    }

    function setPassword(key, newPass) {
        if (!available() || !root.fetch) { return Promise.resolve(false); }
        var url = base() + "/rest/v1/rpc/admin_set_password";
        return root.fetch(url, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ p_key: key, p_new: newPass })
        }).then(function (r) {
            return r && r.ok ? r.json() : false;
        }).then(function (v) { return v === true; })
            .catch(function () { return false; });
    }

    function saveBookFile(key, id, name, mime, data) {
        if (!available() || !root.fetch || !key) { return Promise.resolve(false); }
        var url = base() + "/rest/v1/rpc/save_book_file";
        return root.fetch(url, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ p_key: key, p_id: id, p_name: name, p_mime: mime, p_data: data })
        }).then(function (r) {
            return r && r.ok ? r.json() : false;
        }).then(function (v) { return v === true; })
            .catch(function () { return false; });
    }

    function deleteBookFile(key, id) {
        if (!available() || !root.fetch || !key) { return Promise.resolve(false); }
        var url = base() + "/rest/v1/rpc/delete_book_file";
        return root.fetch(url, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ p_key: key, p_id: id })
        }).then(function (r) {
            return r && r.ok ? r.json() : false;
        }).then(function (v) { return v === true; })
            .catch(function () { return false; });
    }

    function fetchBookFile(id) {
        if (!available() || !root.fetch || !id) { return Promise.resolve(null); }
        var url = base() + "/rest/v1/book_files?id=eq." + encodeURIComponent(id) + "&select=data,mime,name";
        return root.fetch(url, { headers: headers(), cache: "no-store" })
            .then(function (r) { return r && r.ok ? r.json() : null; })
            .then(function (rows) { return (rows && rows[0]) ? rows[0] : null; })
            .catch(function () { return null; });
    }

    root.OLRD = root.OLRD || {};
    root.OLRD.sync = {
        available: available,
        fetchContent: fetchContent,
        publish: publish,
        login: login,
        setPassword: setPassword,
        saveBookFile: saveBookFile,
        deleteBookFile: deleteBookFile,
        fetchBookFile: fetchBookFile
    };

})(typeof self !== "undefined" ? self : this);
