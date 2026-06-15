/*
 * OLRD integrity guard.
 * Reverts client-side tampering (DevTools edits, console, HTML injection) of the site's
 * static branded chrome. Two layers:
 *   - containers (header / footers): re-inserted if removed wholesale.
 *   - leaves (brand text, nav, hero titles/eyebrows, hub tiles, footer text): any text or
 *     structural change is reverted within a fraction of a second.
 * It is i18n-AWARE — protected text is re-derived from the translation table, so switching
 * language (EN/AR) still works. Dynamic content (streamer grid, story-book pages, toasts,
 * atmosphere) is deliberately NOT frozen, so the app keeps working.
 *
 * Honest scope: a strong DETERRENT, not an absolute lock — client JS can always be disabled
 * by a determined user editing their OWN copy (affects only their screen). The durable layers
 * are the obfuscated build and server-side integrity (only your deploys change the real files).
 */
(function (root) {
    "use strict";
    var doc = root.document;
    if (!doc) { return; }

    var CONTAINERS = ".site-header, .site-footer, .brand-footer, .hub__footer";
    var LEAVES = ".brand__text, .nav-link, .hub__title, .hub__eyebrow, .hub-tile__label, " +
                 ".hub-tile__desc, .page-hero__title, .page-hero__eyebrow, .footer-credit, .footer-note";

    function t(key) {
        try { var v = root.OLRD.i18n.t(key); return (v && v !== key) ? v : null; } catch (e) { return null; }
    }

    function captureList(sel) {
        var arr = [];
        var nodes = doc.querySelectorAll(sel);
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!el.parentNode) { continue; }
            var it = { node: el, parent: el.parentNode, next: el.nextElementSibling, outer: el.outerHTML };
            var k = el.getAttribute("data-i18n");
            var hk = el.getAttribute("data-i18n-html");
            if (k) { it.mode = "text"; it.key = k; }
            else if (hk) { it.mode = "html"; it.key = hk; }
            else { it.mode = "html"; it.snap = el.innerHTML; }
            arr.push(it);
        }
        return arr;
    }

    var containers = [];
    var leaves = [];
    function capture() { containers = captureList(CONTAINERS); leaves = captureList(LEAVES); }

    function rebuild(outer) {
        var tmp = doc.createElement("div");
        tmp.innerHTML = outer;
        return tmp.firstElementChild;
    }

    function reinsert(it) {
        if (!it.parent || !it.parent.isConnected) { return false; }
        var fresh = rebuild(it.outer);
        if (!fresh) { return false; }
        if (it.next && it.next.isConnected && it.next.parentNode === it.parent) {
            it.parent.insertBefore(fresh, it.next);
        } else {
            it.parent.appendChild(fresh);
        }
        it.node = fresh;
        return true;
    }

    function enforce() {
        var restored = false;
        for (var i = 0; i < containers.length; i++) {
            var c = containers[i];
            if (!c.node || !c.node.isConnected) { if (reinsert(c)) { restored = true; } }
        }
        if (restored) { leaves = captureList(LEAVES); }   // refresh leaf refs after a container rebuild
        for (var j = 0; j < leaves.length; j++) {
            var it = leaves[j];
            if (!it.node || !it.node.isConnected) { reinsert(it); continue; }
            var want = it.key ? t(it.key) : it.snap;
            if (want == null) { continue; }
            if (it.mode === "text") {
                if (it.node.textContent !== want) { it.node.textContent = want; }
            } else if (it.node.innerHTML !== want) {
                it.node.innerHTML = want;
            }
        }
    }

    var pending = false;
    function schedule() {
        if (pending) { return; }
        pending = true;
        root.setTimeout(function () { pending = false; enforce(); }, 120);
    }

    function boot() {
        capture();
        if (root.MutationObserver) {
            new root.MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true, characterData: true });
        }
        root.setInterval(enforce, 800);
    }

    if (doc.readyState === "loading") { doc.addEventListener("DOMContentLoaded", boot); }
    else { boot(); }

    // Soft deterrent against casual inspection. Easily bypassed (browser menus, JS off),
    // so the auto-revert above is the real safety net — not this.
    doc.addEventListener("keydown", function (e) {
        var k = (e.key || "").toLowerCase();
        var mod = e.ctrlKey || e.metaKey;
        if (k === "f12" || (mod && e.shiftKey && (k === "i" || k === "j" || k === "c")) || (mod && k === "u")) {
            e.preventDefault();
        }
    }, true);

})(typeof self !== "undefined" ? self : this);
