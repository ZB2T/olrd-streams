(function (root) {
    "use strict";

    var VAULT_KEY = "olrd.vault.v1";
    var GUARD_KEY = "olrd.guard.v1";
    var SESSION_KEY = "olrd.session.v1";

    var DEFAULT_VAULT = {
        salt: "9e8e40edda3298fb993270c0d7b942ac",
        iterations: 310000,
        dkLen: 32,
        hash: "5908a8a93cb0085c6b70590bad34dd43bb9c93038952ed4f0d48f8c2a7f1a75f"
    };

    var THRESHOLD = 5;
    var BASE_LOCK = 20000;
    var MAX_LOCK = 900000;

    function crypto() { return root.OLRD.crypto; }

    function now() {
        try { return new Date().getTime(); }
        catch (e) { return 0; }
    }

    function readVault() {
        var raw;
        try { raw = root.localStorage.getItem(VAULT_KEY); }
        catch (e) { return DEFAULT_VAULT; }
        if (!raw) { return DEFAULT_VAULT; }
        try {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.salt && parsed.hash && parsed.iterations) { return parsed; }
        } catch (e) {}
        return DEFAULT_VAULT;
    }

    function writeVault(vault) {
        try { root.localStorage.setItem(VAULT_KEY, JSON.stringify(vault)); return true; }
        catch (e) { return false; }
    }

    function readGuard() {
        var raw;
        try { raw = root.localStorage.getItem(GUARD_KEY); }
        catch (e) { return { fails: 0, tier: 0, lockUntil: 0 }; }
        if (!raw) { return { fails: 0, tier: 0, lockUntil: 0 }; }
        try {
            var parsed = JSON.parse(raw);
            return {
                fails: parsed.fails || 0,
                tier: parsed.tier || 0,
                lockUntil: parsed.lockUntil || 0
            };
        } catch (e) {
            return { fails: 0, tier: 0, lockUntil: 0 };
        }
    }

    function writeGuard(guard) {
        try { root.localStorage.setItem(GUARD_KEY, JSON.stringify(guard)); }
        catch (e) {}
    }

    function lockState() {
        var guard = readGuard();
        var remaining = guard.lockUntil - now();
        if (remaining > 0) {
            return { locked: true, remaining: remaining, attemptsLeft: 0 };
        }
        return { locked: false, remaining: 0, attemptsLeft: Math.max(0, THRESHOLD - guard.fails) };
    }

    function registerFailure() {
        var guard = readGuard();
        guard.fails += 1;
        if (guard.fails >= THRESHOLD) {
            guard.tier += 1;
            var span = Math.min(BASE_LOCK * Math.pow(2, guard.tier - 1), MAX_LOCK);
            guard.lockUntil = now() + span;
            guard.fails = 0;
        }
        writeGuard(guard);
        return lockState();
    }

    function clearGuard() {
        writeGuard({ fails: 0, tier: 0, lockUntil: 0 });
    }

    function verify(password) {
        var gate = lockState();
        if (gate.locked) {
            return Promise.resolve({ ok: false, locked: true, remaining: gate.remaining });
        }
        var vault = readVault();
        return crypto().deriveHex(password, vault.salt, vault.iterations, vault.dkLen || 32)
            .then(function (derived) {
                if (crypto().timingSafeEqual(derived, vault.hash)) {
                    clearGuard();
                    startSession();
                    return { ok: true };
                }
                var after = registerFailure();
                return {
                    ok: false,
                    locked: after.locked,
                    remaining: after.remaining,
                    attemptsLeft: after.attemptsLeft
                };
            });
    }

    function changePassword(oldPassword, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            return Promise.resolve({ ok: false, error: "weak" });
        }
        if (oldPassword === newPassword) {
            return Promise.resolve({ ok: false, error: "same" });
        }
        var vault = readVault();
        return crypto().deriveHex(oldPassword, vault.salt, vault.iterations, vault.dkLen || 32)
            .then(function (derived) {
                if (!crypto().timingSafeEqual(derived, vault.hash)) {
                    return { ok: false, error: "mismatch" };
                }
                var salt = crypto().randomHex(16);
                var iterations = 310000;
                return crypto().deriveHex(newPassword, salt, iterations, 32).then(function (hash) {
                    var next = { salt: salt, iterations: iterations, dkLen: 32, hash: hash };
                    if (!writeVault(next)) { return { ok: false, error: "storage" }; }
                    clearGuard();
                    return { ok: true };
                });
            });
    }

    function startSession() {
        try { root.sessionStorage.setItem(SESSION_KEY, crypto().randomHex(16)); }
        catch (e) {}
    }

    function hasSession() {
        try { return !!root.sessionStorage.getItem(SESSION_KEY); }
        catch (e) { return false; }
    }

    function endSession() {
        try { root.sessionStorage.removeItem(SESSION_KEY); }
        catch (e) {}
    }

    root.OLRD = root.OLRD || {};
    root.OLRD.auth = {
        verify: verify,
        changePassword: changePassword,
        lockState: lockState,
        hasSession: hasSession,
        endSession: endSession,
        startSession: startSession
    };

})(typeof self !== "undefined" ? self : this);
