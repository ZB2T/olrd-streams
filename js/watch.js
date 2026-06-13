(function (root) {
    "use strict";

    var doc = root.document;

    function param(name) {
        var m = (root.location.search || "").match(new RegExp("[?&]" + name + "=([^&]+)"));
        return m ? decodeURIComponent(m[1]) : "";
    }

    function sanitize(value) {
        return String(value || "").trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    }

    function boot() {
        var channel = sanitize(param("c"));
        var player = doc.getElementById("watch-player");
        var nameEl = doc.getElementById("watch-name");
        var kick = doc.getElementById("watch-kick");
        var t = root.OLRD && root.OLRD.i18n ? root.OLRD.i18n.t : function (k) { return k; };

        if (!channel) {
            if (player) { player.innerHTML = '<div class="watch-empty">' + t("watch.none") + "</div>"; }
            return;
        }

        var label = channel.toUpperCase();
        if (nameEl) { nameEl.textContent = label; }
        if (kick) { kick.setAttribute("href", "https://kick.com/" + channel); }
        try { doc.title = label + " — OLRD STREAMERS"; } catch (e) {}

        if (player) {
            var iframe = doc.createElement("iframe");
            iframe.className = "watch-player__frame";
            iframe.setAttribute("src", "https://player.kick.com/" + channel + "?autoplay=true&muted=false");
            iframe.setAttribute("allowfullscreen", "");
            iframe.setAttribute("scrolling", "no");
            iframe.setAttribute("allow", "autoplay; fullscreen");
            iframe.setAttribute("title", label);
            player.innerHTML = "";
            player.appendChild(iframe);
        }
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
