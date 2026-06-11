(function (root) {
    "use strict";

    var doc = root.document;
    var grid = null;
    var rendered = [];

    function ui() { return root.OLRD.ui; }
    function t(key, vars) { return root.OLRD.i18n.t(key, vars); }

    function host() {
        return root.location.hostname || "localhost";
    }

    function formatViewers(n) {
        n = n || 0;
        if (n >= 1000) { return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K"; }
        return String(n);
    }

    function fetchStatus(username) {
        if (!root.fetch) { return Promise.resolve({ online: false, viewers: 0 }); }
        return root.fetch("https://kick.com/api/v2/channels/" + encodeURIComponent(username), { headers: { "Accept": "application/json" } })
            .then(function (r) { return r && r.ok ? r.json() : null; })
            .then(function (j) {
                if (!j) { return { online: false, viewers: 0 }; }
                var ls = j.livestream;
                return {
                    online: !!ls,
                    viewers: ls ? (ls.viewer_count || ls.viewers || 0) : 0
                };
            })
            .catch(function () { return { online: false, viewers: 0 }; });
    }

    function liveCard(streamer, index) {
        var name = ui().escapeHtml(streamer.username);
        var label = name.toUpperCase();
        var ordinal = (index + 1 < 10 ? "0" : "") + (index + 1);
        var frame = '<iframe src="https://player.kick.com/' + name +
            '?muted=true&autoplay=false&parent=' + host() +
            '" allowfullscreen scrolling="no" loading="lazy" title="' + label + '"></iframe>';
        return '' +
            '<a class="stream-card is-live" href="https://kick.com/' + name + '" target="_blank" rel="noopener" data-reveal>' +
                '<span class="stream-card__index">' + ordinal + '</span>' +
                '<span class="stream-card__live"><i></i>' + ui().escapeHtml(t("card.live")) + '</span>' +
                '<div class="stream-card__frame">' +
                    frame +
                    '<span class="stream-card__guard"></span>' +
                '</div>' +
                '<div class="stream-card__bar">' +
                    '<span class="stream-card__platform">KICK</span>' +
                    '<span class="stream-card__name">' + label + '</span>' +
                    '<span class="stream-card__status is-live">' + formatViewers(streamer.viewers) + ' ' + ui().escapeHtml(t("card.watching")) + '</span>' +
                '</div>' +
            '</a>';
    }

    function offlineCard(streamer, index) {
        var name = ui().escapeHtml(streamer.username);
        var label = name.toUpperCase();
        var ordinal = (index + 1 < 10 ? "0" : "") + (index + 1);
        return '' +
            '<a class="stream-card is-offline" href="https://kick.com/' + name + '" target="_blank" rel="noopener" data-reveal>' +
                '<span class="stream-card__index">' + ordinal + '</span>' +
                '<div class="stream-card__frame">' +
                    '<div class="stream-card__offline">' +
                        '<img class="stream-card__art" src="assets/logo.png" alt="" draggable="false">' +
                        '<span class="stream-card__offline-tag">' + ui().escapeHtml(t("card.offline")) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="stream-card__bar">' +
                    '<span class="stream-card__platform">KICK</span>' +
                    '<span class="stream-card__name">' + label + '</span>' +
                    '<span class="stream-card__status">' + ui().escapeHtml(t("card.closed")) + '</span>' +
                '</div>' +
            '</a>';
    }

    function paint() {
        if (!grid) { return; }
        if (!rendered.length) {
            grid.innerHTML = '<div class="grid-empty">' + ui().escapeHtml(t("empty.streamers")) + '</div>';
            updateCount(0, 0);
            return;
        }
        grid.innerHTML = rendered.map(function (s, i) {
            return s.online ? liveCard(s, i) : offlineCard(s, i);
        }).join("");
        var liveCount = rendered.filter(function (s) { return s.online; }).length;
        updateCount(rendered.length, liveCount);
        ui().mountReveal();
    }

    function updateCount(total, live) {
        var node = ui().$("[data-roster-count]");
        if (node) { node.textContent = (total < 10 ? "0" : "") + total; }
        var liveNode = ui().$("[data-live-count]");
        if (liveNode) { liveNode.textContent = live; }
    }

    function load() {
        if (!grid) { return; }
        var streamers = root.OLRD.store.getStreamers();
        if (!streamers.length) { rendered = []; paint(); return; }
        if (!rendered.length) {
            grid.innerHTML = '<div class="grid-empty grid-empty--scan">' + ui().escapeHtml(t("card.scanning")) + '</div>';
        }
        Promise.all(streamers.map(function (s) {
            return fetchStatus(s.username).then(function (st) {
                return { id: s.id, username: s.username, online: st.online, viewers: st.viewers };
            });
        })).then(function (list) {
            list.forEach(function (item, i) { item.order = i; });
            list.sort(function (a, b) {
                if (a.online !== b.online) { return a.online ? -1 : 1; }
                if (a.online && b.online) { return b.viewers - a.viewers; }
                return a.order - b.order;
            });
            rendered = list;
            paint();
        });
    }

    function boot() {
        grid = ui().$("#stream-grid");
        if (!grid) { return; }
        root.OLRD.store.init().then(function () {
            load();
            root.OLRD.store.startLiveSync();
        });
        root.OLRD.store.subscribe(load);
        root.OLRD.i18n.subscribe(paint);
        root.setInterval(load, 60000);
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
