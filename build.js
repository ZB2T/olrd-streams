/*
 * OLRD STREAMERS build step.
 * Copies the static site into dist/ and obfuscates every JS file (variable
 * names prefixed with "zb2t"). The repo holds readable source (kept private);
 * Cloudflare Pages runs this and publishes only the obfuscated dist/.
 */
const fs = require("fs");
const path = require("path");
const Obfuscator = require("javascript-obfuscator");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");

// files / folders at the repo root that must NOT be copied into dist
var SKIP = ["dist", "js", ".git", "node_modules", ".claude", "build.js",
    "package.json", "package-lock.json", "src", ".gitignore", "README.md"];

// brand.js is already obfuscated (the credit guard) — copy it untouched.
var COPY_AS_IS = ["brand.js"];

var OBF_OPTS = {
    compact: true,
    renameGlobals: false,            // keep window.OLRD.* working across files
    transformObjectKeys: false,      // keep the OLRD API object keys intact
    identifierNamesGenerator: "hexadecimal",
    identifiersPrefix: "zb2t",       // every renamed identifier starts with zb2t
    stringArray: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 0.8,
    splitStrings: true,
    splitStringsChunkLength: 8,
    numbersToExpressions: true,
    simplify: true,
    selfDefending: false,            // never brick the site on reformatting
    unicodeEscapeSequence: false
};

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    fs.readdirSync(src, { withFileTypes: true }).forEach(function (e) {
        var s = path.join(src, e.name), d = path.join(dst, e.name);
        if (e.isDirectory()) { copyDir(s, d); }
        else { fs.copyFileSync(s, d); }
    });
}

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

// 1) copy every root entry except the skip list (and js/, handled below)
fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function (e) {
    if (SKIP.indexOf(e.name) !== -1) { return; }
    var s = path.join(ROOT, e.name), d = path.join(OUT, e.name);
    if (e.isDirectory()) { copyDir(s, d); }
    else { fs.copyFileSync(s, d); }
});

// 2) js/: obfuscate every *.js (except the already-obfuscated guard); copy the rest (pdf libs, etc.)
var jsSrc = path.join(ROOT, "js");
var jsOut = path.join(OUT, "js");
fs.mkdirSync(jsOut, { recursive: true });
var obfCount = 0, copyCount = 0;

fs.readdirSync(jsSrc, { withFileTypes: true }).forEach(function (e) {
    var s = path.join(jsSrc, e.name), d = path.join(jsOut, e.name);
    if (e.isDirectory()) { copyDir(s, d); copyCount++; return; }       // js/pdf/*
    if (!/\.js$/.test(e.name) || COPY_AS_IS.indexOf(e.name) !== -1) {
        fs.copyFileSync(s, d); copyCount++; return;
    }
    var code = fs.readFileSync(s, "utf8");
    var out = Obfuscator.obfuscate(code, OBF_OPTS).getObfuscatedCode();
    fs.writeFileSync(d, out, "utf8");
    obfCount++;
});

console.log("build done → dist/  (obfuscated " + obfCount + " js files, copied " + copyCount + " untouched)");
