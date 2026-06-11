(function (root) {
    "use strict";

    var doc = root.document;

    function boot() {
        var splash = doc.getElementById("splash");
        var hub = doc.getElementById("intro");
        if (!hub) { return; }

        var reveal = function () {
            hub.classList.add("is-live");
        };

        if (!splash) { reveal(); return; }

        root.setTimeout(function () {
            splash.classList.add("is-gone");
            reveal();
            root.setTimeout(function () {
                if (splash && splash.parentNode) { splash.parentNode.removeChild(splash); }
            }, 950);
        }, 2200);
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
