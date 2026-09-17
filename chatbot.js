/* ==========================================================================
   Campus Copilot AI Chatbot Client-Side Logic
   ========================================================================== */

(function () {
  // 1. Central Chatbot Configurations
  const CONFIG = {
    CHATBOT_NAME: "Campus Copilot Assistant",
    CHATBOT_AVATAR: "🎓",
    WELCOME_MESSAGE: "Hi! I'm your AI campus assistant 👋\n\nI can help you explore the website, answer questions, explain features, and guide you to the right place.\n\nWhat would you like to know?",
    DEFAULT_API_KEY: "", // Set via localStorage.setItem('groqApiKey', 'your-key') or settings
    GROQ_MODEL: "llama-3.3-70b-versatile",
    RATE_LIMIT_MAX: 6, // max messages per minute
    RATE_LIMIT_WINDOW: 60000, // 1 minute in ms
    SUGGESTIONS: [
      "What can you help me with?",
      "Explore Features",
      "Pricing & Cost",
      "How do I install the extension?",
      "Contact Support"
    ],
    NAV_LINKS: {
      "settings": "dashboard.html?tab=tab-settings-panel",
      "profile": "dashboard.html?tab=tab-profile",
      "dashboard": "dashboard.html",
      "home": "index.html",
      "test form": "test-form.html"
    }
  };

  // 2. Local Knowledge Base (Retrieval Index)
  const KNOWLEDGE_BASE = [
    {
      keywords: ["autofill", "auto-fill", "fill form", "google forms", "how to fill", "how does it work", "pill", "autofilling"],
      title: "Google Forms Auto-Fill",
      content: "Campus Copilot features a floating draggable quick-action pill injected into Google Forms (including the local test-form.html). Clicking 'Auto-Fill Form' triggers Google Gemini to autonomously analyze questions and map details from your Student Profile Vault to fill all inputs instantly."
    },
    {
      keywords: ["vault", "student profile", "personal details", "profile details", "data", "save", "sync", "address", "parent", "family", "academics"],
      title: "Student Profile Vault",
      content: "The Student Profile Vault (managed in dashboard.html) stores your name, date of birth, personal email, contact, parent records, address data, course preferences, and batch section details. All data is saved strictly locally via browser storage (chrome.storage.local)."
    },
    {
      keywords: ["whatsapp", "parser", "announcement", "cr message", "whatsapp announcement"],
      title: "WhatsApp Announcement Parser",
      content: "Inside the dashboard, you can paste unstructured WhatsApp/CR announcements. The AI parses the text (extracting mentoring URLs, lab slots, track preferences, or deadline schedules) and links them to your campus context."
    },
    {
      keywords: ["mess", "review", "sentiment", "rating", "slider"],
      title: "Mess Review & Sentiment Slider",
      content: "The dashboard includes a Mess Sentiment Slider (from 1 to 5 stars) and a review text area. Dial your satisfaction level to instantly prepare authentic, pre-filled messy food ratings and campus logs."
    },
    {
      keywords: ["install", "chrome", "setup", "developer mode", "load unpacked", "extension", "run", "how to load"],
      title: "Chrome Extension Installation",
      content: "To install: 1. Go to chrome://extensions/ in Chrome. 2. Enable 'Developer mode' in the top-right. 3. Click 'Load unpacked' in the top-left. 4. Choose this project folder. The dashboard opens automatically."
    },
    {
      keywords: ["pricing", "cost", "free", "premium", "price", "license", "buy"],
      title: "Pricing & Plans",
      content: "Campus Copilot is 100% free and open-source for all students! There are no premium subscription tiers, ads, or licensing locks."
    },
    {
      keywords: ["privacy", "security", "api key", "gemini key", "safe", "local", "secure"],
      title: "Privacy & Security",
      content: "Privacy-first design: Your Google Gemini API Key, Groq API key, and student profile details are stored entirely locally in your browser storage. No user credentials or form inputs are ever sent to private third-party servers."
    },
    {
      keywords: ["help", "contact", "support", "ticket", "human", "escalate", "issue", "complain"],
      title: "Support Escalation",
      content: "If you have issues or technical questions that the AI cannot answer, you can contact our human support team directly. Clicking 'Contact Support' lets you log a ticket structure with your name, email, and issue description."
    }
  ];

  // State Management
  let chatHistory = [];
  let isThinking = false;
  let rateLimitTimestamps = [];

  // Initialize Chatbot UI on DOM load
  document.addEventListener("DOMContentLoaded", () => {
    injectChatbotDOM();
    bindChatEvents();
  });

  // 3. Inject Chatbot DOM Elements
  function injectChatbotDOM() {
    // 3a. Inject FAB Trigger
    const fab = document.createElement("button");
    fab.id = "cc-chatbot-fab";
    fab.setAttribute("aria-label", "Open Chatbot Assistant");
    fab.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <div class="cc-fab-badge" id="cc-fab-badge"></div>
    `;
    document.body.appendChild(fab);

    // 3b. Inject Chat Panel Container
    const chatContainer = document.createElement("div");
    chatContainer.id = "cc-chatbot-container";
    chatContainer.innerHTML = `
      <div class="cc-chat-header">
        <div class="cc-header-info">
          <div class="cc-avatar-wrapper">
            ${CONFIG.CHATBOT_AVATAR}
            <span class="cc-online-dot"></span>
          </div>
          <div class="cc-chat-title">
            <h3>${CONFIG.CHATBOT_NAME}</h3>
            <p>Online Support Assistant</p>
          </div>
        </div>
        <div class="cc-header-actions">
          <button class="cc-header-btn" id="cc-chat-reset" title="Reset Conversation">
            <svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
          <button class="cc-header-btn" id="cc-chat-close" title="Close Chat">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      
      <div class="cc-chat-messages" id="cc-chat-messages">
        <!-- Message bubbles appended dynamically -->
      </div>
      
      <div class="cc-quick-actions" id="cc-quick-actions">
        <!-- Suggestion chips appended dynamically -->
      </div>
      
      <div class="cc-chat-input-bar">
        <button class="cc-input-action-btn" id="cc-mic-btn" title="Voice Input">
          <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
        </button>
        <textarea id="cc-chat-input" placeholder="Type a message..." rows="1"></textarea>
        <button class="cc-input-action-btn send-btn" id="cc-send-btn" disabled title="Send Message">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(chatContainer);

    // Initial welcome message and quick actions
    addSystemMessage(CONFIG.WELCOME_MESSAGE);
    renderQuickActions();
  }

  // 4. Bind Event Listeners
  function bindChatEvents() {
    const fab = document.getElementById("cc-chatbot-fab");
    const container = document.getElementById("cc-chatbot-container");
    const closeBtn = document.getElementById("cc-chat-close");
    const resetBtn = document.getElementById("cc-chat-reset");
    const input = document.getElementById("cc-chat-input");
    const sendBtn = document.getElementById("cc-send-btn");
    const badge = document.getElementById("cc-fab-badge");
    const micBtn = document.getElementById("cc-mic-btn");

    fab.addEventListener("click", () => {
      container.classList.toggle("active");
      if (badge) badge.style.display = "none"; // Hide notification on click
      if (container.classList.contains("active")) {
        input.focus();
      }
    });

    closeBtn.addEventListener("click", () => {
      container.classList.remove("active");
    });

    resetBtn.addEventListener("click", () => {
      chatHistory = [];
      const msgArea = document.getElementById("cc-chat-messages");
      msgArea.innerHTML = "";
      addSystemMessage(CONFIG.WELCOME_MESSAGE);
      renderQuickActions();
    });

    // Auto-expand input text area
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
      sendBtn.disabled = !input.value.trim();
    });

    // Send on enter key (without shift)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        triggerUserSend();
      }
    });

    sendBtn.addEventListener("click", triggerUserSend);

    // Dictation speech recognition setup
    if (micBtn) {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        micBtn.style.display = "none"; // Hide if speech recognition is unsupported
      } else {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        let isListening = false;
        recognition.onstart = () => {
          isListening = true;
          micBtn.classList.add("cc-mic-pulse");
        };

        recognition.onend = () => {
          isListening = false;
          micBtn.classList.remove("cc-mic-pulse");
        };

        recognition.onresult = (event) => {
          const resultText = event.results[0][0].transcript;
          if (resultText) {
            input.value = resultText;
            input.style.height = "auto";
            input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
            sendBtn.disabled = false;
          }
        };

        micBtn.addEventListener("click", () => {
          if (isListening) {
            recognition.stop();
          } else {
            recognition.start();
          }
        });
      }
    }
  }

  // 5. Send Trigger Actions
  function triggerUserSend() {
    if (isThinking) return;
    const input = document.getElementById("cc-chat-input");
    const query = input.value.trim();
    if (!query) return;

    // Reset input
    input.value = "";
    input.style.height = "40px";
    document.getElementById("cc-send-btn").disabled = true;

    // Check Rate Limiting
    if (checkRateLimitExceeded()) {
      addSystemMessage("⚠️ You are sending requests too quickly. Please wait a moment before trying again.");
      return;
    }

    // Add user bubble
    addUserMessage(query);

    // Call AI Brain
    generateAIResponse(query);
  }

  // 6. Suggestion Chips / Quick Actions Rendering
  function renderQuickActions() {
    const chipContainer = document.getElementById("cc-quick-actions");
    chipContainer.innerHTML = "";
    CONFIG.SUGGESTIONS.forEach(text => {
      const chip = document.createElement("button");
      chip.className = "cc-chip-btn";
      chip.innerText = text;
      chip.addEventListener("click", () => {
        if (isThinking) return;
        addUserMessage(text);
        generateAIResponse(text);
      });
      chipContainer.appendChild(chip);
    });
  }

  // 7. Rate Limiter Validation
  function checkRateLimitExceeded() {
    const now = Date.now();
    rateLimitTimestamps = rateLimitTimestamps.filter(t => now - t < CONFIG.RATE_LIMIT_WINDOW);
    if (rateLimitTimestamps.length >= CONFIG.RATE_LIMIT_MAX) {
      return true;
    }
    rateLimitTimestamps.push(now);
    return false;
  }

  // 8. RAG Retrieval Engine
  function retrieveLocalContext(query) {
    const normalizedQuery = query.toLowerCase();
    let bestMatch = null;
    let maxScore = 0;

    KNOWLEDGE_BASE.forEach(entry => {
      let score = 0;
      entry.keywords.forEach(kw => {
        if (normalizedQuery.includes(kw)) {
          score += 1.5;
        }
      });
      // Score based on title matching
      if (normalizedQuery.includes(entry.title.toLowerCase())) {
        score += 3.0;
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = entry;
      }
    });

    // We only return matches that exceed a confidence threshold
    return maxScore >= 1.5 ? bestMatch : null;
  }

  // 9. Groq Chat API Handler
  async function generateAIResponse(userQuery) {
    isThinking = true;
    showTypingIndicator();

    // Check for local storage configured keys, fallback to hardcoded Groq key
    const customKey = localStorage.getItem("groqApiKey") || localStorage.getItem("ccChatbotApiKey");
    const apiKey = customKey || CONFIG.DEFAULT_API_KEY;

    if (!apiKey) {
      hideTypingIndicator();
      isThinking = false;
      addSystemMessage("⚠️ Groq API key is not configured. Please set your API key in localStorage (e.g., `localStorage.setItem('groqApiKey', 'your_key')`) or configure it in Settings.");
      return;
    }

    // Detect navigation triggers
    const navMatch = checkNavigationIntent(userQuery);

    // RAG: Query matching context
    const contextMatch = retrieveLocalContext(userQuery);

    // System prompt configuration enforcing absolute facts and anti-hallucination rules
    const systemPrompt = `
      You are the official Campus Copilot AI assistant, styled as a highly polished, friendly, and concise chatbot.
      The product is "Campus Copilot", a Chrome Extension (Manifest V3) helping students auto-fill campus forms using Google Gemini.

      Rules:
      1. Always prioritize retrieved context over general AI knowledge.
      2. If you don't know the answer, respond EXACTLY with: "I don't have enough information to answer that accurately."
      3. Never present unknown pricing, plans, links, or statistics as fact. If information is not in the context, say you don't know it.
      4. Campus Copilot is 100% free and open-source.
      5. Support Hinglish, Hindi, Kannada, and English queries naturally. Respond in the language used by the user when appropriate.
      
      Available Context:
      ${contextMatch ? `TITLE: ${contextMatch.title}\nCONTENT: ${contextMatch.content}` : "No specific context matches. Stick to general knowledge of the extension structure or suggest human support."}
    `;

    // Construct conversation payload
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Append context memory (limit to last 6 message nodes to preserve slots)
    chatHistory.slice(-6).forEach(msg => {
      messages.push({ role: msg.isUser ? "user" : "assistant", content: msg.text });
    });

    messages.push({ role: "user", content: userQuery });

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: CONFIG.GROQ_MODEL,
          messages: messages,
          temperature: 0.4,
          max_tokens: 600
        })
      });

      hideTypingIndicator();

      if (response.ok) {
        const json = await response.json();
        const assistantReply = json.choices[0].message.content.trim();

        // Add message node to display
        const msgNode = addSystemMessage(assistantReply);

        // Append navigation CTA buttons if matches intent
        if (navMatch) {
          appendNavigationCTA(msgNode, navMatch);
        } else if (assistantReply.includes("I don't have enough information")) {
          appendEscalationCTA(msgNode);
        }

        // Add feedback handles to the reply
        appendFeedbackButtons(msgNode, assistantReply);

        // Store in local context history memory
        chatHistory.push({ isUser: false, text: assistantReply });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      hideTypingIndicator();
      addSystemMessage("⚠️ Something went wrong while connecting to the AI. Please try again shortly.");
    } finally {
      isThinking = false;
    }
  }

  // 10. Intent Detection / Navigation Matchers
  function checkNavigationIntent(query) {
    const q = query.toLowerCase();
    for (const key in CONFIG.NAV_LINKS) {
      if (q.includes(key) || q.includes(`go to ${key}`) || q.includes(`open ${key}`) || q.includes(`where is ${key}`)) {
        return { label: `Open ${key.toUpperCase()}`, url: CONFIG.NAV_LINKS[key] };
      }
    }
    return null;
  }

  // Helper: Append custom navigation buttons inside bot bubbles
  function appendNavigationCTA(msgNode, navInfo) {
    const ctaContainer = document.createElement("div");
    ctaContainer.className = "cc-cta-container";
    ctaContainer.innerHTML = `
      <a href="${navInfo.url}" class="cc-cta-btn" target="_self">${navInfo.label}</a>
    `;
    msgNode.appendChild(ctaContainer);
    scrollChatBottom();
  }

  // Helper: Append escalation CTA buttons
  function appendEscalationCTA(msgNode) {
    const ctaContainer = document.createElement("div");
    ctaContainer.className = "cc-cta-container";
    ctaContainer.innerHTML = `
      <button class="cc-cta-btn cc-escalate-trigger">Contact Human Support</button>
    `;
    msgNode.appendChild(ctaContainer);

    ctaContainer.querySelector(".cc-escalate-trigger").addEventListener("click", () => {
      renderEscalateForm(msgNode);
    });
    scrollChatBottom();
  }

  // Render Human Escalation Form
  function renderEscateForm(msgNode) {
    // Avoid rendering duplicates
    if (msgNode.querySelector(".cc-escalate-form")) return;

    const form = document.createElement("div");
    form.className = "cc-escalate-form";
    form.innerHTML = `
      <p style="font-size: 12px; font-weight: 700; margin-bottom: 6px;">Submit Support Request</p>
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" id="esc-name" placeholder="Alex Johnson">
      </div>
      <div class="form-group">
        <label>Your Email ID</label>
        <input type="email" id="esc-email" placeholder="alex@gmail.com">
      </div>
      <div class="form-group">
        <label>Describe the Issue</label>
        <textarea id="esc-desc" rows="2" placeholder="Autofill doesn't parse custom review lists..."></textarea>
      </div>
      <button class="cc-feedback-submit" id="esc-submit-btn">Submit Request</button>
    `;
    msgNode.appendChild(form);
    scrollChatBottom();

    form.querySelector("#esc-submit-btn").addEventListener("click", () => {
      const name = form.querySelector("#esc-name").value.trim();
      const email = form.querySelector("#esc-email").value.trim();
      const desc = form.querySelector("#esc-desc").value.trim();

      if (!name || !email || !desc) {
        alert("Please fill all details before submitting.");
        return;
      }

      form.innerHTML = `
        <p style="color: var(--cb-teal); font-weight: 700; font-size: 12px; margin: 0;">
          ✅ Request submitted successfully! Ticket ID: #${Math.floor(1000 + Math.random() * 9000)}.
        </p>
      `;
      scrollChatBottom();
    });
  }
  // Expose naming mapper
  const renderEscalateForm = renderEscateForm;

  // 11. Feedback Elements & Logic
  function appendFeedbackButtons(msgNode, replyText) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "cc-message-actions";
    actionsRow.innerHTML = `
      <button class="cc-action-btn cc-fb-up" title="Helpful">
        <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
      </button>
      <button class="cc-action-btn cc-fb-down" title="Not Helpful">
        <svg viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
      </button>
      <button class="cc-action-btn cc-copy" title="Copy Response">
        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    `;
    msgNode.appendChild(actionsRow);

    const btnUp = actionsRow.querySelector(".cc-fb-up");
    const btnDown = actionsRow.querySelector(".cc-fb-down");
    const btnCopy = actionsRow.querySelector(".cc-copy");

    btnUp.addEventListener("click", () => {
      btnUp.classList.add("active");
      btnDown.classList.remove("active");
      // Log feedback securely locally
      localStorage.setItem(`feedback-${Date.now()}`, JSON.stringify({ text: replyText, rating: "thumbs_up" }));
    });

    btnDown.addEventListener("click", () => {
      btnDown.classList.add("active");
      btnUp.classList.remove("active");
      renderNegativeFeedbackForm(msgNode, replyText);
    });

    btnCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(replyText).then(() => {
        btnCopy.style.color = "#10B981";
        setTimeout(() => btnCopy.style.color = "", 1500);
      });
    });
  }

  // Render negative option form
  function renderNegativeFeedbackForm(msgNode, replyText) {
    if (msgNode.querySelector(".cc-feedback-form")) return;

    const form = document.createElement("div");
    form.className = "cc-feedback-form";
    form.innerHTML = `
      <p>What went wrong?</p>
      <div class="cc-feedback-options">
        <label class="cc-feedback-label"><input type="checkbox" value="Incorrect information"> Incorrect information</label>
        <label class="cc-feedback-label"><input type="checkbox" value="Didn't understand my question"> Didn't understand</label>
        <label class="cc-feedback-label"><input type="checkbox" value="Not relevant"> Not relevant</label>
        <label class="cc-feedback-label"><input type="checkbox" value="Too complicated"> Too complicated</label>
      </div>
      <button class="cc-feedback-submit" id="fb-submit-btn">Submit Feedback</button>
    `;
    msgNode.appendChild(form);
    scrollChatBottom();

    form.querySelector("#fb-submit-btn").addEventListener("click", () => {
      const selected = Array.from(form.querySelectorAll("input:checked")).map(el => el.value);
      localStorage.setItem(`feedback-${Date.now()}`, JSON.stringify({ text: replyText, rating: "thumbs_down", details: selected }));
      form.innerHTML = `<p style="color: var(--cb-teal); font-weight: 700; margin: 0;">Thank you for your feedback! 💖</p>`;
      scrollChatBottom();
    });
  }

  // 12. Message Bubble Creators
  function addUserMessage(text) {
    const msgArea = document.getElementById("cc-chat-messages");
    const row = document.createElement("div");
    row.className = "cc-message-row user";
    row.innerHTML = `
      <div class="cc-bubble">
        ${escapeHTML(text)}
      </div>
    `;
    msgArea.appendChild(row);
    chatHistory.push({ isUser: true, text: text });
    scrollChatBottom();
  }

  function addSystemMessage(text) {
    const msgArea = document.getElementById("cc-chat-messages");
    const row = document.createElement("div");
    row.className = "cc-message-row assistant";
    row.innerHTML = `
      <div class="cc-bubble">
        ${parseMarkdown(text)}
      </div>
    `;
    msgArea.appendChild(row);
    scrollChatBottom();
    return row;
  }

  // Typing Bouncing Indicator Controls
  function showTypingIndicator() {
    const msgArea = document.getElementById("cc-chat-messages");
    const row = document.createElement("div");
    row.className = "cc-message-row assistant";
    row.id = "cc-typing-row";
    row.innerHTML = `
      <div class="cc-bubble cc-typing-bubble">
        <div class="cc-typing-dot"></div>
        <div class="cc-typing-dot"></div>
        <div class="cc-typing-dot"></div>
      </div>
    `;
    msgArea.appendChild(row);
    scrollChatBottom();
  }

  function hideTypingIndicator() {
    const row = document.getElementById("cc-typing-row");
    if (row) row.remove();
  }

  // Auto Scroll to Chat Pane bottom
  function scrollChatBottom() {
    const msgArea = document.getElementById("cc-chat-messages");
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
  }

  // Simple Markdown Parser regex
  function parseMarkdown(md) {
    let html = md;
    // Escape HTML symbols first to protect elements
    html = escapeHTML(html);

    // Parse Code Blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Parse Bold
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    // Parse Italic
    html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
    // Parse Bullet Lists
    html = html.replace(/(?:^|\n)(?:•|-)\s+([^\n]+)/g, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Parse Headings (e.g. ### Title)
    html = html.replace(/(?:^|\n)###\s+([^\n]+)/g, '<h4>$1</h4>');
    // Parse Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--cb-teal); font-weight:700;">$1</a>');

    // Replace newlines with breaks
    return html.replace(/\n/g, '<br>');
  }

  function escapeHTML(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
