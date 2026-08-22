# 🎓 Campus Copilot

> **Autonomous AI Form Copilot for Campus & Student Workflows**  
> Built as a Chrome Extension (Manifest V3) powered by Google Gemini AI.

![Campus Copilot](icons/icon-128.png)

Campus Copilot ends the nightmare of typing your Roll Number, Branch, GitHub links, dietary preferences, and course reviews into dozens of repetitive Google Forms every semester.

---

## ✨ Features

- 🏛️ **Student Identity Vault:** Persist your full name, roll number, department, graduation batch, technical skills bio, dietary preferences (Veg / Non-Veg / Jain), and portfolio links.
- 📱 **WhatsApp / CR Announcement Parser:** Paste unstructured messages from Class Representatives, hackathon organizers, or faculty. The AI parses the instructions (e.g. track selection, mentor names, lab slots) and matches them to relevant questions.
- 🍲 **Mess Review & Campus Sentiment Slider:** Dial your satisfaction level from 1 (😡 Terrible) to 5 (🤩 Outstanding) with custom feedback notes for instant, authentic reviews.
- ⚡ **Autonomous DOM Injection:** Injects a floating, draggable quick-action pill right into Google Forms with live progress states (`Analyzing...` ➔ `Calling Gemini...` ➔ `Filling...` ➔ `Done! ✅`).
- 🔒 **Privacy-First & Local:** Your Gemini API Key and personal data stay strictly in your browser's local storage (`chrome.storage.local`).

---

## 📂 Project Structure

```
First Hackathon/
├── manifest.json          # Manifest V3 configuration
├── background.js          # Service worker for action click & tab management
├── dashboard.html         # Tailwind CSS Dark-Mode Student Vault & Configuration
├── dashboard.js           # Dashboard controller & Gemini API test logic
├── content.js             # Content script for Google Forms scraping & autofill
├── content.css            # Floating pill & quick drawer styling
├── icons/                 # Extension PNG icons (16x16, 48x48, 128x128)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── test-form.html         # Mock Google Form for offline testing & verification
├── CHROMEWEBSTORE.md      # Store listing, permissions justification & privacy policy
└── README.md              # Documentation & quickstart guide
```

---

## 🚀 How to Install & Load into Chrome

1. Open **Google Chrome** (or any Chromium-based browser like Brave / Edge).
2. Navigate to `chrome://extensions/` in your address bar.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left.
5. Select this project folder (`First Hackathon`).
6. **Campus Copilot** is now installed! The dashboard will open automatically.

---

## ⚙️ How to Use

1. **Configure Student Vault & API Key:**
   - Click the extension icon in Chrome or open `dashboard.html`.
   - Enter your [Google Gemini API Key](https://aistudio.google.com/app/apikey) and click **Test**.
   - Fill in your Student Profile (or click **Fill Demo Data**).
   - Paste any WhatsApp announcement text and set your Mess Sentiment rating.
   - Click **Save Profile & Sync Context**.
2. **Auto-Fill Google Forms:**
   - Open any Google Form (e.g. `https://docs.google.com/forms/...` or the local `test-form.html`).
   - You will see the floating **"✨ Auto-Fill Form"** pill at the top right.
   - Click it or expand the drawer to preview your profile and run AI filling!

---

## 🛡️ Permissions & Security

- `storage`: Storing student profile, API key, and settings locally.
- `activeTab` & `scripting`: Interacting with the active Google Form.
- `*://docs.google.com/forms/*`: Injecting autofill copilot on Google Forms.
- `https://generativelanguage.googleapis.com/*`: Sending questions to Google Gemini REST API.
