(function (root) {
    "use strict";

    var doc = root.document;
    var TXT = "Created by ZB2T";
    var DISCORD = "https://discord.gg/wSGWmzDu";
    var X = "https://x.com/outlawrd";

    var ICON_DISCORD = '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>';
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
        if (!doc.querySelector("[data-brand-social]")) {
            var anchor = doc.querySelector(".lang-switch");
            if (anchor) {
                anchor.insertAdjacentHTML("beforebegin", socialBlock());
            } else {
                var top = doc.querySelector(".admin-top, .site-header, header");
                if (top) { top.insertAdjacentHTML("beforeend", socialBlock()); }
            }
        }
        var credit = doc.querySelector(".footer-credit");
        if (!credit) {
            var f = findFooter();
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
