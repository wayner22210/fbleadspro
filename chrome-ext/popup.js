const DEFAULT_BASE = "http://localhost:3000";

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}

function normalizeBase(input) {
  const s = String(input || "").trim();
  if (!s) return DEFAULT_BASE;
  return s.replace(/\/+$/, "");
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

function isFbGroupsUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes("facebook.com") && u.pathname.startsWith("/groups/");
  } catch {
    return false;
  }
}

function isMembersPeopleUrl(url) {
  // FB variants: /groups/<id>/members  OR /groups/<id>/people  OR params like ?view=members
  const s = String(url || "");
  return /\/groups\/[^/]+\/(members|people)/.test(s) || /[?&]view=members/.test(s);
}

async function pingOrInject(tabId) {
  // Try ping; if no receiver, inject content.js and ping again.
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: "FBLEADSPRO_PING" });
    if (res && res.ok) return { ok: true, injected: false };
  } catch (e) {
    // no receiver
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    const res2 = await chrome.tabs.sendMessage(tabId, { type: "FBLEADSPRO_PING" });
    if (res2 && res2.ok) return { ok: true, injected: true };
    return { ok: false, error: "Injected, but still no response." };
  } catch (e2) {
    return { ok: false, error: String(e2 && e2.message ? e2.message : e2) };
  }
}

async function loadSettings() {
  const { apiBase } = await chrome.storage.local.get(["apiBase"]);
  const base = normalizeBase(apiBase || DEFAULT_BASE);
  document.getElementById("apiBase").value = base;
  return base;
}

async function saveSettings() {
  const base = normalizeBase(document.getElementById("apiBase").value);
  await chrome.storage.local.set({ apiBase: base });
  setStatus(`✅ Saved API Base:\n${base}`);
  return base;
}

async function openDashboard() {
  const base = normalizeBase(document.getElementById("apiBase").value);
  const url = `${base}/dashboard/contacts`;
  await chrome.tabs.create({ url });
}

async function doExtract() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return setStatus("❌ No active tab found.");
  if (!isFbGroupsUrl(tab.url)) return setStatus("❌ Not on a Facebook Group page.\nOpen a group, then go to People/Members.");

  if (!isMembersPeopleUrl(tab.url)) {
    return setStatus(
      "⚠️ Wrong page.\nGo to the group’s People/Members tab.\n\nExpected URL like:\n/groups/<group>/members"
    );
  }

  const ping = await pingOrInject(tab.id);
  if (!ping.ok) return setStatus(`❌ Could not reach content script.\n${ping.error || ""}`);

  setStatus(`⏳ Extracting...${ping.injected ? " (injected content.js)" : ""}`);

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "FBLEADSPRO_EXTRACT", targetCount: 200 });
    if (!res || !res.ok) return setStatus(`❌ Extract failed.\n${(res && res.error) || "No response"}`);

    const items = Array.isArray(res.items) ? res.items : [];
    await chrome.storage.local.set({ extractedItems: items, extractedAt: new Date().toISOString() });

    setStatus(`✅ Extracted ${items.length} members.\nReady to Sync.`);
  } catch (e) {
    setStatus(`❌ Extract error:\n${String(e && e.message ? e.message : e)}`);
  }
}

async function doSync() {
  const base = normalizeBase(document.getElementById("apiBase").value);
  const { extractedItems } = await chrome.storage.local.get(["extractedItems"]);
  const items = Array.isArray(extractedItems) ? extractedItems : [];

  if (!items.length) return setStatus("⚠️ Nothing to sync.\nClick Extract first on People/Members tab.");

  setStatus(`⏳ Syncing ${items.length} leads to:\n${base}/api/fb-contacts`);

  try {
    const resp = await fetch(`${base}/api/fb-contacts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* keep text */ }

    if (!resp.ok) {
      return setStatus(`❌ Sync failed (${resp.status}).\n${json ? JSON.stringify(json, null, 2) : text}`);
    }

    const inserted = json && (json.inserted ?? json.added ?? json.created);
    const updated = json && (json.updated ?? json.upserted ?? json.merged);
    if (inserted != null || updated != null) {
      return setStatus(`✅ Sync OK.\ninserted=${inserted ?? "?"} updated=${updated ?? "?"}`);
    }

    setStatus(`✅ Sync OK.\n${json ? JSON.stringify(json, null, 2) : text}`);
  } catch (e) {
    setStatus(`❌ Sync error:\n${String(e && e.message ? e.message : e)}`);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();

  document.getElementById("saveBtn").addEventListener("click", saveSettings);
  document.getElementById("openBtn").addEventListener("click", openDashboard);
  document.getElementById("extractBtn").addEventListener("click", doExtract);
  document.getElementById("syncBtn").addEventListener("click", doSync);

  setStatus("Ready.\nTip: Open Group → People/Members tab first.");
});
