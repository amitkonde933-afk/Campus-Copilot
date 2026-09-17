(function () {
  if (document.getElementById('campus-copilot-root')) return;

  // Global Defaults
  let vault = {
    fullName: "Debojyoti Dhar",
    rollNo: "26BCS10220",
    numericRoll: "10220",
    phoneNumber: "9883593329",
    gradYear: "2030",
    batchSection: "A",
    collegeEmail: "debojyoti.26bcs10220@sst.scaler.com",
    bio: "Full-Stack Developer & AI Systems Engineer proficient in React, Next.js, Node.js, Python, Chrome Extensions, Google Gemini API, and distributed cloud systems.",
    sentimentNotes: "Food quality is hygienic and nutritious. Hostel facilities and Wi-Fi are well maintained.",
    sentimentSlider: "4"
  };

  // Sync with Storage
  function syncStorage() {
    chrome.storage.local.get(null, (data) => {
      if (data) vault = { ...vault, ...data };
    });
  }
  syncStorage();
  chrome.storage.onChanged.addListener(syncStorage);

  // Mount Floating Glass Pill
  const root = document.createElement('div');
  root.id = 'campus-copilot-root';
  root.innerHTML = `
    <div class="cc-pill" id="ccPill">
      <div class="cc-logo">
        <svg viewBox="0 0 512 512" style="width: 22px; height: 22px; display: block;">
          <rect width="512" height="512" rx="128" fill="#2A9D8F" />
          <path d="M 280 100 C 170 100, 100 170, 100 280 C 100 390, 170 460, 280 460" fill="none" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round" />
          <path d="M 280 180 C 210 180, 170 220, 170 280 C 170 340, 210 380, 280 380" fill="none" stroke="#FFFFFF" stroke-width="30" stroke-linecap="round" opacity="0.9" />
          <circle cx="280" cy="280" r="28" fill="#FFFFFF" />
          <path d="M 240 280 L 280 320 L 370 210" fill="none" stroke="#FAB1A0" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <span id="ccStatusText">Campus Copilot</span>
      <button class="cc-action-btn" id="ccRunFillBtn">⚡ Auto-Fill</button>
      <button class="cc-mic-btn" id="ccVoiceBtn" title="Speak into focused field">🎙️</button>
    </div>
  `;
  document.body.appendChild(root);

  // High-Precision Human Typing Simulator (Fixes Google Forms required validation & overlapping placeholders)
  function fillGoogleFormsInput(inputEl, value) {
    if (!inputEl) return;

    inputEl.focus();
    inputEl.click();

    // Method 1: Simulate human typing via document.execCommand (clears placeholders & updates Google Form state)
    inputEl.select();
    const success = document.execCommand('insertText', false, value);

    // Method 2: Native Prototype Setter Fallback (if execCommand is blocked)
    if (!success || inputEl.value !== value) {
      const prototype = inputEl instanceof HTMLTextAreaElement 
        ? window.HTMLTextAreaElement.prototype 
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      
      if (nativeSetter) {
        nativeSetter.call(inputEl, value);
      } else {
        inputEl.value = value;
      }

      inputEl.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        cancelable: true,
        data: value,
        inputType: 'insertText'
      }));
    }

    // Trigger change and blur to finalize validation
    inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
  }

  function triggerGoogleFormsOptionClick(element) {
    if (!element) return;
    const target = element.matches('[role="radio"], [role="checkbox"]')
      ? element
      : (element.querySelector('[role="radio"], [role="checkbox"]') || element);

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
      target.dispatchEvent(new MouseEvent(evtType, { bubbles: true, cancelable: true, view: window }));
    });
    if (typeof target.click === 'function') target.click();
  }

  // Ticks Google Forms email consent
  function checkEmailDisclaimer() {
    const checkboxes = document.querySelectorAll('div[role="checkbox"][aria-checked="false"]');
    checkboxes.forEach(cb => {
      const text = cb.textContent.toLowerCase();
      if (text.includes('record') || text.includes('email') || text.includes('included with my response')) {
        triggerGoogleFormsOptionClick(cb);
      }
    });
  }

  // Deterministic Local Heuristic Fallback Engine
  function runDeterministicLocalFill(cards) {
    cards.forEach(card => {
      const titleEl = card.querySelector('div[role="heading"], .M7eMe, .freebirdFormviewerComponentsQuestionBaseTitle');
      const text = (titleEl ? titleEl.textContent : '').toLowerCase();
      const descEl = card.querySelector('.M7eMe + div, .freebirdFormviewerComponentsQuestionBaseDescription');
      const desc = (descEl ? descEl.textContent : '').toLowerCase();

      // 1. Roll / Registration Number
      if (text.includes('roll') || text.includes('registration') || text.includes('id number')) {
        const textInput = card.querySelector('input[type="text"], textarea');
        if (text.includes('10760') || text.includes('ex:') || desc.includes('greater than 0') || desc.includes('number')) {
          fillGoogleFormsInput(textInput, vault.numericRoll || "10220");
        } else {
          fillGoogleFormsInput(textInput, vault.rollNo || "26BCS10220");
        }
        return;
      }

      // 2. Full Name
      if (text.includes('name') && !text.includes('team') && !text.includes('mentor')) {
        fillGoogleFormsInput(card.querySelector('input[type="text"], textarea'), vault.fullName || "Debojyoti Dhar");
        return;
      }

      // 3. Contact / Phone Number
      if (text.includes('contact') || text.includes('phone') || text.includes('mobile') || text.includes('whatsapp')) {
        fillGoogleFormsInput(card.querySelector('input[type="text"], textarea'), vault.phoneNumber || "9883593329");
        return;
      }

      // 4. College Email
      if (text.includes('email') && !card.querySelector('div[role="checkbox"]')) {
        fillGoogleFormsInput(card.querySelector('input[type="text"], input[type="email"], textarea'), vault.collegeEmail || "debojyoti.26bcs10220@sst.scaler.com");
        return;
      }

      // 5. Experience / Bio / Skills / Organizing
      if (text.includes('experience') || text.includes('bio') || text.includes('past') || text.includes('skills') || text.includes('contribute') || text.includes('about you')) {
        fillGoogleFormsInput(card.querySelector('textarea, input[type="text"]'), vault.bio);
        return;
      }

      // 6. Mess / Feedback Notes
      if (text.includes('feedback') || text.includes('food') || text.includes('mess') || text.includes('suggestion') || text.includes('review')) {
        fillGoogleFormsInput(card.querySelector('textarea, input[type="text"]'), vault.sentimentNotes);
        return;
      }

      // 7. Year Selection (Radios)
      if (text.includes('year') || text.includes('grad')) {
        const targetYear = (vault.gradYear || "2030").toLowerCase();
        const options = Array.from(card.querySelectorAll('div[role="radio"], .docssharedWizTogglelabeledContainer, .bz0duf'));
        for (const opt of options) {
          if (opt.textContent.trim().toLowerCase().includes(targetYear) || opt.getAttribute('data-value') === targetYear) {
            triggerGoogleFormsOptionClick(opt);
            break;
          }
        }
        return;
      }

      // 8. Batch / Section Selection (Radios)
      if (text.includes('batch') || text.includes('section')) {
        const targetBatch = (vault.batchSection || "A").trim().toLowerCase();
        const options = Array.from(card.querySelectorAll('div[role="radio"], .docssharedWizTogglelabeledContainer, .bz0duf'));
        for (const opt of options) {
          const optText = opt.textContent.trim().toLowerCase();
          const optVal = (opt.getAttribute('data-value') || '').trim().toLowerCase();
          if (optText === targetBatch || optVal === targetBatch || optText.split('\n')[0].trim().toLowerCase() === targetBatch) {
            triggerGoogleFormsOptionClick(opt);
            break;
          }
        }
        return;
      }

      // 9. Generic Radio / Checkbox Option Fallback (e.g., Track or Dietary)
      const anyOptions = Array.from(card.querySelectorAll('div[role="radio"], div[role="checkbox"], .docssharedWizTogglelabeledContainer'));
      if (anyOptions.length > 0) {
        triggerGoogleFormsOptionClick(anyOptions[0]);
      }
    });
  }

  // Master Auto-Fill Click Handler
  document.getElementById('ccRunFillBtn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const statusText = document.getElementById('ccStatusText');
    statusText.innerText = '⚡ Filling Form...';

    // Immediate Email Disclaimer Tick
    checkEmailDisclaimer();

    const cards = Array.from(document.querySelectorAll('div[role="listitem"], .geS5n, .freebirdFormviewerViewNumberedItemContainer, .Qr7Oae'));
    
    // Fallback immediately if no questions found
    if (cards.length === 0) {
      statusText.innerText = '✨ Completed';
      setTimeout(() => { statusText.innerText = 'Campus Copilot'; }, 2000);
      return;
    }

    const questions = [];
    cards.forEach((card, idx) => {
      const titleEl = card.querySelector('div[role="heading"], .M7eMe, .freebirdFormviewerComponentsQuestionBaseTitle');
      const title = titleEl ? titleEl.textContent.trim() : '';
      if (!title) return;

      const descEl = card.querySelector('.M7eMe + div, .freebirdFormviewerComponentsQuestionBaseDescription');
      const hint = descEl ? descEl.textContent.trim() : '';

      const optionEls = Array.from(card.querySelectorAll('div[role="radio"], div[role="checkbox"], .docssharedWizTogglelabeledLabelText'));
      const options = optionEls.map(o => o.textContent.trim() || o.getAttribute('data-value') || '').filter(Boolean);

      questions.push({ index: idx, title, hint, options });
    });

    const apiKey = vault.geminiApiKey || vault.apiKey || '';
    const prompt = `You are Campus Copilot filling this university form for ${vault.fullName}.
Profile: Name: ${vault.fullName}, Roll: ${vault.rollNo}, Digits Roll: ${vault.numericRoll}, Phone: ${vault.phoneNumber}, Year: ${vault.gradYear}, Batch: ${vault.batchSection}, Email: ${vault.collegeEmail}, Bio: ${vault.bio}, Notes: ${vault.sentimentNotes}
Questions: ${JSON.stringify(questions)}
Return strictly JSON object mapping index to answers: { "0": "val", "1": "val" }`;

    // Try Gemini API first
    chrome.runtime.sendMessage({ action: 'GENERATE_FORM_ANSWERS', prompt, apiKey }, (res) => {
      if (res && res.success && res.answers) {
        const answers = res.answers;
        Object.keys(answers).forEach((k) => {
          const idx = parseInt(k);
          const card = cards[idx];
          const val = String(answers[k]).trim();
          if (!card) return;

          // Try option click
          const optionContainers = Array.from(card.querySelectorAll('div[role="radio"], div[role="checkbox"], .docssharedWizTogglelabeledContainer, .bz0duf'));
          let clicked = false;
          for (const opt of optionContainers) {
            const optText = opt.textContent.trim().toLowerCase();
            const optVal = (opt.getAttribute('data-value') || '').trim().toLowerCase();
            const target = val.toLowerCase();
            if (optText === target || optVal === target || optText.split('\n')[0].trim().toLowerCase() === target) {
              triggerGoogleFormsOptionClick(opt);
              clicked = true;
              break;
            }
          }

          if (!clicked) {
            const input = card.querySelector('input[type="text"], input[type="email"], textarea');
            if (input) fillGoogleFormsInput(input, val);
          }
        });
      } else {
        // Fallback to local intelligent mapper
        runDeterministicLocalFill(cards);
      }

      // Secondary check to guarantee all fields are populated
      runDeterministicLocalFill(cards);

      statusText.innerText = '✨ Auto-Filled!';
      
      // Save transaction to local cache for Supabase sync
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['formHistory'], (res) => {
          const history = res.formHistory || [];
          const newRecord = {
            id: 'form-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            formUrl: window.location.href,
            formTitle: document.title || 'Google Form',
            domain: window.location.hostname,
            fieldsDetected: cards.length || 0,
            fieldsFilled: cards.length || 0,
            timeSavedSeconds: (cards.length || 0) * 15,
            status: 'Completed',
            createdAt: new Date().toISOString()
          };
          history.unshift(newRecord);
          if (history.length > 50) history.pop();
          chrome.storage.local.set({ formHistory: history });
        });
      } else {
        const history = JSON.parse(localStorage.getItem('formHistory') || '[]');
        const newRecord = {
          id: 'form-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          formUrl: window.location.href,
          formTitle: document.title || 'Google Form',
          domain: window.location.hostname,
          fieldsDetected: cards.length || 0,
          fieldsFilled: cards.length || 0,
          timeSavedSeconds: (cards.length || 0) * 15,
          status: 'Completed',
          createdAt: new Date().toISOString()
        };
        history.unshift(newRecord);
        if (history.length > 50) history.pop();
        localStorage.setItem('formHistory', JSON.stringify(history));
      }

      setTimeout(() => { statusText.innerText = 'Campus Copilot'; }, 3000);
    });
  });

  // Voice Dictation
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;
    const voiceBtn = document.getElementById('ccVoiceBtn');

    voiceBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isListening) recognition.start();
      else recognition.stop();
    });

    recognition.onstart = () => {
      isListening = true;
      voiceBtn.classList.add('cc-mic-active');
      document.getElementById('ccStatusText').innerText = 'Listening...';
    };

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        fillGoogleFormsInput(activeEl, (activeEl.value ? activeEl.value + ' ' : '') + speech);
      }
    };

    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove('cc-mic-active');
      document.getElementById('ccStatusText').innerText = 'Campus Copilot';
    };
  }

  // Draggable mechanics for the extension pill
  const pillElement = document.getElementById('ccPill');
  const rootElement = document.getElementById('campus-copilot-root');
  
  if (pillElement && rootElement) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    const dragThreshold = 5; // px

    // Load persisted coordinates (Extension-wide chrome.storage with localStorage fallback)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ccPillX', 'ccPillY'], (res) => {
        if (res.ccPillX && res.ccPillY) {
          rootElement.style.left = res.ccPillX;
          rootElement.style.top = res.ccPillY;
          rootElement.style.right = 'auto';
        }
      });
    } else {
      const savedX = localStorage.getItem('ccPillX');
      const savedY = localStorage.getItem('ccPillY');
      if (savedX && savedY) {
        rootElement.style.left = savedX;
        rootElement.style.top = savedY;
        rootElement.style.right = 'auto'; // override default right/top in CSS
      }
    }

    pillElement.addEventListener('mousedown', dragStart);
    pillElement.addEventListener('touchstart', dragStart, { passive: true });

    function dragStart(e) {
      // Allow dragging from main body / logo / status text, but not action buttons
      if (e.target.closest('button')) return;

      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

      startX = clientX;
      startY = clientY;

      // Get current offset positions
      const rect = rootElement.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      isDragging = false;

      if (e.type === 'mousedown') {
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
      } else {
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('touchend', dragEnd);
      }
    }

    function dragMove(e) {
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      const dx = clientX - startX;
      const dy = clientY - startY;

      if (!isDragging) {
        if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
          isDragging = true;
          pillElement.classList.add('cc-dragging');
          rootElement.style.transition = 'none'; // disable transitions while dragging
        }
      }

      if (isDragging) {
        if (e.cancelable) e.preventDefault();

        let newX = initialX + dx;
        let newY = initialY + dy;

        // Boundary constraints
        const rect = rootElement.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        rootElement.style.left = `${newX}px`;
        rootElement.style.top = `${newY}px`;
        rootElement.style.right = 'auto';
      }
    }

    function dragEnd(e) {
      if (e.type === 'mouseup') {
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
      } else {
        document.removeEventListener('touchmove', dragMove);
        document.removeEventListener('touchend', dragEnd);
      }

      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 50);
        pillElement.classList.remove('cc-dragging');
        rootElement.style.transition = 'left 0.2s ease, top 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease';
        
        // Persist position (Extension-wide chrome.storage with localStorage fallback)
        const rect = rootElement.getBoundingClientRect();
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ ccPillX: `${rect.left}px`, ccPillY: `${rect.top}px` });
        } else {
          localStorage.setItem('ccPillX', `${rect.left}px`);
          localStorage.setItem('ccPillY', `${rect.top}px`);
        }
      }
    }
    
    // Prevent default click events if dragged
    pillElement.addEventListener('click', (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }
})();
