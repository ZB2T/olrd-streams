(function (root) {
    "use strict";

    var DATA_KEY = "olrd.archive.v2";
    var PUBLISHED_URL = "assets/data.json";
    var listeners = [];
    var counter = 0;
    var published = null;
    var initPromise = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function uid(prefix) {
        counter += 1;
        var rand = (root.OLRD && root.OLRD.crypto) ? root.OLRD.crypto.randomHex(5) : "x";
        return prefix + "-" + rand + counter.toString(36);
    }

    function seedData() {
        var seed = (root.OLRD && root.OLRD.seed) ? root.OLRD.seed : { streamers: [], book: { title: "", author: "", subtitle: "", pages: [] } };
        return { v: 2, streamers: clone(seed.streamers), book: clone(seed.book) };
    }

    function normaliseBook(book) {
        if (!book || typeof book !== "object") { book = {}; }
        if (typeof book.title !== "string") { book.title = "Untitled"; }
        if (typeof book.author !== "string") { book.author = ""; }
        if (typeof book.subtitle !== "string") { book.subtitle = ""; }
        if (!Array.isArray(book.pages)) { book.pages = []; }
        return book;
    }

    function migrateLegacy(parsed) {
        if (parsed.book) { return parsed; }
        if (Array.isArray(parsed.books) && parsed.books.length) {
            var first = parsed.books[0];
            parsed.book = {
                title: first.title || "Untitled",
                author: first.author || "",
                subtitle: first.synopsis || "",
                pages: (first.chapters || []).map(function (c) {
                    return { id: uid("pg"), title: c.title || "", body: c.body || "" };
                })
            };
            delete parsed.books;
        }
        return parsed;
    }

    function base() {
        if (published) { return clone(published); }
        return seedData();
    }

    function normalise(parsed) {
        if (!Array.isArray(parsed.streamers)) { parsed.streamers = []; }
        parsed = migrateLegacy(parsed);
        parsed.book = normaliseBook(parsed.book);
        return parsed;
    }

    function init() {
        if (initPromise) { return initPromise; }
        initPromise = new Promise(function (resolve) {
            if (!root.fetch) { resolve(); return; }
            var done = false;
            var finish = function () { if (!done) { done = true; resolve(); } };
            root.fetch(PUBLISHED_URL, { cache: "no-store" })
                .then(function (r) { return r && r.ok ? r.json() : null; })
                .then(function (j) {
                    if (j && typeof j === "object" && Array.isArray(j.streamers)) {
                        published = normalise(j);
                    }
                    finish();
                })
                .catch(finish);
            root.setTimeout(finish, 6000);
        });
        return initPromise;
    }

    function read() {
        var raw;
        try { raw = root.localStorage.getItem(DATA_KEY); }
        catch (e) { return base(); }
        if (!raw) { return base(); }
        try {
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") { return base(); }
            return normalise(parsed);
        } catch (e) {
            return base();
        }
    }

    function write(state) {
        state.v = 2;
        try { root.localStorage.setItem(DATA_KEY, JSON.stringify(state)); }
        catch (e) { return false; }
        emit();
        return true;
    }

    function emit() {
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](); } catch (e) {}
        }
    }

    function sanitizeUsername(value) {
        return String(value || "").trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    }

    function getStreamers() { return read().streamers; }

    function setStreamers(list) {
        var state = read();
        state.streamers = list;
        return write(state);
    }

    function addStreamer(username) {
        var name = sanitizeUsername(username);
        if (!name) { return { ok: false, error: "empty" }; }
        var state = read();
        for (var i = 0; i < state.streamers.length; i++) {
            if (state.streamers[i].username === name) { return { ok: false, error: "duplicate" }; }
        }
        state.streamers.unshift({ id: uid("strm"), username: name, platform: "kick" });
        write(state);
        return { ok: true };
    }

    function removeStreamer(id) {
        var state = read();
        state.streamers = state.streamers.filter(function (s) { return s.id !== id; });
        return write(state);
    }

    function reorderStreamers(ids) {
        var state = read();
        var map = {};
        state.streamers.forEach(function (s) { map[s.id] = s; });
        var next = [];
        ids.forEach(function (id) { if (map[id]) { next.push(map[id]); delete map[id]; } });
        Object.keys(map).forEach(function (k) { next.push(map[k]); });
        state.streamers = next;
        return write(state);
    }

    function getBook() { return read().book; }

    function updateBookMeta(patch) {
        var state = read();
        ["title", "author", "subtitle"].forEach(function (key) {
            if (patch[key] !== undefined) { state.book[key] = patch[key]; }
        });
        return write(state);
    }

    function addPage() {
        var state = read();
        var page = { id: uid("pg"), title: "New Page", body: "" };
        state.book.pages.push(page);
        write(state);
        return page.id;
    }

    function updatePage(id, patch) {
        var state = read();
        var pages = state.book.pages;
        for (var i = 0; i < pages.length; i++) {
            if (pages[i].id === id) {
                if (patch.title !== undefined) { pages[i].title = patch.title; }
                if (patch.body !== undefined) { pages[i].body = patch.body; }
                return write(state);
            }
        }
        return false;
    }

    function removePage(id) {
        var state = read();
        state.book.pages = state.book.pages.filter(function (p) { return p.id !== id; });
        return write(state);
    }

    function reorderPages(ids) {
        var state = read();
        var map = {};
        state.book.pages.forEach(function (p) { map[p.id] = p; });
        var next = [];
        ids.forEach(function (id) { if (map[id]) { next.push(map[id]); delete map[id]; } });
        Object.keys(map).forEach(function (k) { next.push(map[k]); });
        state.book.pages = next;
        return write(state);
    }

    function snapshot() {
        return read();
    }

    function exportAll() {
        return JSON.stringify(read(), null, 2);
    }

    function importAll(text) {
        var parsed;
        try { parsed = JSON.parse(text); }
        catch (e) { return { ok: false, error: "invalid" }; }
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.streamers)) {
            return { ok: false, error: "shape" };
        }
        parsed = migrateLegacy(parsed);
        if (!parsed.book) { return { ok: false, error: "shape" }; }
        write({ v: 2, streamers: parsed.streamers, book: normaliseBook(parsed.book) });
        return { ok: true };
    }

    function resetAll() {
        try { root.localStorage.removeItem(DATA_KEY); } catch (e) {}
        emit();
        return true;
    }

    function subscribe(fn) {
        listeners.push(fn);
        return function () {
            listeners = listeners.filter(function (l) { return l !== fn; });
        };
    }

    function bindCrossTab() {
        if (!root.addEventListener) { return; }
        root.addEventListener("storage", function (event) {
            if (event.key === DATA_KEY) { emit(); }
        });
    }

    bindCrossTab();

    root.OLRD = root.OLRD || {};
    root.OLRD.store = {
        init: init,
        getStreamers: getStreamers,
        setStreamers: setStreamers,
        addStreamer: addStreamer,
        removeStreamer: removeStreamer,
        reorderStreamers: reorderStreamers,
        getBook: getBook,
        updateBookMeta: updateBookMeta,
        addPage: addPage,
        updatePage: updatePage,
        removePage: removePage,
        reorderPages: reorderPages,
        snapshot: snapshot,
        exportAll: exportAll,
        importAll: importAll,
        resetAll: resetAll,
        subscribe: subscribe,
        sanitizeUsername: sanitizeUsername
    };

})(typeof self !== "undefined" ? self : this);
