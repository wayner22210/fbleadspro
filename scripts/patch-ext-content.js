/**
 * Patch FBLeadsPro chrome-ext/content.js
 * Fixes:
 *  - accept /groups/<gid>/user/<uid>/ profile links
 *  - normalize those to id:<uid>
 *  - collect members during auto-scroll loop
 *  - remove accidental JS inside cssText() CSS string
 *  - bind close button click explicitly (reliable)
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(process.cwd(), "chrome-ext", "content.js");
if (!fs.existsSync(FILE)) {
  console.error("❌ Not found:", FILE);
  process.exit(1);
}

const src0 = fs.readFileSync(FILE, "utf8");
fs.writeFileSync(FILE + ".bak", src0, "utf8");

function replaceAllFunctionsByName(src, fnName, replacementFnText) {
  let out = src;
  let idx = 0;
  let replaced = 0;

  while (true) {
    const at = out.indexOf(`function ${fnName}(`, idx);
    if (at === -1) break;

    // find the opening "{"
    const braceAt = out.indexOf("{", at);
    if (braceAt === -1) break;

    // brace match to find end
    let depth = 0;
    let end = -1;
    for (let i = braceAt; i < out.length; i++) {
      const ch = out[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) break;

    out = out.slice(0, at) + replacementFnText + out.slice(end + 1);
    idx = at + replacementFnText.length;
    replaced++;
  }

  return { out, replaced };
}

// Unified looksLikeProfileHref that supports FB group-user links
const looksLikeProfileHrefV3 = `function looksLikeProfileHref(href) {
  if (!href) return false;

  try {
    const u = new URL(href, location.origin);
    if (!String(u.hostname || "").includes("facebook.com")) return false;

    const path = u.pathname || "";
    const seg = path.split("/").filter(Boolean);

    // ✅ Group member profile-style links:
    // /groups/<groupId>/user/<userId>/
    if (seg.length >= 4 && seg[0] === "groups" && seg[2] === "user" && /^\\d{6,}$/.test(seg[3])) return true;

    // ✅ profile.php?id=...
    if (path === "/profile.php" && u.searchParams.get("id")) return true;

    // ✅ /user/1000...
    if (seg[0] === "user" && seg[1] && /^\\d{6,}$/.test(seg[1])) return true;

    // ✅ /people/Name/1000...
    if (seg[0] === "people" && seg.length >= 3 && /^\\d{6,}$/.test(seg[seg.length - 1])) return true;

    // ✅ /username (single segment) - keep a small denylist
    const bannedStarts = new Set([
      "groups","help","settings","policies","privacy","terms",
      "marketplace","watch","events","messages","notifications","login","recover",
      "photo","photos","posts","reel","reels","pages"
    ]);

    if (seg.length === 1) {
      const s0 = (seg[0] || "").toLowerCase();
      if (bannedStarts.has(s0)) return false;
      if (s0 === "profile.php") return false;
      if (s0.length < 3 || s0.length > 60) return false;
      return true;
    }

    return false;
  } catch {
    return false;
  }
}`;

// Unified normProfileKey that normalizes group-user links to id:<uid>
const normProfileKeyV3 = `function normProfileKey(href) {
  try {
    const u = new URL(href, location.origin);
    const path = u.pathname || "";
    const seg = path.split("/").filter(Boolean);

    // /groups/<gid>/user/<uid> => id:<uid>
    if (seg.length >= 4 && seg[0] === "groups" && seg[2] === "user" && seg[3]) return \`id:\${seg[3]}\`;

    if (path === "/profile.php" && u.searchParams.get("id")) return \`id:\${u.searchParams.get("id")}\`;
    if (seg[0] === "user" && seg[1]) return \`id:\${seg[1]}\`;
    if (seg[0] === "people" && seg.length >= 3) return \`id:\${seg[seg.length - 1]}\`;
    if (seg.length === 1) return \`u:\${seg[0].toLowerCase()}\`;

    return (u.origin + u.pathname).toLowerCase();
  } catch {
    return String(href || "").toLowerCase();
  }
}`;

// 1) Replace looksLikeProfileHref (both copies)
let s = src0;
{
  const r1 = replaceAllFunctionsByName(s, "looksLikeProfileHref", looksLikeProfileHrefV3);
  s = r1.out;
  console.log("looksLikeProfileHref replaced:", r1.replaced);
}

// 2) Replace normProfileKey (both copies)
{
  const r2 = replaceAllFunctionsByName(s, "normProfileKey", normProfileKeyV3);
  s = r2.out;
  console.log("normProfileKey replaced:", r2.replaced);
}

// 3) Remove accidental JS inside cssText() CSS template under #__fbleadspro_wrap
s = s.replace(
  /#__fbleadspro_wrap\s*\{\s*\n\s*try[\s\S]*?catch\s*\{\s*\}\s*\n\s*position:/m,
  "#__fbleadspro_wrap {\n  position:"
);

// 4) Ensure we collect members during auto-scroll loop (best-effort)
if (!s.includes("__fbleadsproCollectVisibleMembersV1();\n      } catch {}")) {
  s = s.replace(
    /await sleep\(900\);\n/m,
    `await sleep(900);\n\n      // collect members while we scroll (FB virtualizes DOM rows)\n      try {\n        if (typeof window.__fbleadsproCollectVisibleMembersV1 === "function") {\n          window.__fbleadsproCollectVisibleMembersV1();\n        }\n      } catch {}\n`
  );
}

// 5) Bind close button click explicitly after UI injection
if (!s.includes("FBLEADSPRO_CLOSE_BIND_V1")) {
  s = s.replace(
    /document\.body\.appendChild\(wrap\);\n/m,
    `document.body.appendChild(wrap);\n\n    // FBLEADSPRO_CLOSE_BIND_V1 (reliable close binding)\n    try {\n      const btn = document.getElementById("__fbleadspro_close");\n      if (btn) {\n        btn.addEventListener("click", () => {\n          const w = document.getElementById("__fbleadspro_wrap");\n          if (w) w.remove();\n          try { state.isInjected = false; } catch {}\n        });\n      }\n    } catch {}\n`
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✅ Patched:", FILE);
console.log("Backup:", FILE + ".bak");
