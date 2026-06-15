/*
 * OLRD integrity guard — restores core page chrome (header / footer) if it is
 * deleted from the DOM. Deliberately reacts ONLY to removal, never to text or
 * attribute edits, so it never fights i18n language swaps or live data updates.
 * One debounced MutationObserver; negligible cost. (brand.js guards the credit;
 * the server-side CSP/headers block injection + framing — this is the visible
 * "you can't strip parts of the page" layer.)
 */
(function (root) {
    "use strict";
    var doc = root.document;
    if (!doc || !root.MutationObserver) { return; }

    var SELECTORS = [".site-header", ".site-footer", ".brand-footer"];
    var snaps = [];

    function snapshot() {
        for (var i = 0; i < SELECTORS.length; i++) {
            var el = doc.querySelector(SELECTORS[i]);
            if (el && el.parentNode) {
                snaps.push({
                    sel: SELECTORS[i],
                    html: el.outerHTML,
                    parent: el.parentNode,
                    next: el.nextElementSibling
                });
            }
        }
    }

    var pending = false;

    function restore() {
        pending = false;
        for (var i = 0; i < snaps.length; i++) {
            var s = snaps[i];
            if (doc.querySelector(s.sel)) { continue; }       // still present — leave it alone
            if (!s.parent || !s.parent.isConnected) { continue; }
            var tmp = doc.createElement("div");
            tmp.innerHTML = s.html;
            var node = tmp.firstElementChild;
            if (!node) { continue; }
            if (s.next && s.next.isConnected && s.next.parentNode === s.parent) {
                s.parent.insertBefore(node, s.next);
            } else {
                s.parent.appendChild(node);
            }
        }
    }

    function schedule() {
        if (pending) { return; }
        pending = true;
        root.setTimeout(restore, 300);
    }

    function boot() {
        snapshot();
        if (!snaps.length) { return; }
        new root.MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true });
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(typeof self !== "undefined" ? self : this);
