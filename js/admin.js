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
        if (lockTimer) { root.clearInterval(lockTimer); lockTimer = null; }
    }

    function leaveDash() {
        auth().endSession();
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

    function streamerRow(streamer, index) {
        return '' +
            '<li class="sort-row" data-sort-id="' + esc(streamer.id) + '" draggable="true">' +
                '<span class="sort-row__grip" aria-hidden="true"></span>' +
                '<span class="sort-row__index">' + pad(index + 1) + '</span>' +
                '<span class="sort-row__main">' +
                    '<span class="sort-row__title">' + esc(streamer.username) + '</span>' +
                    '<span class="sort-row__sub">KICK · player.kick.com/' + esc(streamer.username) + '</span>' +
                '</span>' +
                '<button type="button" class="row-remove" data-remove="' + esc(streamer.id) + '">' + esc(t("common.remove")) + '</button>' +
            '</li>';
    }

    function renderStreamers() {
        var list = $("#streamer-list");
        if (!list) { return; }
        var streamers = store().getStreamers();
        var total = $("[data-streamer-total]");
        if (total) { total.textContent = pad(streamers.length); }
        if (!streamers.length) {
            list.innerHTML = '<li class="sort-empty">' + esc(t("admin.empty.streamers")) + '</li>';
            return;
        }
        list.innerHTML = streamers.map(streamerRow).join("");
        ui().makeSortable(list, function (ids) {
            store().reorderStreamers(ids);
            ui().toast(t("toast.order"), "ok");
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

    function pageBlock(page, index) {
        var pdfRow = page.pdf
            ? '<span class="page-edit__pdfname" title="' + esc(page.pdfName || "") + '">' + esc(page.pdfName || t("pdf.attached")) + '</span>' +
              '<button type="button" class="row-remove" data-pdf-remove="' + esc(page.id) + '">' + esc(t("pdf.remove")) + '</button>'
            : '<span class="page-edit__pdfhint">' + esc(t("pdf.hint")) + '</span>';
        return '' +
            '<li class="page-edit" data-sort-id="' + esc(page.id) + '" draggable="true">' +
                '<div class="page-edit__head">' +
                    '<span class="sort-row__grip" aria-hidden="true"></span>' +
                    '<span class="page-edit__no">' + pad(index + 1) + '</span>' +
                    '<input type="text" class="field page-edit__title" data-pg-title="' + esc(page.id) + '" value="' + esc(page.title) + '" placeholder="' + esc(t("page.titlePh")) + '">' +
                    '<button type="button" class="row-remove" data-pg-remove="' + esc(page.id) + '">' + esc(t("common.delete")) + '</button>' +
                '</div>' +
                '<textarea class="field page-edit__body" data-pg-body="' + esc(page.id) + '" rows="6" placeholder="' + esc(t("page.bodyPh")) + '">' + esc(page.body) + '</textarea>' +
                '<div class="page-edit__pdf' + (page.pdf ? ' has-pdf' : '') + '">' +
                    pdfRow +
                    '<label class="pdf-upload">' +
                        '<input type="file" accept="application/pdf,.pdf" data-pdf-input="' + esc(page.id) + '">' +
                        '<span class="pdf-upload__btn">' + esc(page.pdf ? t("pdf.replace") : t("pdf.attach")) + '</span>' +
                    '</label>' +
                    '<span class="pdf-msg" data-pdf-msg="' + esc(page.id) + '"></span>' +
                '</div>' +
            '</li>';
    }

    function renderBook() {
        var panel = $("#book-manager");
        if (!panel) { return; }
        var b = store().getBook();
        var total = $("[data-page-total]");
        if (total) { total.textContent = pad(b.pages.length); }
        var pages = b.pages.map(pageBlock).join("");
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
                '<div class="chapter-head-row"><span class="field-label">' + esc(t("pages.label")) + '</span><button type="button" class="ghost-btn" data-page-add>' + esc(t("pages.add")) + '</button></div>' +
                '<ul class="page-list" id="page-list">' + (pages || '<li class="sort-empty">' + esc(t("admin.empty.pages")) + '</li>') + '</ul>' +
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

        var add = $("[data-page-add]", panel);
        if (add) {
            add.addEventListener("click", function () {
                store().addPage();
                ui().toast(t("toast.pageAdded"), "ok");
            });
        }

        $all("[data-pg-title]", panel).forEach(function (input) {
            var id = input.getAttribute("data-pg-title");
            input.addEventListener("blur", function () { store().updatePage(id, { title: input.value }); });
        });

        $all("[data-pg-body]", panel).forEach(function (area) {
            var id = area.getAttribute("data-pg-body");
            area.addEventListener("blur", function () { store().updatePage(id, { body: area.value }); });
        });

        $all("[data-pg-remove]", panel).forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (root.confirm(t("confirm.removePage"))) {
                    store().removePage(btn.getAttribute("data-pg-remove"));
                    ui().toast(t("toast.pageRemoved"), "ok");
                }
            });
        });

        $all("[data-pdf-input]", panel).forEach(function (input) {
            var id = input.getAttribute("data-pdf-input");
            input.addEventListener("change", function () {
                var file = input.files && input.files[0];
                input.value = "";
                if (file) { handlePdfUpload(id, file); }
            });
        });

        $all("[data-pdf-remove]", panel).forEach(function (btn) {
            var id = btn.getAttribute("data-pdf-remove");
            btn.addEventListener("click", function () { handlePdfRemove(id); });
        });

        var list = $("#page-list", panel);
        if (list) {
            ui().makeSortable(list, function (ids) {
                store().reorderPages(ids);
                ui().toast(t("toast.pagesReordered"), "ok");
            });
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
        if (!key) { return; }
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

    function pdfMsgFor(pageId) {
        var nodes = $all('[data-pdf-msg]');
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].getAttribute("data-pdf-msg") === pageId) { return nodes[i]; }
        }
        return null;
    }

    function handlePdfUpload(pageId, file) {
        var msg = pdfMsgFor(pageId);
        var isPdf = (file.type && file.type.indexOf("pdf") !== -1) || /\.pdf$/i.test(file.name || "");
        if (!isPdf) { if (msg) { setMsg(msg, t("pdf.notPdf"), "err"); } return; }
        if (file.size > PDF_MAX) { if (msg) { setMsg(msg, t("pdf.tooLarge"), "err"); } return; }
        if (!(root.OLRD.sync && root.OLRD.sync.available())) { if (msg) { setMsg(msg, t("msg.publishNotSet"), "warn"); } return; }
        var key = publishKeyValue();
        if (!key) { if (msg) { setMsg(msg, t("msg.publishKeyNeeded"), "warn"); } return; }
        if (msg) { setMsg(msg, t("pdf.uploading"), "muted"); }
        var reader = new root.FileReader();
        reader.onload = function () {
            var result = String(reader.result || "");
            var comma = result.indexOf(",");
            var base64 = comma >= 0 ? result.slice(comma + 1) : result;
            root.OLRD.sync.saveBookFile(key, "pg_" + pageId, file.name, "application/pdf", base64).then(function (ok) {
                if (ok) {
                    store().updatePage(pageId, { pdf: "pg_" + pageId, pdfName: file.name });
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

    function handlePdfRemove(pageId) {
        var key = publishKeyValue();
        store().updatePage(pageId, { pdf: "", pdfName: "" });
        if (key && root.OLRD.sync && root.OLRD.sync.available()) {
            root.OLRD.sync.deleteBookFile(key, "pg_" + pageId);
        }
        ui().toast(t("pdf.removed"), "ok");
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
        store().subscribe(function () {
            if (dashVisible()) { renderStreamers(); renderBook(); }
            autoPublish();
        });
        root.OLRD.i18n.subscribe(function () {
            if (dashVisible()) { renderStreamers(); renderBook(); }
        });
        store().init().then(function () {
            store().dropStaleDraft();
            if (auth().hasSession()) {
                enterDash();
            } else {
                show($("#admin-dash"), false);
                show($("#admin-login"), true);
            }
        });
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})(typeof self !== "undefined" ? self : this);
