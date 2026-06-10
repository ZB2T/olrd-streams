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
                    var glow = ctx.createRadialGradient(x, m.y, 0, x, m.y, m.r * 4);
                    if (m.ember) {
                        glow.addColorStop(0, "rgba(255, 84, 58, " + flicker + ")");
                        glow.addColorStop(1, "rgba(178, 20, 32, 0)");
                    } else {
                        glow.addColorStop(0, "rgba(212, 204, 188, " + flicker * 0.8 + ")");
                        glow.addColorStop(1, "rgba(212, 204, 188, 0)");
                    }
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(x, m.y, m.r * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
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

    if (doc) {
        if (doc.readyState === "loading") {
            doc.addEventListener("DOMContentLoaded", boot);
        } else {
            boot();
        }
    }

})(typeof self !== "undefined" ? self : this);
