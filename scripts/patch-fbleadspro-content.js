/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'chrome-ext', 'content.js');

function read() {
  return fs.readFileSync(FILE, 'utf8');
}

function write(next) {
  fs.writeFileSync(FILE, next, 'utf8');
}

function backup(orig) {
  const bak = FILE + '.bak.' + Date.now();
  fs.writeFileSync(bak, orig, 'utf8');
  console.log('Backup:', bak);
}

function findFunctionRange(src, name) {
  const needle = `function ${name}(`;
  const start = src.indexOf(needle);
  if (start === -1) return null;

  const braceStart = src.indexOf('{', start);
  if (braceStart === -1) return null;

  let i = braceStart;
  let depth = 0;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        if (src[end] === '\n') end++;
        return { start, end };
      }
    }
  }
  return null;
}

const NEW_EXTRACT = `function extractMembersV2() {
  // ✅ IMPORTANT:
  // Facebook group member lists are virtualized (old rows get removed from DOM).
  // So we must accumulate members while scrolling into a cache.
  try {
    if (typeof window.__fbleadsproCollectVisibleMembersV1 === "function") {
      window.__fbleadsproCollectVisibleMembersV1();
    }
  } catch {}

  const out = [];
  const cache = window.__fbleadsproMembersCacheV1;
  if (cache && typeof cache.forEach === "function") {
    cache.forEach((v) => out.push(v));
  }
  return out;
}
`;

const APPEND_MARKER = '/* __FBLEADSPRO_PATCH_V1__ */';

const APPEND_SNIPPET = `
${APPEND_MARKER}
;(function () {
  if (window.__fbleadsproPatchV1Installed) return;
  window.__fbleadsproPatchV1Installed = true;

  // ---- helpers ----
  function nowIso() {
    try { return new Date().toISOString(); } catch { return String(Date.now()); }
  }

  function toAbsHref(href) {
    try { return new URL(href, location.href).toString(); } catch { return href || ""; }
  }

  function unwrapFacebookRedirect(href) {
    try {
      const u = new URL(href);
      // fb redirect: https://l.facebook.com/l.php?u=<encoded>
      if (u.hostname === "l.facebook.com" && u.pathname === "/l.php") {
        const real = u.searchParams.get("u");
        if (real) return toAbsHref(real);
      }
      return href;
    } catch {
      return href || "";
    }
  }

  function normProfileKey(href) {
    try {
      const u = new URL(href);
      u.hash = "";
      // drop tracking params
      ["__cft__", "__tn__", "ref", "refid", "refsrc", "hc_ref", "fbclid"].forEach((k) => u.searchParams.delete(k));
      // keep profile.php?id= if present; otherwise drop query
      if (u.pathname !== "/profile.php") u.search = "";
      // normalize trailing slash
      return u.toString().replace(/\\/$/, "");
    } catch {
      return (href || "").replace(/\\/$/, "");
    }
  }

  function looksLikeProfileHref(href) {
    const h = (href || "").toLowerCase();
    if (!h) return false;
    // reject obvious non-profile links
    if (h.includes("/groups/")) return false;
    if (h.includes("/help/")) return false;
    if (h.includes("/marketplace/")) return false;
    if (h.includes("/watch/")) return false;
    if (h.includes("/reel/")) return false;
    if (h.includes("/gaming/")) return false;
    if (h.includes("/events/")) return false;
    if (h.includes("/settings")) return false;

    // accept common profile patterns
    if (h.includes("facebook.com/profile.php?id=")) return true;
    if (h.includes("facebook.com/user/")) return true;
    if (h.includes("facebook.com/people/")) return true;
    // username style: facebook.com/<something>
    try {
      const u = new URL(href);
      const seg = (u.pathname || "/").split("/").filter(Boolean);
      if (seg.length === 1) {
        const s = seg[0];
        // avoid pages like /groups, /pages, etc handled above
        if (s && s.length >= 3) return true;
      }
    } catch {}
    return false;
  }

  function looksLikeGarbageName(s) {
    const t = (s || "").trim();
    if (!t) return true;
    const low = t.toLowerCase();
    if (low === "profile picture") return true;
    if (low === "add friend") return true;
    if (low.startsWith("joined")) return true;
    if (low.startsWith("added by")) return true;
    if (t.length > 90) return true;
    return false;
  }

  function pickNameFromRow(rowEl, profileHref) {
    // 1) prefer anchor text / aria-label for the profile anchor
    try {
      const anchors = Array.from(rowEl.querySelectorAll("a[href]"));
      for (const a of anchors) {
        const raw = a.getAttribute("href") || "";
        const abs = unwrapFacebookRedirect(toAbsHref(raw));
        if (!abs) continue;
        if (profileHref && normProfileKey(abs) !== normProfileKey(profileHref)) continue;
        const al = (a.getAttribute("aria-label") || "").trim();
        if (al && !looksLikeGarbageName(al)) return al;
        const tx = (a.textContent || "").trim();
        if (tx && !looksLikeGarbageName(tx)) return tx;
      }
    } catch {}

    // 2) img alt often has the name
    try {
      const img = rowEl.querySelector("img[alt]");
      if (img) {
        const alt = (img.getAttribute("alt") || "").trim();
        if (alt && !looksLikeGarbageName(alt)) return alt;
      }
    } catch {}

    // 3) fallback: first good span[dir="auto"]
    try {
      const spans = Array.from(rowEl.querySelectorAll('span[dir="auto"]'));
      for (const sp of spans) {
        const tx = (sp.textContent || "").trim();
        if (tx && !looksLikeGarbageName(tx)) return tx;
      }
    } catch {}

    return "";
  }

  function pickProfileFromRow(rowEl) {
    const anchors = Array.from(rowEl.querySelectorAll("a[href]"));
    for (const a of anchors) {
      const rawHref = a.getAttribute("href") || "";
      const absHref = unwrapFacebookRedirect(toAbsHref(rawHref));
      if (!absHref) continue;
      if (looksLikeProfileHref(absHref)) return absHref;
    }
    return "";
  }

  // ---- member cache ----
  if (!window.__fbleadsproMembersCacheV1) {
    window.__fbleadsproMembersCacheV1 = new Map(); // key -> member obj
  }

  window.__fbleadsproCollectVisibleMembersV1 = function () {
    const main = document.querySelector('div[role="main"]') || document.body;
    // best guess: group member rows
    const rows =
      Array.from(main.querySelectorAll('div[role="listitem"]')).length
        ? Array.from(main.querySelectorAll('div[role="listitem"]'))
        : Array.from(main.querySelectorAll('div[role="article"]'));

    for (const row of rows) {
      const profile = pickProfileFromRow(row);
      if (!profile) continue;
      const key = normProfileKey(profile);
      if (!key) continue;

      const name = pickNameFromRow(row, profile);
      if (!name || looksLikeGarbageName(name)) continue;

      if (!window.__fbleadsproMembersCacheV1.has(key)) {
        window.__fbleadsproMembersCacheV1.set(key, {
          name,
          profile,
          created_at: nowIso(),
          status: "New",
          phone: null,
          email: null,
          notes: null
        });
      }
    }

    return window.__fbleadsproMembersCacheV1;
  };

  // collect on scroll (captures auto-scroll too)
  let t = null;
  document.addEventListener(
    "scroll",
    () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try { window.__fbleadsproCollectVisibleMembersV1(); } catch {}
      }, 120);
    },
    true
  );

  // ---- close button (works even if DOM changes) ----
  function closePanel() {
    const w = document.getElementById("__fbleadspro_wrap");
    if (w) w.remove();
    try {
      window.__fbleadspro_state = window.__fbleadspro_state || {};
      window.__fbleadspro_state.isInjected = false;
    } catch {}
  }

  // If no close button exists, inject one inside the panel/wrap
  function ensureCloseButton() {
    const wrap = document.getElementById("__fbleadspro_wrap");
    if (!wrap) return;

    if (document.getElementById("__fbleadspro_close")) return;

    const btn = document.createElement("button");
    btn.id = "__fbleadspro_close";
    btn.type = "button";
    btn.setAttribute("data-fbleadspro-close", "1");
    btn.setAttribute("aria-label", "Close");
    btn.title = "Close";
    btn.textContent = "×";
    btn.style.cssText =
      "position:absolute;top:10px;right:10px;width:28px;height:28px;border:0;" +
      "border-radius:10px;background:rgba(15,23,42,.06);cursor:pointer;" +
      "font-size:18px;line-height:28px;font-weight:900;color:#0f172a;";

    const host = wrap.querySelector("#__fbleadspro_panel") || wrap.firstElementChild || wrap;
    if (host && host instanceof HTMLElement) {
      const pos = getComputedStyle(host).position;
      if (!pos || pos === "static") host.style.position = "relative";
      host.appendChild(btn);
    }
  }

  // install click handler (capture) for any close element
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!t || !t.closest) return;

      const wrap = document.getElementById("__fbleadspro_wrap");
      if (!wrap) return;

      const hit = t.closest(
        "#__fbleadspro_close,[data-fbleadspro-close],.fbleadspro-close,button[aria-label='Close'],button[title='Close']"
      );
      if (hit && wrap.contains(hit)) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
      }
    },
    true
  );

  // ESC closes too
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const wrap = document.getElementById("__fbleadspro_wrap");
      if (wrap) closePanel();
    }
  });

  // keep trying briefly in case the panel is created later
  let tries = 0;
  const iv = setInterval(() => {
    tries += 1;
    try { ensureCloseButton(); } catch {}
    if (tries > 20) clearInterval(iv); // ~10s
  }, 500);
})();
`;

function patchExtract(src) {
  const r = findFunctionRange(src, 'extractMembersV2');
  if (!r) {
    console.log('❌ Could not find function extractMembersV2() in chrome-ext/content.js');
    return { src, changed: false };
  }
  const next = src.slice(0, r.start) + NEW_EXTRACT + '\n' + src.slice(r.end);
  console.log('✅ Patched extractMembersV2() (now uses scrolling cache)');
  return { src: next, changed: true };
}

function appendPatchSnippet(src) {
  if (src.includes(APPEND_MARKER)) {
    console.log('ℹ️ Patch snippet already present.');
    return { src, changed: false };
  }
  console.log('✅ Appended member-cache + close-button patch snippet');
  return { src: src + '\n\n' + APPEND_SNIPPET + '\n', changed: true };
}

(function main() {
  if (!fs.existsSync(FILE)) {
    console.error('❌ Missing file:', FILE);
    process.exit(1);
  }

  const orig = read();
  backup(orig);

  let src = orig;
  let any = false;

  const a = patchExtract(src);
  src = a.src; any = any || a.changed;

  const b = appendPatchSnippet(src);
  src = b.src; any = any || b.changed;

  if (!any) {
    console.log('⚠️ No changes applied.');
    process.exit(0);
  }

  write(src);
  console.log('✅ Done.');
  console.log('Next: Reload extension (chrome://extensions) + hard refresh FB tab (Ctrl+Shift+R).');
})();
