/**
 * FBLeadsPro Extract Utils (V3)
 * Goal: extract ONLY real member entries from /groups/.../members
 * Approach:
 *  - find row containers by locating spans that contain "Joined"
 *  - climb to a reasonable parent container
 *  - within that row, pick the best profile link + name (prefer img alt)
 *  - strong filters to avoid nav/ads/system links
 */

function toAbsHref(rawHref) {
  if (!rawHref) return "";
  if (rawHref.startsWith("http")) return rawHref;
  if (rawHref.startsWith("/")) return `${location.origin}${rawHref}`;
  return "";
}

function unwrapFacebookRedirect(absHref) {
  try {
    const u = new URL(absHref);
    if (u.pathname === "/l.php" && u.searchParams.get("u")) {
      return decodeURIComponent(u.searchParams.get("u"));
    }
  } catch {}
  return absHref;
}

function looksLikeProfileHref(href) {
  if (!href) return false;

  try {
    const u = new URL(href, location.origin);
    if (!u.hostname.includes("facebook.com")) return false;

    const path = u.pathname || "";
    const seg = path.split("/").filter(Boolean);

    // profile.php?id=...
    if (path === "/profile.php" && u.searchParams.get("id")) return true;

    // /user/1000...
    if (seg[0] === "user" && seg[1] && /^\d{6,}$/.test(seg[1])) return true;

    // /people/Name/1000...
    if (seg[0] === "people" && seg.length >= 3 && /^\d{6,}$/.test(seg[seg.length - 1])) return true;

    // single segment username
    const banned = new Set([
      "groups","help","settings","policies","privacy","terms",
      "marketplace","watch","events","messages","notifications",
      "login","recover","professional_dashboard","friends",
      "adsmanager","business","asana","jobs","commerce","gaming"
    ]);

    if (seg.length === 1) {
      const s0 = seg[0].toLowerCase();
      if (banned.has(s0)) return false;
      if (s0.length < 3 || s0.length > 60) return false;
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function looksLikeGarbageName(name) {
  const n = (name || "").trim();
  if (!n) return true;
  if (n.length < 2) return true;
  if (n.length > 70) return true;

  const lower = n.toLowerCase();

  // obvious junk / promos
  if (lower.includes(".com") || lower.includes("www.") || lower.includes("http")) return true;

  const bad = [
    "professional dashboard",
    "try asana",
    "help center",
    "group settings",
    "unread",
    "notifications",
    "learn more",
    "see more",
    "loading"
  ];
  if (bad.some(b => lower.includes(b))) return true;

  // must contain letters
  const letters = (n.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) return true;

  return false;
}

function normProfileKey(href) {
  try {
    const u = new URL(href, location.origin);
    const path = u.pathname || "";
    const seg = path.split("/").filter(Boolean);

    if (path === "/profile.php" && u.searchParams.get("id")) return `id:${u.searchParams.get("id")}`;
    if (seg[0] === "user" && seg[1]) return `id:${seg[1]}`;
    if (seg[0] === "people" && seg.length >= 3) return `id:${seg[seg.length - 1]}`;
    if (seg.length === 1) return `u:${seg[0].toLowerCase()}`;

    return (u.origin + u.pathname).toLowerCase();
  } catch {
    return String(href || "").toLowerCase();
  }
}

function pickNameFromRow(rowEl) {
  // Best signal: member avatar img alt is usually the name
  const img = rowEl.querySelector('img[alt]');
  if (img) {
    const alt = (img.getAttribute("alt") || "").trim();
    if (alt && !looksLikeGarbageName(alt) && alt.toLowerCase() !== "profile picture") return alt;
  }

  // Next: profile link aria-label or text
  const anchors = Array.from(rowEl.querySelectorAll("a[href]"));
  for (const a of anchors) {
    const al = (a.getAttribute("aria-label") || "").trim();
    if (al && !looksLikeGarbageName(al)) return al;
    const t = (a.textContent || "").trim();
    if (t && !looksLikeGarbageName(t)) return t;
  }

  return "";
}

function pickProfileHrefFromRow(rowEl) {
  const anchors = Array.from(rowEl.querySelectorAll("a[href]"));
  for (const a of anchors) {
    const abs = unwrapFacebookRedirect(toAbsHref(a.getAttribute("href") || ""));
    if (!abs) continue;
    if (looksLikeProfileHref(abs)) return abs;
  }
  return "";
}

function findMemberRowsByJoinedSpans() {
  const spans = Array.from(document.querySelectorAll("span"));
  const joinedSpans = spans.filter(s => {
    const t = (s.textContent || "").trim();
    return t && /^joined\b/i.test(t); // "Joined last Wednesday", etc
  });

  const rows = [];
  const seen = new Set();

  for (const s of joinedSpans) {
    let el = s;
    // climb up to find a container that includes a profile link + a name signal
    for (let i = 0; i < 8 && el; i++) {
      el = el.parentElement;
      if (!el) break;

      const text = (el.textContent || "").trim();
      if (!text || text.length > 800) continue;

      const profile = pickProfileHrefFromRow(el);
      if (!profile) continue;

      const name = pickNameFromRow(el);
      if (!name) continue;

      const key = `${name}::${normProfileKey(profile)}`;
      if (seen.has(key)) break;
      seen.add(key);

      rows.push(el);
      break;
    }
  }

  return rows;
}

export function extractMembersV3() {
  const rows = findMemberRowsByJoinedSpans();

  const out = [];
  const seen = new Set();

  for (const row of rows) {
    const profile = pickProfileHrefFromRow(row);
    const name = pickNameFromRow(row);

    if (!profile || !name) continue;
    if (looksLikeGarbageName(name)) continue;

    const key = normProfileKey(profile);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      name,
      profile,
      created_at: new Date().toISOString(),
      status: "New",
      phone: null,
      email: null,
      notes: null
    });
  }

  return out;
}
