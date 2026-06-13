(function (root) {
    "use strict";

    var doc = root.document;
    var stage = null;
    var state = { open: false, index: 0, turning: false };

    function ui() { return root.OLRD.ui; }
    function t(key, vars) { return root.OLRD.i18n.t(key, vars); }
    function book() { return root.OLRD.store.getBook(); }
    function pad(n) { return (n < 10 ? "0" : "") + n; }

    /* ---- page <-> URL (?page=N) deep-linking ---- */
    function pageParam() {
        try {
            var m = (root.location.search || "").match(/[?&]page=(\d+)/);
            if (m) { return parseInt(m[1], 10) || 0; }
            var hp = (root.location.hash || "").match(/^#p(\d+)/);
            if (hp) { return parseInt(hp[1], 10) || 0; }
            if (/^#read/.test(root.location.hash || "")) { return 1; }
        } catch (e) {}
        return 0;
    }
    function setPageUrl(n, push) {
        if (!(n >= 1)) { return; }
        try {
            root.history[push ? "pushState" : "replaceState"](null, "", root.location.pathname + "?page=" + n);
        } catch (e) {}
    }
    function clearPageUrl(push) {
        try {
            root.history[push ? "pushState" : "replaceState"](null, "", root.location.pathname);
        } catch (e) {}
    }

    function paragraphs(text) {
        var blocks = String(text || "").split(/\n{1,}/).filter(function (p) { return p.trim().length; });
        if (!blocks.length) { return '<p class="book-page__empty">' + ui().escapeHtml(t("book.emptyPage")) + "</p>"; }
        return blocks.map(function (p, i) {
            var cls = i === 0 ? ' class="book-page__lead"' : "";
            return "<p" + cls + ">" + ui().escapeHtml(p.trim()) + "</p>";
        }).join("");
    }

    var pdfCache = {};

    function base64ToBlobUrl(b64, mime) {
        try {
            var bin = root.atob(b64);
            var bytes = new root.Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
            return root.URL.createObjectURL(new root.Blob([bytes], { type: mime || "application/pdf" }));
        } catch (e) { return ""; }
    }

    function findHost(id) {
        var hosts = ui().$all("[data-pdf-host]", stage);
        for (var i = 0; i < hosts.length; i++) {
            if (hosts[i].getAttribute("data-pdf-host") === id) { return hosts[i]; }
        }
        return null;
    }

    function paintPdf(host, url) {
        if (!host) { return; }
        if (!url) {
            host.innerHTML = '<div class="book-page__pdf-status">' + ui().escapeHtml(t("book.pdfMissing")) + '</div>';
            return;
        }
        host.innerHTML = '<iframe class="book-page__pdf-frame" src="' + url + '" title="PDF" loading="lazy"></iframe>' +
            '<a class="book-page__pdf-open" href="' + url + '" target="_blank" rel="noopener">' + ui().escapeHtml(t("book.pdfOpen")) + '</a>';
    }

    function loadPdf(id) {
        if (pdfCache[id]) { paintPdf(findHost(id), pdfCache[id]); return; }
        var sync = root.OLRD.sync;
        if (!(sync && sync.available && sync.available() && sync.fetchBookFile)) {
            paintPdf(findHost(id), "");
            return;
        }
        sync.fetchBookFile(id).then(function (row) {
            if (!row || !row.data) { paintPdf(findHost(id), ""); return; }
            var url = base64ToBlobUrl(row.data, row.mime);
            if (url) { pdfCache[id] = url; }
            paintPdf(findHost(id), url);
        });
    }

    function renderCover() {
        var b = book();
        stage.innerHTML = '' +
            '<div class="book-cover" data-reveal>' +
                '<div class="book-vol" data-open-book role="button" tabindex="0" aria-label="' + ui().escapeHtml(t("book.open")) + '">' +
                    '<div class="book-vol__face">' +
                        '<span class="book-vol__emblem"><img src="assets/logo.png" alt="" draggable="false"></span>' +
                        '<span class="book-vol__eyebrow">' + ui().escapeHtml(t("book.eyebrow")) + '</span>' +
                        '<h2 class="book-vol__title">' + ui().escapeHtml(b.title) + '</h2>' +
                        (b.subtitle ? '<p class="book-vol__sub">' + ui().escapeHtml(b.subtitle) + '</p>' : "") +
                        '<span class="book-vol__rule"></span>' +
                        (b.author ? '<span class="book-vol__author">' + ui().escapeHtml(t("book.by")) + ' ' + ui().escapeHtml(b.author) + '</span>' : "") +
                    '</div>' +
                    '<span class="book-vol__shine" aria-hidden="true"></span>' +
                '</div>' +
                '<span class="book-cover__cue">' + ui().escapeHtml(t("book.openHint")) + '</span>' +
            '</div>';
        ui().mountReveal();
        var open = stage.querySelector("[data-open-book]");
        if (open) {
            open.addEventListener("click", openBook);
            open.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBook(); }
            });
            if (b.pdf) {
                open.addEventListener("pointerenter", prefetchPdf);
                open.addEventListener("focus", prefetchPdf);
                open.addEventListener("touchstart", prefetchPdf, { passive: true });
            }
        }
    }

    /* ============================================================
       Real paper flip-book reader (single PDF, two-page spread)
       ============================================================ */
    var pdfBook = {
        doc: null, total: 0, left: 1, per: 2, turning: false,
        img: {}, pend: {}, aspect: 0.707, loading: null, pdfId: null,
        resize: null, rt: null
    };

    function ensurePdfJs() {
        if (root.pdfjsLib) { return Promise.resolve(root.pdfjsLib); }
        if (pdfBook.loading) { return pdfBook.loading; }
        pdfBook.loading = new Promise(function (resolve, reject) {
            var s = doc.createElement("script");
            s.src = "js/pdf/pdf.min.js";
            s.onload = function () {
                if (root.pdfjsLib) {
                    try { root.pdfjsLib.GlobalWorkerOptions.workerSrc = "js/pdf/pdf.worker.min.js"; } catch (e) {}
                    resolve(root.pdfjsLib);
                } else { reject(new Error("pdfjs")); }
            };
            s.onerror = function () { reject(new Error("pdfjs")); };
            doc.head.appendChild(s);
        });
        return pdfBook.loading;
    }

    function base64ToBytes(b64) {
        var bin = root.atob(b64);
        var bytes = new root.Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
        return bytes;
    }

    function perSpread() { return (root.innerWidth || 1024) < 760 ? 1 : 2; }

    function pageSrc(num) {
        if (!pdfBook.doc || num < 1 || num > pdfBook.total) { return Promise.resolve(null); }
        if (pdfBook.img[num]) { return Promise.resolve(pdfBook.img[num]); }
        if (pdfBook.pend[num]) { return pdfBook.pend[num]; }
        var p = pdfBook.doc.getPage(num).then(function (page) {
            var base = page.getViewport({ scale: 1 });
            if (base.width > 0) { pdfBook.aspect = base.width / base.height; }
            var scale = Math.max(1, Math.min(3, 1180 / base.width));
            var vp = page.getViewport({ scale: scale });
            var canvas = doc.createElement("canvas");
            canvas.width = Math.floor(vp.width);
            canvas.height = Math.floor(vp.height);
            return page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport: vp }).promise.then(function () {
                var url = canvas.toDataURL("image/jpeg", 0.92);
                pdfBook.img[num] = url;
                canvas.width = 1; canvas.height = 1;
                return url;
            });
        }).catch(function () { return null; });
        pdfBook.pend[num] = p;
        return p;
    }

    function leaf(side) { return stage ? stage.querySelector('[data-leaf="' + side + '"]') : null; }

    function fillLeaf(el, num) {
        if (!el) { return; }
        el.setAttribute("data-want", num ? String(num) : "");
        if (!num || num < 1 || num > pdfBook.total) {
            el.classList.add("is-blank");
            el.innerHTML = '<span class="book-leaf__sheen" aria-hidden="true"></span>';
            return;
        }
        el.classList.remove("is-blank");
        pageSrc(num).then(function (url) {
            if (el.getAttribute("data-want") !== String(num)) { return; }
            if (url) {
                el.innerHTML = '<img class="book-leaf__img" src="' + url + '" alt="" draggable="false">' +
                               '<span class="book-leaf__sheen" aria-hidden="true"></span>';
            }
        });
    }

    function buildFace(num, cls) {
        var face = doc.createElement("div");
        face.className = "book-face " + cls;
        pageSrc(num).then(function (url) {
            if (url) {
                face.innerHTML = '<img class="book-leaf__img" src="' + url + '" alt="" draggable="false">' +
                                 '<span class="book-face__shade" aria-hidden="true"></span>';
            } else {
                face.classList.add("is-blank");
                face.innerHTML = '<span class="book-face__shade" aria-hidden="true"></span>';
            }
        });
        return face;
    }

    function sizeBook() {
        var wrap = stage.querySelector(".book-viewport");
        var b3 = stage.querySelector("[data-book3d]");
        if (!wrap || !b3) { return; }
        var per = pdfBook.per;
        var availW = Math.max(220, wrap.clientWidth - 6);
        var availH = Math.min((root.innerHeight || 800) * 0.78, 780);
        var pageH = availH;
        var pageW = pageH * pdfBook.aspect;
        var totalW = pageW * per;
        if (totalW > availW) {
            var k = availW / totalW;
            pageW = pageW * k; pageH = pageH * k; totalW = availW;
        }
        b3.style.width = Math.round(totalW) + "px";
        b3.style.height = Math.round(pageH) + "px";
        b3.style.setProperty("--pw", Math.round(pageW) + "px");
        b3.style.setProperty("--ph", Math.round(pageH) + "px");
    }

    function canFlip(dir) {
        if (!pdfBook.doc) { return false; }
        var per = pdfBook.per, L = pdfBook.left;
        if (dir > 0) { return (L + per) <= pdfBook.total; }
        return (L - per) >= 1;
    }

    function updatePager() {
        var c = stage.querySelector("[data-count]");
        if (c) {
            var L = pdfBook.left;
            var label = (pdfBook.per === 2 && (L + 1) <= pdfBook.total) ? (L + "–" + (L + 1)) : String(L);
            c.textContent = label + " / " + pdfBook.total;
        }
        ui().$all("[data-flip]", stage).forEach(function (el) {
            el.disabled = !canFlip(parseInt(el.getAttribute("data-flip"), 10));
        });
        if (state.open) { setPageUrl(pdfBook.left, false); }
    }

    function preload() {
        [pdfBook.left - 2, pdfBook.left - 1, pdfBook.left, pdfBook.left + 1, pdfBook.left + 2, pdfBook.left + 3].forEach(function (n) {
            if (n >= 1 && n <= pdfBook.total && !pdfBook.img[n] && !pdfBook.pend[n]) { pageSrc(n).catch(function () {}); }
        });
    }

    function paintSpread() {
        var b3 = stage.querySelector("[data-book3d]");
        if (b3) { b3.classList.toggle("is-single", pdfBook.per === 1); }
        fillLeaf(leaf("left"), pdfBook.left);
        fillLeaf(leaf("right"), pdfBook.per === 2 ? (pdfBook.left + 1) : null);
        updatePager();
    }

    function flip(dir) {
        if (pdfBook.turning || !pdfBook.doc || !canFlip(dir)) { return; }
        var per = pdfBook.per;
        var L = pdfBook.left;
        var leftEl = leaf("left"), rightEl = leaf("right");

        /* ---- single page (mobile): rotate the leaf around its spine ---- */
        if (per === 1) {
            var nL = L + dir;
            pdfBook.turning = true;
            pageSrc(nL).then(function () {
                if (!leftEl || !leftEl.isConnected) { pdfBook.turning = false; return; }
                leftEl.classList.add(dir > 0 ? "is-out-fwd" : "is-out-back");
                root.setTimeout(function () {
                    pdfBook.left = nL;
                    fillLeaf(leftEl, nL);
                    leftEl.classList.remove("is-out-fwd", "is-out-back");
                    leftEl.classList.add(dir > 0 ? "is-in-fwd" : "is-in-back");
                    updatePager(); preload();
                    root.setTimeout(function () {
                        leftEl.classList.remove("is-in-fwd", "is-in-back");
                        pdfBook.turning = false;
                    }, 300);
                }, 250);
            });
            return;
        }

        /* ---- two-page spread: 3D sheet turn around the centre spine ---- */
        var flips = stage.querySelector("[data-flips]");
        if (!flips) { return; }
        pdfBook.turning = true;

        var frontN, backN, newL;
        var sheet = doc.createElement("div");
        sheet.className = "book-sheet";

        if (dir > 0) {
            frontN = L + 1;            // old right page (sheet front)
            backN = L + 2;             // new left page (sheet back)
            newL = L + 2;
            fillLeaf(rightEl, L + 3);  // reveal the next right page underneath
            sheet.classList.add("book-sheet--right");
        } else {
            frontN = L;                // old left page (sheet front)
            backN = L - 1;             // new right page (sheet back)
            newL = L - 2;
            fillLeaf(leftEl, L - 2);   // reveal the new left page underneath
            sheet.classList.add("book-sheet--left");
        }

        sheet.appendChild(buildFace(frontN, "book-face--front"));
        sheet.appendChild(buildFace(backN, "book-face--back"));
        flips.appendChild(sheet);
        void sheet.offsetWidth; // commit start state before animating
        sheet.classList.add(dir > 0 ? "is-turning-fwd" : "is-turning-back");

        root.setTimeout(function () {
            pdfBook.left = newL < 1 ? 1 : newL;
            if (sheet.parentNode) { sheet.parentNode.removeChild(sheet); }
            paintSpread();
            preload();
            pdfBook.turning = false;
        }, 720);
    }

    function bindResize() {
        if (pdfBook.resize) { root.removeEventListener("resize", pdfBook.resize); }
        pdfBook.resize = function () {
            if (pdfBook.rt) { root.clearTimeout(pdfBook.rt); }
            pdfBook.rt = root.setTimeout(function () {
                if (!stage || !stage.querySelector("[data-book3d]")) { return; }
                var np = perSpread();
                if (np !== pdfBook.per) {
                    if (np === 2 && pdfBook.left % 2 === 0) { pdfBook.left -= 1; }
                    if (pdfBook.left < 1) { pdfBook.left = 1; }
                    pdfBook.per = np;
                }
                sizeBook();
                paintSpread();
            }, 180);
        };
        root.addEventListener("resize", pdfBook.resize);
    }

    function startPdf(id) {
        var sync = root.OLRD.sync;
        function fail() {
            var vp = stage.querySelector(".book-viewport");
            if (vp) { vp.innerHTML = '<div class="book-pdf-status">' + ui().escapeHtml(t("book.pdfMissing")) + '</div>'; }
        }
        function ready() {
            pdfBook.per = perSpread();
            if (pdfBook.left < 1) { pdfBook.left = 1; }
            if (pdfBook.per === 2 && pdfBook.left % 2 === 0) { pdfBook.left -= 1; }
            if (pdfBook.left > pdfBook.total) { pdfBook.left = 1; }
            pageSrc(pdfBook.left).then(function () {
                sizeBook();
                paintSpread();
                preload();
                pdfBook.turning = false;
            });
        }
        if (pdfBook.doc && pdfBook.pdfId === id) { ready(); return; }
        if (!(sync && sync.available && sync.available() && sync.fetchBookFile)) { fail(); return; }
        Promise.all([ensurePdfJs(), sync.fetchBookFile(id)]).then(function (res) {
            var lib = res[0];
            var row = res[1];
            if (!row || !row.data) { throw new Error("no data"); }
            return lib.getDocument({ data: base64ToBytes(row.data) }).promise;
        }).then(function (pdf) {
            pdfBook.doc = pdf;
            pdfBook.pdfId = id;
            pdfBook.total = pdf.numPages;
            pdfBook.img = {};
            pdfBook.pend = {};
            ready();
        }).catch(fail);
    }

    function prefetchPdf() {
        var b = book();
        if (!b.pdf || pdfBook.prefetching) { return; }
        if (pdfBook.doc && pdfBook.pdfId === b.pdf) { return; }
        var sync = root.OLRD.sync;
        if (!(sync && sync.available && sync.available() && sync.fetchBookFile)) { return; }
        pdfBook.prefetching = true;
        Promise.all([ensurePdfJs(), sync.fetchBookFile(b.pdf)]).then(function (res) {
            if (!res[1] || !res[1].data) { throw new Error("no data"); }
            return res[0].getDocument({ data: base64ToBytes(res[1].data) }).promise;
        }).then(function (pdf) {
            pdfBook.doc = pdf;
            pdfBook.pdfId = b.pdf;
            pdfBook.total = pdf.numPages;
            pdfBook.prefetching = false;
            pageSrc(1).catch(function () {});
            pageSrc(2).catch(function () {});
        }).catch(function () { pdfBook.prefetching = false; });
    }

    function playCoverOpen() {
        var b = book();
        var b3 = stage.querySelector("[data-book3d]");
        if (!b3) { return; }
        var ov = doc.createElement("div");
        ov.className = "book-cover3d";
        ov.innerHTML =
            '<span class="book-vol__emblem"><img src="assets/logo.png" alt="" draggable="false"></span>' +
            '<span class="book-vol__eyebrow">' + ui().escapeHtml(t("book.eyebrow")) + '</span>' +
            '<h2 class="book-vol__title">' + ui().escapeHtml(b.title) + '</h2>' +
            (b.author ? '<span class="book-vol__author">' + ui().escapeHtml(t("book.by")) + ' ' + ui().escapeHtml(b.author) + '</span>' : "");
        b3.appendChild(ov);
        void ov.offsetWidth;
        ov.classList.add("is-go");
        root.setTimeout(function () {
            if (ov.parentNode) { ov.parentNode.removeChild(ov); }
        }, 760);
    }

    function renderPdfBook() {
        var b = book();
        stage.innerHTML = '' +
            '<div class="book-open book-open--flip">' +
                '<div class="book-open__bar">' +
                    '<button type="button" class="ghost-btn book-open__close" data-close-book>' + ui().escapeHtml(t("book.close")) + '</button>' +
                    '<span class="book-open__title">' + ui().escapeHtml(b.title) + '</span>' +
                    '<span class="book-open__bar-spacer" aria-hidden="true"></span>' +
                '</div>' +
                '<div class="book-reader">' +
                    '<div class="book-viewport">' +
                        '<div class="book-3d" data-book3d>' +
                            '<div class="book-leaf book-leaf--left" data-leaf="left"></div>' +
                            '<div class="book-leaf book-leaf--right" data-leaf="right"></div>' +
                            '<div class="book-spine" aria-hidden="true"></div>' +
                            '<div class="book-flips" data-flips aria-hidden="true"></div>' +
                            '<button type="button" class="book-turn book-turn--prev" data-flip="-1" aria-label="' + ui().escapeHtml(t("book.prev")) + '"><span class="book-turn__corner" aria-hidden="true"></span></button>' +
                            '<button type="button" class="book-turn book-turn--next" data-flip="1" aria-label="' + ui().escapeHtml(t("book.next")) + '"><span class="book-turn__corner" aria-hidden="true"></span></button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="book-pager">' +
                    '<span class="book-pager__count" data-count></span>' +
                '</div>' +
            '</div>';
        var close = stage.querySelector("[data-close-book]");
        if (close) { close.addEventListener("click", closeBook); }
        ui().$all('[data-flip]', stage).forEach(function (el) {
            el.addEventListener("click", function () { flip(parseInt(el.getAttribute("data-flip"), 10)); });
        });
        sizeBook();
        bindResize();
        startPdf(b.pdf);
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
        if (state.open) { setPageUrl(state.index + 1, false); }
        var page = b.pages[state.index];
        var n = pad(state.index + 1);
        var total = pad(b.pages.length);
        var content;
        if (page.pdf) {
            content = '<div class="book-page__pdf" data-pdf-host="' + ui().escapeHtml(page.pdf) + '">' +
                          '<div class="book-page__pdf-status">' + ui().escapeHtml(t("book.pdfLoading")) + '</div>' +
                      '</div>' +
                      (page.body && page.body.trim() ? '<div class="book-page__prose book-page__prose--caption">' + paragraphs(page.body) + '</div>' : "");
        } else {
            content = '<div class="book-page__prose">' + paragraphs(page.body) + '</div>';
        }
        pageEl.innerHTML = '' +
            '<div class="book-page__sheet' + (page.pdf ? " book-page__sheet--pdf" : "") + '">' +
                '<span class="book-page__no">' + n + "</span>" +
                '<span class="book-page__mark">' + ui().escapeHtml(t("book.eyebrow")) + '</span>' +
                '<h3 class="book-page__title">' + ui().escapeHtml(page.title) + "</h3>" +
                content +
                '<span class="book-page__folio">' + n + " / " + total + "</span>" +
                '<span class="book-page__ribbon"></span>' +
            "</div>";
        if (page.pdf) { loadPdf(page.pdf); }
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

    function openBook(viaUrl) {
        state.open = true;
        state.index = 0;
        var target = pageParam();
        if (book().pdf) {
            if (target >= 1) { pdfBook.left = target; }   // ready() normalizes to the spread
            renderPdfBook();
            playCoverOpen();
            if (viaUrl !== true) { setPageUrl(pdfBook.left >= 1 ? pdfBook.left : 1, true); }
            return;
        }
        if (target >= 1) { state.index = target - 1; }
        renderOpen();
        if (viaUrl !== true) { setPageUrl(state.index + 1, true); }
    }

    function closeBook(viaUrl) {
        state.open = false;
        if (pdfBook.resize) { root.removeEventListener("resize", pdfBook.resize); pdfBook.resize = null; }
        renderCover();
        if (viaUrl !== true) { clearPageUrl(false); }
    }

    function refresh() {
        if (state.open) {
            if (book().pdf) { renderPdfBook(); } else { renderOpen(); }
        } else {
            renderCover();
        }
    }

    function boot() {
        stage = ui().$("#book-stage");
        if (!stage) { return; }
        doc.addEventListener("keydown", function (e) {
            if (!state.open) { return; }
            if (e.key === "Escape") { closeBook(); return; }
            var isPdf = !!book().pdf;
            if (e.key === "ArrowRight") { if (isPdf) { flip(1); } else { turn(1); } }
            else if (e.key === "ArrowLeft") { if (isPdf) { flip(-1); } else { turn(-1); } }
        });
        root.addEventListener("popstate", function () {
            if (!stage) { return; }
            var target = pageParam();
            if (target >= 1) {
                if (!state.open) { openBook(true); return; }
                if (book().pdf) {
                    pdfBook.left = (pdfBook.per === 2 && target % 2 === 0) ? target - 1 : target;
                    if (pdfBook.left < 1) { pdfBook.left = 1; }
                    if (pdfBook.doc) { paintSpread(); }
                } else {
                    state.index = target - 1;
                    renderPage();
                }
            } else if (state.open) {
                closeBook(true);
            }
        });
        root.OLRD.store.subscribe(refresh);
        root.OLRD.i18n.subscribe(refresh);
        root.OLRD.store.init().then(function () {
            root.OLRD.store.dropStaleDraft();
            renderCover();
            if (pageParam() >= 1) { openBook(true); }
            root.OLRD.store.startLiveSync();
        });
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
