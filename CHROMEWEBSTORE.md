# Campus Copilot — Chrome Web Store Listing & Store Documentation

---

## 1. Extension Metadata

- **Extension Name:** Campus Copilot
- **Short Name:** Campus Copilot
- **Version:** 1.0.0
- **Category:** Productivity / Tools
- **Primary Language:** English
- **Last Updated:** August 23, 2026

---

## 2. Single Purpose Description

> **Autonomous AI Form Copilot for Campus & Student Workflows.**
> Automatically scrapes and auto-fills Google Forms for college registrations, hackathons, mess reviews, and course feedback using student profile data, unorganized WhatsApp announcements, and sentiment preferences powered by Google Gemini AI.

---

## 3. Store Listing Copy

### Short Description (Max 132 chars)
Autonomous AI copilot that auto-fills campus & Google Forms using student vault data, WhatsApp announcements, and Google Gemini AI.

### Detailed Description
Tired of typing your roll number, department, dietary preferences, GitHub links, and repetitive feedback into endless Google Forms?

**Campus Copilot** is the purpose-built AI form assistant designed specifically for university students, campus organizers, and hackathon participants.

#### 🚀 Key Features:
- **Student Identity Vault:** Store your full name, roll number, department, batch, technical skills bio, dietary preferences, and portfolio links securely in your local browser storage.
- **WhatsApp / CR Announcement Parser:** Paste raw, unorganized messages from Class Representatives or organizers (e.g. track selection rules, mentor choices, room numbers, team codes). Campus Copilot understands the context and matches them to form questions automatically.
- **Campus Feedback & Mess Sentiment Slider:** Adjust your sentiment score (from 1 - Terrible to 5 - Outstanding) with custom notes. The AI generates authentic, context-aware reviews for mess food, courses, and faculty feedback forms.
- **Intelligent DOM Auto-Filling:** Injects a sleek, non-intrusive floating quick-action pill right on Google Forms. With one click, Campus Copilot analyzes form questions and fills text fields, textareas, radio buttons, checkboxes, and rating scales.
- **Privacy-First & Secure:** Your API key and personal data are stored exclusively in your browser's `chrome.storage.local`. No third-party servers, tracking, or telemetry.

---

## 4. Permissions Justification

Every permission declared in `manifest.json` is strictly required for core functionality:

| Permission / Host Permission | Plain-English Justification for Chrome Review Team |
|---|---|
| `storage` | Required to store the student's personal vault data (name, roll number, department, dietary preferences, bio, links), user-configured Gemini API key, WhatsApp announcement context, and sentiment preferences locally in `chrome.storage.local`. |
| `activeTab` | Required to detect the active Google Form tab when the user clicks the extension action or requests quick-fill from the dashboard. |
| `scripting` | Required to interact with and inject autofill actions dynamically on active Google Form pages when triggered by the student. |
| `*://docs.google.com/forms/*` | Required to inject the floating autofill pill and read form questions on Google Form URLs so the copilot can assist students in filling them out. |
| `https://generativelanguage.googleapis.com/*` | Required to communicate with the official Google Gemini Flash REST API to generate structured form answers matching the student's vault and WhatsApp instructions. |

---

## 5. Privacy & Data Use Disclosures

- **Personally Identifiable Information (PII):** Name, roll number, email/links entered by the user are stored strictly on the user's local machine via `chrome.storage.local`.
- **Remote Communications:** Personal information and form questions are transmitted solely to the user's designated Google Gemini API endpoint (`generativelanguage.googleapis.com`) to generate form answers.
- **No Third-Party Analytics:** The extension contains zero trackers, analytics SDKs, advertising scripts, or intermediary servers.
- **No Sale of Data:** Student data is never sold, transferred, or used for lending or advertising purposes.

---

## 6. Privacy Policy

**Effective Date:** August 23, 2026

**1. Overview**
Campus Copilot ("the Extension") provides autonomous form-filling assistance for students and campus workflows. We respect your privacy and design our tools with a privacy-first architecture.

**2. Data Collected & Stored Locally**
The Extension stores the following data locally within your browser using the Chrome Storage API:
- Student profile data (Name, Roll Number, Branch, Bio/Skills, Portfolio Links, Dietary Preference)
- WhatsApp announcement notes provided by the user
- Sentiment tone settings and feedback comments
- User-provided Google Gemini API Key

**3. External Data Transmission**
When you explicitly initiate form auto-filling, the Extension sends the scraped form questions and your locally saved profile/context to Google Gemini API (`generativelanguage.googleapis.com`) using your provided API key to compute answers. We do not operate an intermediary server, and no data passes through any third-party infrastructure.

**4. Data Security**
Your credentials and personal information remain within your browser environment. You can modify, export, or delete your data at any time via the Extension Dashboard.

---

## 7. Store Asset Checklist

- [x] Extension Icon: 16×16 px (`icons/icon-16.png`)
- [x] Extension Icon: 48×48 px (`icons/icon-48.png`)
- [x] Extension Icon: 128×128 px (`icons/icon-128.png`)
- [ ] Promotional Tile: 440×280 px
- [ ] Screenshot 1: Dashboard with Student Vault & WhatsApp Parser (1280×800 px)
- [ ] Screenshot 2: Floating Quick-Action Pill on Google Form (1280×800 px)
- [ ] Screenshot 3: One-Click Autofill with highlighted answers (1280×800 px)

---

## 8. Version History

- **v1.0.0 (2026-08-23):** Initial release featuring Student Vault, WhatsApp announcement context parser, Mess review sentiment slider, Gemini Flash JSON mode integration, and Google Forms floating quick-action pill.
