const DEFAULT_BASE = "http://localhost:3000";

function normalizeBase(input) {
  const s = String(input || "").trim();
  if (!s) return DEFAULT_BASE;
  return s.replace(/\/+$/, "");
}

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get(["apiBase"]);
  return normalizeBase(apiBase || DEFAULT_BASE);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.type) return sendResponse({ ok: false, error: "Missing msg.type" });

      if (msg.type === "FBLEADSPRO_SET_BASE") {
        const base = normalizeBase(msg.apiBase || DEFAULT_BASE);
        await chrome.storage.local.set({ apiBase: base });
        return sendResponse({ ok: true, apiBase: base });
      }

      if (msg.type === "FBLEADSPRO_GET_BASE") {
        const base = await getApiBase();
        return sendResponse({ ok: true, apiBase: base });
      }

      if (msg.type === "FBLEADSPRO_SYNC_ITEMS") {
        const base = await getApiBase();
        const items = Array.isArray(msg.items) ? msg.items : [];
        if (!items.length) return sendResponse({ ok: false, error: "No items to sync." });

        const resp = await fetch(`${base}/api/fb-contacts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items })
        });

        const text = await resp.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}

        if (!resp.ok) {
          return sendResponse({
            ok: false,
            error: `Sync failed (${resp.status})`,
            detail: json || text
          });
        }

        return sendResponse({ ok: true, result: json || { ok: true } });
      }

      return sendResponse({ ok: false, error: `Unknown type: ${msg.type}` });
    } catch (e) {
      return sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  })();

  return true;
});
