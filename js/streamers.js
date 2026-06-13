(function (root) {
    "use strict";

    var doc = root.document;
    var grid = null;
    var rendered = [];

    function ui() { return root.OLRD.ui; }
    function t(key, vars) { return root.OLRD.i18n.t(key, vars); }

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

    var unmutedName = null;
    var ICON_MUTED = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M11 4.5 6.2 8.5H3v7h3.2l4.8 4z"/><path d="M16.5 9.5l4 4m0-4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
    var ICON_SOUND = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M11 4.5 6.2 8.5H3v7h3.2l4.8 4z"/><path d="M15.5 8.7a4.5 4.5 0 0 1 0 6.6M18 6a8 8 0 0 1 0 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

    function setCardSound(uname, on) {
        var card = grid ? grid.querySelector('.stream-card[data-name="' + uname + '"]') : null;
        if (!card) { return; }
        var iframe = card.querySelector("iframe");
        if (iframe) { iframe.src = "https://player.kick.com/" + uname + "?autoplay=true&muted=" + (on ? "false" : "true"); }
        card.classList.toggle("has-sound", on);
        var btn = card.querySelector("[data-sound]");
        if (btn) { btn.classList.toggle("is-on", on); btn.innerHTML = on ? ICON_SOUND : ICON_MUTED; }
    }

    function toggleSound(uname) {
        if (unmutedName === uname) {
            setCardSound(uname, false);
            unmutedName = null;
        } else {
            if (unmutedName) { setCardSound(unmutedName, false); }
            setCardSound(uname, true);
            unmutedName = uname;
        }
    }

    function liveCard(streamer, index) {
        var uname = streamer.username;
        var name = ui().escapeHtml(uname);
        var label = name.toUpperCase();
        var ordinal = (index + 1 < 10 ? "0" : "") + (index + 1);
        var soundOn = (uname === unmutedName);
        var frame = '<iframe src="https://player.kick.com/' + name +
            '?autoplay=true&muted=' + (soundOn ? "false" : "true") + '" allowfullscreen scrolling="no" loading="lazy" title="' + label + '"></iframe>';
        return '' +
            '<a class="stream-card is-live' + (soundOn ? " has-sound" : "") + '" href="watch?c=' + name + '" data-reveal data-name="' + name + '">' +
                '<span class="stream-card__index">' + ordinal + '</span>' +
                '<span class="stream-card__live"><i></i>' + ui().escapeHtml(t("card.live")) + '</span>' +
                '<div class="stream-card__frame">' +
                    frame +
                    '<span class="stream-card__guard"></span>' +
                    '<button type="button" class="stream-card__sound' + (soundOn ? " is-on" : "") + '" data-sound="' + name + '" aria-label="' + ui().escapeHtml(t("card.sound")) + '" title="' + ui().escapeHtml(t("card.sound")) + '">' + (soundOn ? ICON_SOUND : ICON_MUTED) + '</button>' +
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
            '<a class="stream-card is-offline" href="watch?c=' + name + '" data-reveal data-name="' + name + '">' +
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
        grid.addEventListener("click", function (e) {
            var btn = e.target.closest ? e.target.closest("[data-sound]") : null;
            if (!btn) { return; }
            e.preventDefault();
            e.stopPropagation();
            toggleSound(btn.getAttribute("data-sound"));
        });
        root.OLRD.store.init().then(function () {
            root.OLRD.store.dropStaleDraft();
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
