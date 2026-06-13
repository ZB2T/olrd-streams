(function (root) {
    "use strict";

    var doc = root.document;
    var TXT = "Created by ZB2T";
    var DISCORD = "https://discord.gg/wSGWmzDu";
    var X = "https://x.com/outlawrd";

    var ICON_DISCORD = '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M19.54 5.34A16.7 16.7 0 0 0 15.4 4l-.2.42c1.3.35 1.93.86 2.6 1.4a11.6 11.6 0 0 0-9.6 0c.67-.54 1.4-1.05 2.6-1.4L10.6 4a16.7 16.7 0 0 0-4.14 1.34C3.86 9.2 3.2 12.95 3.46 16.64A16.9 16.9 0 0 0 8.6 19.2l.66-.92c-.56-.2-1.14-.47-1.68-.83l.4-.3a11.9 11.9 0 0 0 10.04 0l.4.3c-.54.36-1.12.63-1.68.83l.66.92a16.9 16.9 0 0 0 5.14-2.56c.32-4.27-.74-7.99-2.0-11.3ZM9.3 14.5c-.8 0-1.46-.74-1.46-1.65 0-.9.64-1.65 1.46-1.65.82 0 1.48.75 1.46 1.65 0 .91-.65 1.65-1.46 1.65Zm5.4 0c-.8 0-1.46-.74-1.46-1.65 0-.9.64-1.65 1.46-1.65.82 0 1.48.75 1.46 1.65 0 .91-.64 1.65-1.46 1.65Z"/></svg>';
    var ICON_X = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>';

    function socialBlock() {
        return '<div class="brand-social" data-brand-social>' +
            '<a class="brand-social__link" href="' + DISCORD + '" target="_blank" rel="noopener" aria-label="Discord" title="Discord">' + ICON_DISCORD + '</a>' +
            '<a class="brand-social__link" href="' + X + '" target="_blank" rel="noopener" aria-label="X / Twitter" title="X">' + ICON_X + '</a>' +
        '</div>';
    }

    function findFooter() {
        var f = doc.querySelector("footer");
        if (!f) {
            f = doc.createElement("footer");
            f.className = "site-footer brand-footer";
            if (doc.body) { doc.body.appendChild(f); }
        }
        return f;
    }

    function ensure() {
        if (!doc.body) { return; }
        var f = findFooter();
        if (f && !doc.querySelector("[data-brand-social]")) {
            f.insertAdjacentHTML("afterbegin", socialBlock());
        }
        var credit = doc.querySelector(".footer-credit");
        if (!credit) {
            if (f) { f.insertAdjacentHTML("beforeend", '<span class="footer-credit">' + TXT + "</span>"); }
        } else if (credit.textContent.indexOf("ZB2T") === -1) {
            credit.textContent = TXT;
        }
    }

    function start() {
        ensure();
        try {
            var obs = new root.MutationObserver(function () { ensure(); });
            obs.observe(doc.documentElement, { childList: true, subtree: true, characterData: true });
        } catch (e) {}
        try { root.setInterval(ensure, 3000); } catch (e) {}
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})(typeof self !== "undefined" ? self : this);
