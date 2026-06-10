(function (root) {
    "use strict";

    var doc = root.document;
    var stage = null;
    var state = { open: false, index: 0, turning: false };

    function ui() { return root.OLRD.ui; }
    function t(key, vars) { return root.OLRD.i18n.t(key, vars); }
    function book() { return root.OLRD.store.getBook(); }
    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function paragraphs(text) {
        var blocks = String(text || "").split(/\n{1,}/).filter(function (p) { return p.trim().length; });
        if (!blocks.length) { return '<p class="book-page__empty">' + ui().escapeHtml(t("book.emptyPage")) + "</p>"; }
        return blocks.map(function (p, i) {
            var cls = i === 0 ? ' class="book-page__lead"' : "";
            return "<p" + cls + ">" + ui().escapeHtml(p.trim()) + "</p>";
        }).join("");
    }

    function renderCover() {
        var b = book();
        var count = b.pages.length;
        var meta = count + " " + (count === 1 ? t("book.page") : t("book.pages"));
        stage.innerHTML = '' +
            '<div class="book-cover" data-reveal>' +
                '<div class="book-cover__art"></div>' +
                '<div class="book-cover__plate">' +
                    '<span class="book-cover__eyebrow">' + ui().escapeHtml(t("book.eyebrow")) + '</span>' +
                    '<h2 class="book-cover__title">' + ui().escapeHtml(b.title) + '</h2>' +
                    (b.subtitle ? '<p class="book-cover__sub">' + ui().escapeHtml(b.subtitle) + '</p>' : "") +
                    (b.author ? '<span class="book-cover__author">' + ui().escapeHtml(t("book.by")) + ' ' + ui().escapeHtml(b.author) + '</span>' : "") +
                    '<button type="button" class="btn book-cover__open" data-open-book>' + ui().escapeHtml(t("book.open")) + '</button>' +
                    '<span class="book-cover__meta">' + meta + '</span>' +
                '</div>' +
            '</div>';
        ui().mountReveal();
        var open = stage.querySelector("[data-open-book]");
        if (open) { open.addEventListener("click", openBook); }
    }

    function renderOpen() {
        var b = book();
        var tabs = b.pages.map(function (p, i) {
            return '<li><button type="button" class="book-toc__item' + (i === state.index ? " is-current" : "") + '" data-goto="' + i + '">' +
                '<span>' + pad(i + 1) + '</span>' + ui().escapeHtml(p.title) + "</button></li>";
        }).join("");
        stage.innerHTML = '' +
            '<div class="book-open">' +
                '<div class="book-open__bar">' +
                    '<button type="button" class="ghost-btn book-open__close" data-close-book>' + ui().escapeHtml(t("book.close")) + '</button>' +
                    '<span class="book-open__title">' + ui().escapeHtml(b.title) + '</span>' +
                    '<button type="button" class="ghost-btn book-open__toc-toggle" data-toc-toggle>' + ui().escapeHtml(t("book.contents")) + '</button>' +
                '</div>' +
                '<div class="book-open__body">' +
                    '<aside class="book-toc" data-toc><ol>' + (tabs || '<li class="book-toc__empty">' + ui().escapeHtml(t("book.emptyBook")) + "</li>") + '</ol></aside>' +
                    '<div class="book-spread">' +
                        '<div class="book-binding"></div>' +
                        '<article class="book-page" data-page></article>' +
                    '</div>' +
                '</div>' +
                '<div class="book-pager">' +
                    '<button type="button" class="book-pager__btn" data-turn="-1">' + turnLabel(-1) + '</button>' +
                    '<span class="book-pager__count" data-count></span>' +
                    '<button type="button" class="book-pager__btn" data-turn="1">' + turnLabel(1) + '</button>' +
                '</div>' +
            '</div>';
        bindOpen();
        renderPage();
    }

    function turnLabel(dir) {
        if (dir < 0) { return "← " + ui().escapeHtml(t("book.prev")); }
        return ui().escapeHtml(t("book.next")) + " →";
    }

    function renderPage() {
        var b = book();
        var pageEl = stage.querySelector("[data-page]");
        var countEl = stage.querySelector("[data-count]");
        if (!pageEl) { return; }
        if (!b.pages.length) {
            pageEl.innerHTML = '<div class="book-page__blank">' + ui().escapeHtml(t("book.emptyBook")) + "</div>";
            if (countEl) { countEl.textContent = ""; }
            return;
        }
        if (state.index >= b.pages.length) { state.index = b.pages.length - 1; }
        if (state.index < 0) { state.index = 0; }
        var page = b.pages[state.index];
        var n = pad(state.index + 1);
        var total = pad(b.pages.length);
        pageEl.innerHTML = '' +
            '<div class="book-page__sheet">' +
                '<span class="book-page__no">' + n + "</span>" +
                '<span class="book-page__mark">' + ui().escapeHtml(t("book.eyebrow")) + '</span>' +
                '<h3 class="book-page__title">' + ui().escapeHtml(page.title) + "</h3>" +
                '<div class="book-page__prose">' + paragraphs(page.body) + "</div>" +
                '<span class="book-page__folio">' + n + " / " + total + "</span>" +
                '<span class="book-page__ribbon"></span>' +
            "</div>";
        if (countEl) { countEl.textContent = n + " / " + total; }
        var tocItems = ui().$all(".book-toc__item", stage);
        tocItems.forEach(function (item, i) { item.classList.toggle("is-current", i === state.index); });
        var pager = ui().$all("[data-turn]", stage);
        if (pager[0]) { pager[0].disabled = state.index === 0; }
        if (pager[1]) { pager[1].disabled = state.index === b.pages.length - 1; }
    }

    function turn(dir) {
        var b = book();
        if (state.turning) { return; }
        var next = state.index + dir;
        if (next < 0 || next >= b.pages.length) { return; }
        var pageEl = stage.querySelector("[data-page]");
        if (!pageEl) { return; }
        state.turning = true;
        pageEl.classList.add(dir > 0 ? "is-turn-next" : "is-turn-prev");
        root.setTimeout(function () {
            state.index = next;
            renderPage();
            var fresh = stage.querySelector("[data-page]");
            if (fresh) {
                fresh.classList.remove("is-turn-next", "is-turn-prev");
                fresh.classList.add(dir > 0 ? "is-enter-next" : "is-enter-prev");
                root.setTimeout(function () {
                    fresh.classList.remove("is-enter-next", "is-enter-prev");
                    state.turning = false;
                }, 260);
            } else {
                state.turning = false;
            }
        }, 230);
    }

    function bindOpen() {
        stage.querySelector("[data-close-book]").addEventListener("click", closeBook);
        var tocToggle = stage.querySelector("[data-toc-toggle]");
        var toc = stage.querySelector("[data-toc]");
        if (tocToggle && toc) {
            tocToggle.addEventListener("click", function () { toc.classList.toggle("is-open"); });
        }
        ui().$all("[data-goto]", stage).forEach(function (item) {
            item.addEventListener("click", function () {
                var i = parseInt(item.getAttribute("data-goto"), 10) || 0;
                if (i === state.index) { return; }
                var dir = i > state.index ? 1 : -1;
                state.index = i - dir;
                turn(dir);
                if (toc) { toc.classList.remove("is-open"); }
            });
        });
        ui().$all("[data-turn]", stage).forEach(function (btn) {
            btn.addEventListener("click", function () { turn(parseInt(btn.getAttribute("data-turn"), 10)); });
        });
    }

    function openBook() {
        state.open = true;
        state.index = 0;
        var hash = parseInt((root.location.hash || "").replace("#p", ""), 10);
        if (!isNaN(hash) && hash > 0) { state.index = hash - 1; }
        renderOpen();
        try { root.history.replaceState(null, "", "#p" + (state.index + 1)); } catch (e) {}
    }

    function closeBook() {
        state.open = false;
        renderCover();
        try { root.history.replaceState(null, "", root.location.pathname); } catch (e) {}
    }

    function refresh() {
        if (state.open) { renderOpen(); } else { renderCover(); }
    }

    function boot() {
        stage = ui().$("#book-stage");
        if (!stage) { return; }
        renderCover();
        doc.addEventListener("keydown", function (e) {
            if (!state.open) { return; }
            if (e.key === "Escape") { closeBook(); }
            else if (e.key === "ArrowRight") { turn(1); }
            else if (e.key === "ArrowLeft") { turn(-1); }
        });
        root.OLRD.store.subscribe(refresh);
        root.OLRD.i18n.subscribe(refresh);
        if ((root.location.hash || "").indexOf("#p") === 0) { openBook(); }
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
