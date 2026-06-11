(function (root) {
    "use strict";

    var doc = root.document;

    function $(selector, scope) {
        return (scope || doc).querySelector(selector);
    }

    function $all(selector, scope) {
        return Array.prototype.slice.call((scope || doc).querySelectorAll(selector));
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function initials(text) {
        var parts = String(text || "").trim().split(/\s+/).slice(0, 2);
        var out = "";
        for (var i = 0; i < parts.length; i++) {
            if (parts[i]) { out += parts[i].charAt(0).toUpperCase(); }
        }
        return out || "·";
    }

    function formatDate(iso) {
        if (!iso) { return "—"; }
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return "—"; }
        var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        var day = d.getDate();
        return months[d.getMonth()] + " " + (day < 10 ? "0" + day : day) + " · " + d.getFullYear();
    }

    function mountReveal() {
        var nodes = $all("[data-reveal]");
        if (!nodes.length) { return; }
        if (!root.IntersectionObserver) {
            nodes.forEach(function (n) { n.classList.add("is-visible"); });
            return;
        }
        var observer = new root.IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
        nodes.forEach(function (n) { observer.observe(n); });
    }

    var toastStack = null;

    function toast(message, type) {
        if (!toastStack) {
            toastStack = doc.createElement("div");
            toastStack.className = "toast-stack";
            doc.body.appendChild(toastStack);
        }
        var node = doc.createElement("div");
        node.className = "toast toast--" + (type || "ok");
        node.textContent = message;
        toastStack.appendChild(node);
        root.requestAnimationFrame(function () { node.classList.add("is-shown"); });
        root.setTimeout(function () {
            node.classList.remove("is-shown");
            root.setTimeout(function () {
                if (node.parentNode) { node.parentNode.removeChild(node); }
            }, 320);
        }, 2600);
    }

    function makeSortable(list, onReorder) {
        if (!list || list.getAttribute("data-sortable-bound") === "1") { return; }
        list.setAttribute("data-sortable-bound", "1");
        var dragging = null;

        function items() {
            return $all("[data-sort-id]", list);
        }

        function afterElement(y) {
            var els = items().filter(function (el) { return el !== dragging; });
            var closest = null;
            var closestOffset = -Infinity;
            els.forEach(function (el) {
                var box = el.getBoundingClientRect();
                var offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closestOffset) {
                    closestOffset = offset;
                    closest = el;
                }
            });
            return closest;
        }

        list.addEventListener("dragstart", function (e) {
            var item = e.target.closest ? e.target.closest("[data-sort-id]") : null;
            if (!item || !list.contains(item)) { return; }
            dragging = item;
            item.classList.add("is-dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                try { e.dataTransfer.setData("text/plain", item.getAttribute("data-sort-id")); } catch (err) {}
            }
        });

        list.addEventListener("dragover", function (e) {
            if (!dragging) { return; }
            e.preventDefault();
            if (e.dataTransfer) { e.dataTransfer.dropEffect = "move"; }
            var reference = afterElement(e.clientY);
            if (reference == null) { list.appendChild(dragging); }
            else { list.insertBefore(dragging, reference); }
        });

        list.addEventListener("drop", function (e) { e.preventDefault(); });

        list.addEventListener("dragend", function () {
            if (dragging) { dragging.classList.remove("is-dragging"); }
            dragging = null;
            var ids = items().map(function (el) { return el.getAttribute("data-sort-id"); });
            onReorder(ids);
        });
    }

    function readFileAsDataURL(file) {
        return new Promise(function (resolve, reject) {
            if (!file) { reject(new Error("no file")); return; }
            var reader = new root.FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(reader.error); };
            reader.readAsDataURL(file);
        });
    }

    function mountAdminGate() {
        var clicks = 0;
        var timer = null;
        doc.addEventListener("click", function (e) {
            var gate = e.target.closest ? e.target.closest("[data-admin-gate]") : null;
            if (!gate) { return; }
            clicks += 1;
            if (timer) { root.clearTimeout(timer); }
            timer = root.setTimeout(function () { clicks = 0; }, 650);
            if (clicks >= 3) {
                clicks = 0;
                root.location.href = "admin.html";
            }
        });
    }

    function boot() {
        mountReveal();
        mountAdminGate();
    }

    if (doc) {
        if (doc.readyState === "loading") {
            doc.addEventListener("DOMContentLoaded", boot);
        } else {
            boot();
        }
    }

    root.OLRD = root.OLRD || {};
    root.OLRD.ui = {
        $: $,
        $all: $all,
        escapeHtml: escapeHtml,
        initials: initials,
        formatDate: formatDate,
        toast: toast,
        makeSortable: makeSortable,
        readFileAsDataURL: readFileAsDataURL,
        mountReveal: mountReveal
    };

})(typeof self !== "undefined" ? self : this);
