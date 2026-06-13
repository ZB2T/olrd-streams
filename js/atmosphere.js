(function (root) {
    "use strict";

    var doc = root.document;

    function reducedMotion() {
        return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function boot() {
        if (reducedMotion()) { return; }

        var spot = doc.createElement("div");
        spot.className = "spotlight";
        spot.setAttribute("aria-hidden", "true");
        doc.body.appendChild(spot);

        var canvas = doc.createElement("canvas");
        canvas.className = "atmosphere";
        canvas.setAttribute("aria-hidden", "true");
        doc.body.appendChild(canvas);
        var ctx = canvas.getContext("2d");

        function makeGlow(rgb) {
            var s = 48;
            var c = doc.createElement("canvas");
            c.width = s; c.height = s;
            var g = c.getContext("2d");
            var grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            grad.addColorStop(0, "rgba(" + rgb + ",1)");
            grad.addColorStop(1, "rgba(" + rgb + ",0)");
            g.fillStyle = grad;
            g.fillRect(0, 0, s, s);
            return c;
        }
        var emberSprite = makeGlow("255,84,58");
        var dustSprite = makeGlow("212,204,188");

        var dpr = Math.min(root.devicePixelRatio || 1, 2);
        var w = 0;
        var h = 0;
        var motes = [];
        var raf = 0;
        var running = true;

        var spotX = 50;
        var spotY = 38;
        var curSpotX = 50;
        var curSpotY = 38;

        function rand(min, max) { return min + Math.random() * (max - min); }

        function resize() {
            w = root.innerWidth;
            h = root.innerHeight;
            if (ctx) {
                canvas.width = Math.floor(w * dpr);
                canvas.height = Math.floor(h * dpr);
                canvas.style.width = w + "px";
                canvas.style.height = h + "px";
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            seed();
        }

        function seed() {
            var target = Math.round(Math.min(34, Math.max(14, (w * h) / 58000)));
            motes = [];
            for (var i = 0; i < target; i++) { motes.push(spawn(true)); }
        }

        function spawn(scatter) {
            var ember = Math.random() < 0.34;
            return {
                x: rand(0, w),
                y: scatter ? rand(0, h) : h + rand(0, 60),
                r: ember ? rand(0.8, 1.9) : rand(0.5, 1.2),
                vy: rand(0.08, 0.3),
                sway: rand(0.2, 0.9),
                phase: rand(0, Math.PI * 2),
                drift: rand(0.002, 0.008),
                alpha: rand(0.05, ember ? 0.38 : 0.2),
                pulse: rand(0.004, 0.012),
                ember: ember
            };
        }

        function frame() {
            if (!running) { return; }

            curSpotX += (spotX - curSpotX) * 0.12;
            curSpotY += (spotY - curSpotY) * 0.12;
            spot.style.setProperty("--spot-x", curSpotX.toFixed(2) + "%");
            spot.style.setProperty("--spot-y", curSpotY.toFixed(2) + "%");

            if (ctx) {
                ctx.clearRect(0, 0, w, h);
                for (var i = 0; i < motes.length; i++) {
                    var m = motes[i];
                    m.y -= m.vy;
                    m.phase += m.drift;
                    var x = m.x + Math.sin(m.phase) * m.sway * 14;
                    var flicker = m.alpha + Math.sin(m.phase * 6) * m.pulse;
                    if (flicker < 0) { flicker = 0; }
                    if (m.y < -10) { motes[i] = spawn(false); continue; }
                    if (flicker < 0) { flicker = 0; }
                    var sprite = m.ember ? emberSprite : dustSprite;
                    var size = m.r * 8;
                    ctx.globalAlpha = m.ember ? flicker : flicker * 0.8;
                    ctx.drawImage(sprite, x - size / 2, m.y - size / 2, size, size);
                }
                ctx.globalAlpha = 1;
            }

            raf = root.requestAnimationFrame(frame);
        }

        function onMove(e) {
            spotX = (e.clientX / w) * 100;
            spotY = (e.clientY / h) * 100;
        }

        function start() {
            if (running) { return; }
            running = true;
            raf = root.requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            if (raf) { root.cancelAnimationFrame(raf); raf = 0; }
        }

        doc.addEventListener("mousemove", onMove);
        root.addEventListener("resize", resize);
        doc.addEventListener("visibilitychange", function () {
            if (doc.hidden) { stop(); } else { start(); }
        });

        resize();
        raf = root.requestAnimationFrame(frame);
    }

    function bootMenu() {
        var menu = null;
        var openFlag = false;

        function lbl(key, fb) {
            try { var v = root.OLRD.i18n.t(key); return (v && v !== key) ? v : fb; } catch (e) { return fb; }
        }
        function esc(s) {
            return String(s).replace(/[&<>"]/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
            });
        }
        function build() {
            var m = doc.createElement("nav");
            m.className = "rd-menu";
            m.setAttribute("role", "menu");
            m.setAttribute("aria-hidden", "true");
            m.innerHTML =
                '<div class="rd-menu__head">OLRD <span>STREAMERS</span></div>' +
                '<a class="rd-menu__item" href="home" role="menuitem">' + esc(lbl("nav.home", "Home")) + '</a>' +
                '<a class="rd-menu__item" href="streamers" role="menuitem">' + esc(lbl("nav.streamers", "Streamers")) + '</a>' +
                '<a class="rd-menu__item" href="storybook" role="menuitem">' + esc(lbl("nav.story", "Story Book")) + '</a>' +
                '<div class="rd-menu__sep" aria-hidden="true"></div>' +
                '<a class="rd-menu__item" href="https://discord.gg/wSGWmzDu" target="_blank" rel="noopener noreferrer" role="menuitem">Discord</a>' +
                '<a class="rd-menu__item" href="https://x.com/outlawrd" target="_blank" rel="noopener noreferrer" role="menuitem">X</a>';
            m.addEventListener("click", function (e) {
                if (e.target && e.target.closest && e.target.closest(".rd-menu__item")) { hide(); }
            });
            doc.body.appendChild(m);
            return m;
        }
        function show(x, y) {
            if (!menu) { menu = build(); }
            menu.style.left = "-9999px";
            menu.style.top = "-9999px";
            menu.classList.add("is-open");
            menu.setAttribute("aria-hidden", "false");
            openFlag = true;
            var r = menu.getBoundingClientRect();
            var nx = Math.min(x, (root.innerWidth || 0) - r.width - 8);
            var ny = Math.min(y, (root.innerHeight || 0) - r.height - 8);
            menu.style.left = (nx < 6 ? 6 : nx) + "px";
            menu.style.top = (ny < 6 ? 6 : ny) + "px";
        }
        function hide() {
            if (menu && openFlag) {
                menu.classList.remove("is-open");
                menu.setAttribute("aria-hidden", "true");
                openFlag = false;
            }
        }
        doc.addEventListener("contextmenu", function (e) {
            var tg = e.target;
            if (tg && tg.closest && tg.closest("input, textarea, [contenteditable=''], [contenteditable='true']")) { return; }
            e.preventDefault();
            show(e.clientX, e.clientY);
        });
        doc.addEventListener("mousedown", function (e) {
            if (!openFlag || e.button === 2) { return; }
            if (!(e.target && e.target.closest && e.target.closest(".rd-menu"))) { hide(); }
        });
        doc.addEventListener("keydown", function (e) { if (e.key === "Escape") { hide(); } });
        root.addEventListener("scroll", hide, true);
        root.addEventListener("resize", hide);
        root.addEventListener("blur", hide);
    }

    function run() {
        boot();
        try { bootMenu(); } catch (e) {}
    }

    if (doc) {
        if (doc.readyState === "loading") {
            doc.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }
    }

})(typeof self !== "undefined" ? self : this);
