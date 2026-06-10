(function (root) {
    "use strict";

    var K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

    function digest(message) {
        var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
        var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

        var len = message.length;
        var bitLen = len * 8;
        var withOne = len + 1;
        var total = withOne + ((56 - (withOne % 64) + 64) % 64) + 8;
        var buf = new Uint8Array(total);
        buf.set(message);
        buf[len] = 0x80;

        var hi = Math.floor(bitLen / 0x100000000);
        var lo = bitLen >>> 0;
        buf[total - 8] = (hi >>> 24) & 0xff;
        buf[total - 7] = (hi >>> 16) & 0xff;
        buf[total - 6] = (hi >>> 8) & 0xff;
        buf[total - 5] = hi & 0xff;
        buf[total - 4] = (lo >>> 24) & 0xff;
        buf[total - 3] = (lo >>> 16) & 0xff;
        buf[total - 2] = (lo >>> 8) & 0xff;
        buf[total - 1] = lo & 0xff;

        var w = new Int32Array(64);

        for (var offset = 0; offset < total; offset += 64) {
            var i;
            for (i = 0; i < 16; i++) {
                w[i] = (buf[offset + i * 4] << 24) | (buf[offset + i * 4 + 1] << 16) |
                       (buf[offset + i * 4 + 2] << 8) | (buf[offset + i * 4 + 3]);
            }
            for (i = 16; i < 64; i++) {
                var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
            }

            var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

            for (i = 0; i < 64; i++) {
                var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                var ch = (e & f) ^ (~e & g);
                var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
                var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                var maj = (a & b) ^ (a & c) ^ (b & c);
                var t2 = (S0 + maj) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0;
                d = c; c = b; b = a; a = (t1 + t2) | 0;
            }

            h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
            h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
        }

        var out = new Uint8Array(32);
        var words = [h0, h1, h2, h3, h4, h5, h6, h7];
        for (var j = 0; j < 8; j++) {
            out[j * 4] = (words[j] >>> 24) & 0xff;
            out[j * 4 + 1] = (words[j] >>> 16) & 0xff;
            out[j * 4 + 2] = (words[j] >>> 8) & 0xff;
            out[j * 4 + 3] = words[j] & 0xff;
        }
        return out;
    }

    function hmac(key, message) {
        var block = 64;
        if (key.length > block) { key = digest(key); }
        var pad = new Uint8Array(block);
        pad.set(key);

        var inner = new Uint8Array(block + message.length);
        var outer = new Uint8Array(block + 32);
        for (var i = 0; i < block; i++) {
            inner[i] = pad[i] ^ 0x36;
            outer[i] = pad[i] ^ 0x5c;
        }
        inner.set(message, block);
        var innerHash = digest(inner);
        outer.set(innerHash, block);
        return digest(outer);
    }

    function pbkdf2(password, salt, iterations, dkLen) {
        var hLen = 32;
        var blocks = Math.ceil(dkLen / hLen);
        var output = new Uint8Array(blocks * hLen);
        var block = new Uint8Array(salt.length + 4);
        block.set(salt);

        for (var b = 1; b <= blocks; b++) {
            block[salt.length] = (b >>> 24) & 0xff;
            block[salt.length + 1] = (b >>> 16) & 0xff;
            block[salt.length + 2] = (b >>> 8) & 0xff;
            block[salt.length + 3] = b & 0xff;

            var u = hmac(password, block);
            var t = new Uint8Array(u);
            for (var c = 1; c < iterations; c++) {
                u = hmac(password, u);
                for (var k = 0; k < hLen; k++) { t[k] ^= u[k]; }
            }
            output.set(t, (b - 1) * hLen);
        }
        return output.subarray(0, dkLen);
    }

    function utf8(str) {
        if (typeof TextEncoder !== "undefined") { return new TextEncoder().encode(str); }
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            if (code < 0x80) { bytes.push(code); }
            else if (code < 0x800) { bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f)); }
            else if (code < 0xd800 || code >= 0xe000) {
                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            } else {
                i++;
                code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            }
        }
        return new Uint8Array(bytes);
    }

    var HEX = "0123456789abcdef";

    function toHex(bytes) {
        var s = "";
        for (var i = 0; i < bytes.length; i++) {
            s += HEX[(bytes[i] >>> 4) & 0xf] + HEX[bytes[i] & 0xf];
        }
        return s;
    }

    function fromHex(hex) {
        var out = new Uint8Array(hex.length >> 1);
        for (var i = 0; i < out.length; i++) {
            out[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return out;
    }

    function randomBytes(n) {
        var out = new Uint8Array(n);
        var g = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto :
                (typeof root.msCrypto !== "undefined" ? root.msCrypto : null);
        if (g) { g.getRandomValues(out); return out; }
        if (typeof require === "function") {
            var nodeCrypto = require("crypto");
            var rb = nodeCrypto.randomBytes(n);
            for (var i = 0; i < n; i++) { out[i] = rb[i]; }
            return out;
        }
        throw new Error("secure randomness unavailable");
    }

    function randomHex(n) { return toHex(randomBytes(n)); }

    function timingSafeEqual(a, b) {
        if (a.length !== b.length) { return false; }
        var diff = 0;
        for (var i = 0; i < a.length; i++) { diff |= a.charCodeAt(i) ^ b.charCodeAt(i); }
        return diff === 0;
    }

    function subtleAvailable() {
        return typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.importKey === "function";
    }

    function deriveHex(password, saltHex, iterations, dkLen) {
        var pass = utf8(password);
        var salt = fromHex(saltHex);
        var length = dkLen || 32;
        if (subtleAvailable()) {
            return crypto.subtle.importKey("raw", pass, { name: "PBKDF2" }, false, ["deriveBits"])
                .then(function (key) {
                    return crypto.subtle.deriveBits({
                        name: "PBKDF2",
                        salt: salt,
                        iterations: iterations,
                        hash: "SHA-256"
                    }, key, length * 8);
                })
                .then(function (bits) { return toHex(new Uint8Array(bits)); })
                .catch(function () { return toHex(pbkdf2(pass, salt, iterations, length)); });
        }
        return Promise.resolve(toHex(pbkdf2(pass, salt, iterations, length)));
    }

    var api = {
        sha256: digest,
        hmac: hmac,
        pbkdf2: pbkdf2,
        deriveHex: deriveHex,
        utf8: utf8,
        toHex: toHex,
        fromHex: fromHex,
        randomBytes: randomBytes,
        randomHex: randomHex,
        timingSafeEqual: timingSafeEqual
    };

    root.OLRD = root.OLRD || {};
    root.OLRD.crypto = api;

    if (typeof module !== "undefined" && module.exports) { module.exports = api; }

})(typeof self !== "undefined" ? self : this);
