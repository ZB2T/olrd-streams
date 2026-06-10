(function (root) {
    "use strict";

    var doc = root.document;
    var grid = null;
    var ready = false;

    function ui() { return root.OLRD.ui; }
    function t(key, vars) { return root.OLRD.i18n.t(key, vars); }

    function host() {
        return root.location.hostname || "localhost";
    }

    function card(streamer, index) {
        var name = ui().escapeHtml(streamer.username);
        var label = name.toUpperCase();
        var ordinal = (index + 1 < 10 ? "0" : "") + (index + 1);
        var frame = "";
        if (ready) {
            frame = '<iframe src="https://player.kick.com/' + name +
                '?muted=true&autoplay=false&parent=' + host() +
                '" allowfullscreen scrolling="no" loading="lazy" title="' + label + '"></iframe>';
        }
        return '' +
            '<a class="stream-card" href="https://kick.com/' + name + '" target="_blank" rel="noopener" data-reveal style="transition-delay:' + (index % 6) * 60 + 'ms">' +
                '<span class="stream-card__index">' + ordinal + '</span>' +
                '<div class="stream-card__frame">' +
                    '<div class="stream-card__offline">' +
                        '<img class="stream-card__art" src="assets/logo.png" alt="" draggable="false">' +
                        '<span class="stream-card__offline-tag">' + ui().escapeHtml(t("card.standby")) + '</span>' +
                    '</div>' +
                    frame +
                    '<span class="stream-card__guard"></span>' +
                '</div>' +
                '<div class="stream-card__bar">' +
                    '<span class="stream-card__platform">KICK</span>' +
                    '<span class="stream-card__name">' + label + '</span>' +
                    '<span class="stream-card__status">' + ui().escapeHtml(t("card.enter")) + '</span>' +
                '</div>' +
            '</a>';
    }

    function render() {
        if (!grid) { return; }
        var streamers = root.OLRD.store.getStreamers();
        if (!streamers.length) {
            grid.innerHTML = '<div class="grid-empty">' + ui().escapeHtml(t("empty.streamers")) + '</div>';
            updateCount(0);
            return;
        }
        grid.innerHTML = streamers.map(card).join("");
        updateCount(streamers.length);
        ui().mountReveal();
    }

    function updateCount(n) {
        var node = ui().$("[data-roster-count]");
        if (node) {
            node.textContent = (n < 10 ? "0" : "") + n;
        }
    }

    function boot() {
        grid = ui().$("#stream-grid");
        if (!grid) { return; }
        render();
        root.OLRD.store.subscribe(render);
        root.OLRD.i18n.subscribe(render);
        root.setTimeout(function () {
            ready = true;
            render();
        }, 1400);
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
