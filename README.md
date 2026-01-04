# 🧠 FBLeadsPro – Facebook Leads Capture Chrome Extension

**FBLeadsPro** is a lightweight Chrome extension that automatically extracts **Facebook lead data** (name, email, phone) from Facebook Ads, Groups, or forms — and syncs it to **Supabase** for cloud storage.

Built for:
- 📈 Facebook marketers & agency owners
- 🧰 SaaS flippers & side hustle builders
- 🚀 Growth teams tracking FB traffic

---

## ⚙️ Features

- 🔍 Auto-detects Facebook name/email/phone fields
- ⚡️ One-click member scraping in groups
- 💾 Saves captured leads to localStorage
- ☁️ Syncs leads to **Supabase** (no backend needed)
- 🪟 Popup UI to view the latest lead captured
- 💡 No external dependencies – 100% Manifest v3
- 🔒 No login required (self-hosted database)

---

## 📸 Screenshot

![Screenshot](public/screenshot.png)

---

## 🧪 How to Install

1. Download or clone this repo
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer Mode**
4. Click **Load Unpacked**
5. Select the `chrome-ext/` folder
6. Visit a Facebook page with a form or member list
7. Use the floating buttons or popup to capture data

---

## 🌐 Supabase Setup (Optional, Recommended)

To sync captured leads to a live database:

1. Create a [Supabase](https://app.supabase.com) project
2. Create a `leads` table with the following columns:

   | Column       | Type              | Default               |
   |--------------|-------------------|------------------------|
   | `id`         | UUID              | `gen_random_uuid()`    |
   | `created_at` | timestamptz       | `now()`                |
   | `name`       | text              | —                      |
   | `email`      | text              | —                      |
   | `phone`      | text              | —                      |
   | `profile`    | text              | —                      |

3. Enable **insert** RLS policy
4. Paste your Supabase URL + Anon Key in `utils/saveToSupabase.js`

---

## 🛠 Tech Stack

- Chrome Extension (Manifest v3)
- Vanilla JS
- Supabase REST API
- LocalStorage
- DOM scraping

---

## 📦 Included Files

chrome-ext/
├── manifest.json
├── popup.html / popup.js
├── inject.js
├── background.js
├── utils/
│ ├── extract.js
│ └── saveToSupabase.js
├── styles.css
├── icon.png
scripts/
├── build-zip.sh
store/
├── description.txt
public/
├── screenshot.png

yaml
Copy code

---

## 🧰 Dev Commands

```bash
# Zip the extension
./scripts/build-zip.sh
