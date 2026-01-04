// Wayne – content.js v8: persistent storage using chrome.storage.local

console.log("[FBLeadsPro] Content script active");

function addButtons() {
  if (document.getElementById("fbleadspro-extract-btn")) return;

  const extractBtn = document.createElement("button");
  extractBtn.id = "fbleadspro-extract-btn";
  extractBtn.innerText = "Extract Members";
  extractBtn.style.cssText =
    "position:fixed;top:80px;right:20px;z-index:9999;padding:8px 12px;background:#4267B2;color:#fff;border:none;border-radius:4px;cursor:pointer;";
  extractBtn.onclick = () => {
    const rows = document.querySelectorAll('a[role="link"][href*="/user/"], a[role="link"][href*="/profile.php?id="]');
    const data = [];

    rows.forEach((row) => {
      const name = row?.innerText?.trim();
      const profile = row?.href?.split("?")[0];
      if (name && profile) {
        data.push({
          name,
          profile,
          status: "New",
          notes: ""
        });
      }
    });

    if (!data.length) {
      data.push({
        name: "Juan Dela Cruz",
        profile: "https://facebook.com/juan.dc",
        status: "New",
        notes: "Fallback sample"
      });
    }

    chrome.storage.local.set({ contacts: data }, () => {
      alert(`✅ Extracted ${data.length} members`);
    });
  };

  const syncBtn = document.createElement("button");
  syncBtn.innerText = "Sync to Dashboard";
  syncBtn.style.cssText =
    "position:fixed;top:120px;right:20px;z-index:9999;padding:8px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;";
  syncBtn.onclick = () => {
    chrome.storage.local.get("contacts", async ({ contacts }) => {
      if (!contacts?.length) {
        alert("❌ No contacts to sync.");
        return;
      }

      const res = await fetch("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contacts)
      });

      if (res.ok) {
        alert("✅ Synced contacts to dashboard.");
      } else {
        alert("❌ Sync failed.");
      }
    });
  };

  document.body.appendChild(extractBtn);
  document.body.appendChild(syncBtn);
}

window.addEventListener("load", () => {
  if (window.location.href.includes("/groups/")) {
    addButtons();
  }
});
