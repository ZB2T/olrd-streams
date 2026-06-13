(function (root) {
    "use strict";

    var doc = root.document;
    var state = { tab: "streamers" };
    var lockTimer = null;
    var publishTimer = null;

    function ui() { return root.OLRD.ui; }
    function store() { return root.OLRD.store; }
    function auth() { return root.OLRD.auth; }
    function t(key, vars) { return root.OLRD.i18n.t(key, vars); }
    function esc(value) { return ui().escapeHtml(value); }
    function $(s, scope) { return ui().$(s, scope); }
    function $all(s, scope) { return ui().$all(s, scope); }
    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function show(el, on) { if (el) { el.classList.toggle("is-hidden", !on); } }

    function bindLogin() {
        var form = $("#login-form");
        var input = $("#login-pass");
        var submit = $("#login-submit");
        var msg = $("#login-msg");
        if (!form) { return; }
        refreshLockUi();
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var value = input.value;
            if (!value) { setMsg(msg, t("msg.enterKey"), "warn"); return; }
            submit.disabled = true;
            submit.textContent = t("admin.verifying");
            setMsg(msg, t("msg.deriving"), "muted");
            auth().verify(value).then(function (res) {
                submit.disabled = false;
                submit.textContent = t("admin.authorise");
                input.value = "";
                if (res.ok) {
                    setMsg(msg, "", "muted");
                    enterDash();
                } else if (res.locked) {
                    refreshLockUi();
                } else {
                    var left = res.attemptsLeft;
                    var text = t("msg.denied");
                    if (left > 0) { text += " " + t(left === 1 ? "msg.attempt" : "msg.attempts", { n: left }); }
                    setMsg(msg, text, "err");
                }
            });
        });
    }

    function refreshLockUi() {
        var msg = $("#login-msg");
        var submit = $("#login-submit");
        var input = $("#login-pass");
        var gate = auth().lockState();
        if (lockTimer) { root.clearInterval(lockTimer); lockTimer = null; }
        if (!gate.locked) {
            if (submit) { submit.disabled = false; }
            if (input) { input.disabled = false; }
            return;
        }
        if (submit) { submit.disabled = true; }
        if (input) { input.disabled = true; }
        var tick = function () {
            var current = auth().lockState();
            if (!current.locked) {
                root.clearInterval(lockTimer);
                lockTimer = null;
                if (submit) { submit.disabled = false; }
                if (input) { input.disabled = false; }
                setMsg(msg, t("msg.lockCleared"), "muted");
                return;
            }
            setMsg(msg, t("msg.locked", { n: Math.ceil(current.remaining / 1000) }), "err");
        };
        tick();
        lockTimer = root.setInterval(tick, 1000);
    }

    function setMsg(node, text, kind) {
        if (!node) { return; }
        node.textContent = text;
        node.classList.remove("form-msg--err", "form-msg--muted", "form-msg--warn", "form-msg--ok");
        if (!node.classList.contains("form-msg")) { node.classList.add("form-msg"); }
        if (kind) { node.classList.add("form-msg--" + kind); }
    }

    function enterDash() {
        show($("#admin-login"), false);
        show($("#admin-dash"), true);
        var pk = $("#publish-key");
        if (pk && !pk.value.trim()) {
            try {
                var saved = root.localStorage.getItem("olrd.pubkey") || "";
                if (saved) { pk.value = saved; }
            } catch (e) {}
        }
        switchTab(state.tab);
        renderStreamers();
        renderBook();
        renderHistory();
        loadStreamerStatus();
        if (!statusTimer) { statusTimer = root.setInterval(loadStreamerStatus, 60000); }
        if (lockTimer) { root.clearInterval(lockTimer); lockTimer = null; }
    }

    function leaveDash() {
        auth().endSession();
        if (statusTimer) { root.clearInterval(statusTimer); statusTimer = null; }
        show($("#admin-dash"), false);
        show($("#admin-login"), true);
        var input = $("#login-pass");
        if (input) { input.value = ""; input.focus(); }
        refreshLockUi();
    }

    function bindTabs() {
        $all("[data-tab]").forEach(function (btn) {
            btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
        });
        var logout = $("#logout-btn");
        if (logout) { logout.addEventListener("click", leaveDash); }
    }

    function switchTab(name) {
        state.tab = name;
        $all("[data-tab]").forEach(function (btn) {
            btn.classList.toggle("is-active", btn.getAttribute("data-tab") === name);
        });
        ["streamers", "story", "security"].forEach(function (key) {
            show($("#tab-" + key), key === name);
        });
    }

    var statusCache = {};
    var statusTimer = null;

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
                return { online: !!ls, viewers: ls ? (ls.viewer_count || ls.viewers || 0) : 0 };
            })
            .catch(function () { return { online: false, viewers: 0 }; });
    }

    function sortedForAdmin() {
        return store().getStreamers().map(function (s, i) {
            var st = statusCache[s.username] || { online: false, viewers: 0 };
            return { s: s, online: st.online, viewers: st.viewers, order: i };
        }).sort(function (a, b) {
            if (a.online !== b.online) { return a.online ? -1 : 1; }
            if (a.online && b.online) { return b.viewers - a.viewers; }
            return a.order - b.order;
        }).map(function (x) { return x.s; });
    }

    function streamerRow(streamer, index) {
        var label = esc(streamer.username).toUpperCase();
        var st = statusCache[streamer.username] || { online: false, viewers: 0 };
        var live = st.online;
        return '' +
            '<li class="stream-card stream-card--admin ' + (live ? "is-live" : "is-offline") + '" data-sort-id="' + esc(streamer.id) + '" draggable="true">' +
                '<span class="stream-card__index">' + pad(index + 1) + '</span>' +
                '<button type="button" class="stream-card__remove" data-remove="' + esc(streamer.id) + '" title="' + esc(t("common.remove")) + '" aria-label="' + esc(t("common.remove")) + '">&times;</button>' +
                (live ? '<span class="stream-card__live"><i></i>' + esc(t("card.live")) + '</span>' : '') +
                '<div class="stream-card__frame">' +
                    '<div class="stream-card__offline">' +
                        '<img class="stream-card__art" src="assets/logo.png" alt="" draggable="false">' +
                        (live ? '' : '<span class="stream-card__offline-tag">' + esc(t("card.offline")) + '</span>') +
                    '</div>' +
                '</div>' +
                '<div class="stream-card__bar">' +
                    '<span class="stream-card__platform">KICK</span>' +
                    '<span class="stream-card__name">' + label + '</span>' +
                    (live
                        ? '<span class="stream-card__status is-live">' + formatViewers(st.viewers) + ' ' + esc(t("card.watching")) + '</span>'
                        : '<span class="stream-card__status">' + esc(t("card.closed")) + '</span>') +
                '</div>' +
            '</li>';
    }

    function renderStreamers() {
        var list = $("#streamer-list");
        if (!list) { return; }
        list.classList.remove("sort-list");
        list.classList.add("streamer-grid");
        var ordered = sortedForAdmin();
        var total = $("[data-streamer-total]");
        if (total) { total.textContent = pad(ordered.length); }
        if (!ordered.length) {
            list.innerHTML = '<li class="sort-empty">' + esc(t("admin.empty.streamers")) + '</li>';
            return;
        }
        list.innerHTML = ordered.map(streamerRow).join("");
        ui().makeSortable(list, function (ids) {
            store().reorderStreamers(ids);
            ui().toast(t("toast.order"), "ok");
        });
    }

    function loadStreamerStatus() {
        var streamers = store().getStreamers();
        if (!streamers.length) { return; }
        Promise.all(streamers.map(function (s) {
            return fetchStatus(s.username).then(function (st) { statusCache[s.username] = st; });
        })).then(function () {
            if (dashVisible() && !doc.querySelector(".is-dragging")) { renderStreamers(); }
        });
    }

    function bindStreamers() {
        var form = $("#streamer-form");
        var input = $("#streamer-input");
        var list = $("#streamer-list");
        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                var res = store().addStreamer(input.value);
                if (res.ok) {
                    input.value = "";
                    renderStreamers();
                    ui().toast(t("toast.added"), "ok");
                } else if (res.error === "duplicate") {
                    ui().toast(t("toast.dup"), "warn");
                } else {
                    ui().toast(t("toast.invalidHandle"), "warn");
                }
                input.focus();
            });
        }
        if (list) {
            list.addEventListener("click", function (e) {
                var btn = e.target.closest ? e.target.closest("[data-remove]") : null;
                if (!btn) { return; }
                store().removeStreamer(btn.getAttribute("data-remove"));
                renderStreamers();
                ui().toast(t("toast.removed"), "ok");
            });
        }
    }

    function renderBook() {
        var panel = $("#book-manager");
        if (!panel) { return; }
        var b = store().getBook();
        panel.innerHTML = '' +
            '<div class="book-edit">' +
                '<div class="editor-head">' +
                    '<div><span class="editor-head__eyebrow">' + esc(t("book.section")) + '</span><h3 class="editor-head__title">' + esc(b.title) + '</h3></div>' +
                    '<button type="button" class="ghost-btn" data-save-book>' + esc(t("book.save")) + '</button>' +
                '</div>' +
                '<div class="editor-grid">' +
                    '<label class="field-label">' + esc(t("field.bookTitle")) + '<input type="text" class="field" data-bk="title" value="' + esc(b.title) + '"></label>' +
                    '<label class="field-label">' + esc(t("field.author")) + '<input type="text" class="field" data-bk="author" value="' + esc(b.author) + '"></label>' +
                '</div>' +
                '<label class="field-label">' + esc(t("field.bookSubtitle")) + '<input type="text" class="field" data-bk="subtitle" value="' + esc(b.subtitle) + '"></label>' +
                '<div class="book-pdf-manager">' +
                    '<span class="field-label">' + esc(t("book.pdfSection")) + '</span>' +
                    '<p class="book-pdf-manager__hint">' + esc(t("book.pdfSectionHint")) + '</p>' +
                    (b.pdf
                        ? '<div class="book-pdf-current"><span class="page-edit__pdfname" title="' + esc(b.pdfName || "") + '">' + esc(b.pdfName || t("pdf.attached")) + '</span><button type="button" class="row-remove" data-book-pdf-remove>' + esc(t("pdf.remove")) + '</button></div>'
                        : '') +
                    '<label class="pdf-upload"><input type="file" accept="application/pdf,.pdf" data-book-pdf-input><span class="pdf-upload__btn">' + esc(b.pdf ? t("pdf.replace") : t("book.pdfUpload")) + '</span></label>' +
                    '<span class="pdf-msg" data-book-pdf-msg></span>' +
                '</div>' +
            '</div>';
        bindBook();
    }

    function bindBook() {
        var panel = $("#book-manager");

        $all("[data-bk]", panel).forEach(function (input) {
            var key = input.getAttribute("data-bk");
            input.addEventListener("change", function () {
                var patch = {};
                patch[key] = input.value;
                store().updateBookMeta(patch);
            });
        });

        var save = $("[data-save-book]", panel);
        if (save) {
            save.addEventListener("click", function () {
                $all("[data-bk]", panel).forEach(function (input) {
                    var patch = {};
                    patch[input.getAttribute("data-bk")] = input.value;
                    store().updateBookMeta(patch);
                });
                ui().toast(t("toast.bookSaved"), "ok");
            });
        }

        var pdfInput = $("[data-book-pdf-input]", panel);
        if (pdfInput) {
            pdfInput.addEventListener("change", function () {
                var file = pdfInput.files && pdfInput.files[0];
                pdfInput.value = "";
                if (file) { handleBookPdfUpload(file); }
            });
        }

        var pdfRemove = $("[data-book-pdf-remove]", panel);
        if (pdfRemove) {
            pdfRemove.addEventListener("click", handleBookPdfRemove);
        }
    }

    function bindSecurity() {
        var form = $("#pass-form");
        var oldField = $("#pass-old");
        var newField = $("#pass-new");
        var confirmField = $("#pass-confirm");
        var msg = $("#pass-msg");

        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                if (newField.value !== confirmField.value) {
                    setMsg(msg, t("msg.keyMismatch"), "err");
                    return;
                }
                var submit = $("#pass-submit");
                if (submit) { submit.disabled = true; submit.textContent = t("msg.updating"); }
                auth().changePassword(oldField.value, newField.value).then(function (res) {
                    if (submit) { submit.disabled = false; submit.textContent = t("security.update"); }
                    if (res.ok) {
                        oldField.value = newField.value = confirmField.value = "";
                        setMsg(msg, t("msg.keyUpdated"), "muted");
                        ui().toast(t("toast.keyChanged"), "ok");
                    } else if (res.error === "mismatch") {
                        setMsg(msg, t("msg.curWrong"), "err");
                    } else if (res.error === "weak") {
                        setMsg(msg, t("msg.tooShort"), "err");
                    } else if (res.error === "same") {
                        setMsg(msg, t("msg.mustDiffer"), "err");
                    } else if (res.error === "cloud") {
                        setMsg(msg, t("msg.cloudFail"), "err");
                    } else {
                        setMsg(msg, t("msg.storeFail"), "err");
                    }
                });
            });
        }

        var exportBtn = $("#export-btn");
        if (exportBtn) {
            exportBtn.addEventListener("click", function () {
                var text = store().exportAll();
                var blob = new root.Blob([text], { type: "application/json" });
                var url = root.URL.createObjectURL(blob);
                var a = doc.createElement("a");
                a.href = url;
                a.download = "data.json";
                doc.body.appendChild(a);
                a.click();
                doc.body.removeChild(a);
                root.URL.revokeObjectURL(url);
                ui().toast(t("toast.exported"), "ok");
            });
        }

        var importInput = $("#import-input");
        if (importInput) {
            importInput.addEventListener("change", function () {
                var file = importInput.files && importInput.files[0];
                if (!file) { return; }
                var reader = new root.FileReader();
                reader.onload = function () {
                    var res = store().importAll(String(reader.result));
                    if (res.ok) {
                        renderStreamers();
                        renderBook();
                        ui().toast(t("toast.imported"), "ok");
                    } else {
                        ui().toast(t("toast.importErr"), "err");
                    }
                    importInput.value = "";
                };
                reader.readAsText(file);
            });
        }

        var resetBtn = $("#reset-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                if (root.confirm(t("confirm.reset"))) {
                    store().resetAll();
                    renderStreamers();
                    renderBook();
                    ui().toast(t("toast.restored"), "ok");
                }
            });
        }
    }

    function bindPublish() {
        var form = $("#publish-form");
        var keyInput = $("#publish-key");
        var msg = $("#publish-msg");
        if (!form || !keyInput) { return; }

        try {
            var saved = root.localStorage.getItem("olrd.pubkey");
            if (saved) { keyInput.value = saved; }
        } catch (e) {}

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!(root.OLRD.sync && root.OLRD.sync.available())) { setMsg(msg, t("msg.publishNotSet"), "warn"); return; }
            var key = keyInput.value.trim();
            if (!key) { setMsg(msg, t("msg.publishKeyNeeded"), "warn"); return; }
            try { root.localStorage.setItem("olrd.pubkey", key); } catch (e2) {}

            var btn = $("#publish-btn");
            if (btn) { btn.disabled = true; btn.textContent = t("msg.publishing"); }
            setMsg(msg, t("msg.publishing"), "muted");

            root.OLRD.sync.publish(store().snapshot(), key).then(function (res) {
                if (btn) { btn.disabled = false; btn.textContent = t("security.publishBtn"); }
                if (res.ok) {
                    setMsg(msg, t("msg.published"), "muted");
                    ui().toast(t("msg.published"), "ok");
                } else {
                    setMsg(msg, t("msg.publishFail"), "err");
                    ui().toast(t("msg.publishFail"), "err");
                }
            });
        });
    }

    function publishKeyValue() {
        var el = $("#publish-key");
        if (el && el.value.trim()) { return el.value.trim(); }
        try { return root.localStorage.getItem("olrd.pubkey") || ""; }
        catch (e) { return ""; }
    }

    function autoPublish() {
        if (!(root.OLRD.sync && root.OLRD.sync.available())) { return; }
        var key = publishKeyValue();
        if (!key) {
            var warn = $("#publish-msg");
            if (warn) { setMsg(warn, t("msg.loginForPublish"), "warn"); }
            ui().toast(t("msg.loginForPublish"), "warn");
            return;
        }
        if (publishTimer) { root.clearTimeout(publishTimer); }
        publishTimer = root.setTimeout(function () {
            root.OLRD.sync.publish(store().snapshot(), key).then(function (res) {
                var msg = $("#publish-msg");
                if (res.ok) { setMsg(msg, t("msg.published"), "muted"); }
                else { setMsg(msg, t("msg.publishFail"), "err"); }
            });
        }, 900);
    }

    var PDF_MAX = 6 * 1024 * 1024;

    function handleBookPdfUpload(file) {
        var msg = $("[data-book-pdf-msg]");
        var isPdf = (file.type && file.type.indexOf("pdf") !== -1) || /\.pdf$/i.test(file.name || "");
        if (!isPdf) { if (msg) { setMsg(msg, t("pdf.notPdf"), "err"); } return; }
        if (file.size > PDF_MAX) { if (msg) { setMsg(msg, t("pdf.tooLarge"), "err"); } return; }
        if (!(root.OLRD.sync && root.OLRD.sync.available())) { if (msg) { setMsg(msg, t("msg.publishNotSet"), "warn"); } return; }
        var key = publishKeyValue();
        if (!key) { if (msg) { setMsg(msg, t("msg.loginForPublish"), "warn"); } return; }
        if (msg) { setMsg(msg, t("pdf.uploading"), "muted"); }
        var reader = new root.FileReader();
        reader.onload = function () {
            var result = String(reader.result || "");
            var comma = result.indexOf(",");
            var base64 = comma >= 0 ? result.slice(comma + 1) : result;
            root.OLRD.sync.saveBookFile(key, "book_main", file.name, "application/pdf", base64).then(function (ok) {
                if (ok) {
                    store().updateBookMeta({ pdf: "book_main", pdfName: file.name });
                    ui().toast(t("pdf.uploaded"), "ok");
                } else {
                    if (msg) { setMsg(msg, t("pdf.uploadFail"), "err"); }
                    ui().toast(t("pdf.uploadFail"), "err");
                }
            });
        };
        reader.onerror = function () { if (msg) { setMsg(msg, t("pdf.uploadFail"), "err"); } };
        reader.readAsDataURL(file);
    }

    function handleBookPdfRemove() {
        var key = publishKeyValue();
        store().updateBookMeta({ pdf: "", pdfName: "" });
        if (key && root.OLRD.sync && root.OLRD.sync.available()) {
            root.OLRD.sync.deleteBookFile(key, "book_main");
        }
        ui().toast(t("pdf.removed"), "ok");
    }

    function fmtTime(iso) {
        try { return new Date(iso).toLocaleString(); }
        catch (e) { return String(iso || ""); }
    }

    function renderHistory() {
        var sync = root.OLRD.sync;
        if (!(sync && sync.available && sync.available() && sync.listHistory)) { return; }
        [["streamers", "#history-streamers"], ["book", "#history-book"]].forEach(function (pair) {
            var kind = pair[0];
            var listEl = $(pair[1]);
            if (!listEl) { return; }
            sync.listHistory(kind).then(function (rows) {
                listEl._rows = rows;
                if (!rows.length) {
                    listEl.innerHTML = '<li class="history-empty">' + esc(t("history.empty")) + '</li>';
                    return;
                }
                listEl.innerHTML = rows.map(function (row) {
                    return '<li class="history-row">' +
                        '<span class="history-row__when">' + esc(fmtTime(row.created_at)) + '</span>' +
                        '<button type="button" class="ghost-btn history-row__restore" data-restore="' + kind + '" data-restore-id="' + esc(String(row.id)) + '">' + esc(t("history.restore")) + '</button>' +
                        '</li>';
                }).join("");
            });
        });
    }

    function restoreSnapshot(kind, id, listEl) {
        var rows = listEl && listEl._rows;
        if (!rows) { return; }
        var row = null;
        for (var i = 0; i < rows.length; i++) { if (String(rows[i].id) === String(id)) { row = rows[i]; break; } }
        if (!row) { return; }
        if (!root.confirm(t("history.confirmRestore"))) { return; }
        if (kind === "streamers" && Array.isArray(row.data)) { store().setStreamers(row.data); }
        else if (kind === "book" && row.data) { store().setBook(row.data); }
        renderStreamers();
        renderBook();
        ui().toast(t("history.restored"), "ok");
    }

    function saveSnapshot() {
        var sync = root.OLRD.sync;
        if (!(sync && sync.available && sync.available())) { ui().toast(t("msg.publishNotSet"), "warn"); return; }
        var key = publishKeyValue();
        if (!key) { ui().toast(t("msg.loginForPublish"), "warn"); return; }
        var btn = $("#save-snapshot-btn");
        if (btn) { btn.disabled = true; }
        Promise.all([
            sync.saveHistory(key, "streamers", store().getStreamers(), null),
            sync.saveHistory(key, "book", store().getBook(), null)
        ]).then(function (res) {
            if (btn) { btn.disabled = false; }
            if (res[0] && res[1]) { ui().toast(t("history.saved"), "ok"); renderHistory(); }
            else { ui().toast(t("history.saveFail"), "err"); }
        });
    }

    function bindHistory() {
        var saveBtn = $("#save-snapshot-btn");
        if (saveBtn) { saveBtn.addEventListener("click", saveSnapshot); }
        ["#history-streamers", "#history-book"].forEach(function (sel) {
            var listEl = $(sel);
            if (!listEl) { return; }
            listEl.addEventListener("click", function (e) {
                var btn = e.target.closest ? e.target.closest("[data-restore]") : null;
                if (!btn) { return; }
                restoreSnapshot(btn.getAttribute("data-restore"), btn.getAttribute("data-restore-id"), listEl);
            });
        });
    }

    function dashVisible() {
        var dash = $("#admin-dash");
        return dash && !dash.classList.contains("is-hidden");
    }

    function boot() {
        if (!$("#admin-root")) { return; }
        bindLogin();
        bindTabs();
        bindStreamers();
        bindSecurity();
        bindPublish();
        bindHistory();
        store().subscribe(function () {
            if (dashVisible()) { renderStreamers(); renderBook(); }
            autoPublish();
        });
        root.OLRD.i18n.subscribe(function () {
            if (dashVisible()) { renderStreamers(); renderBook(); }
        });
        store().init().then(function () {
            store().dropStaleDraft();
            var cloudOn = !!(root.OLRD.sync && root.OLRD.sync.available());
            var keyReady = !!publishKeyValue();
            if (auth().hasSession() && (keyReady || !cloudOn)) {
                enterDash();
            } else {
                show($("#admin-dash"), false);
                show($("#admin-login"), true);
                if (auth().hasSession() && cloudOn && !keyReady) {
                    setMsg($("#login-msg"), t("msg.loginForPublish"), "muted");
                }
            }
        });
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
