document.addEventListener('DOMContentLoaded', () => {
  // 1. Navigation Panel Routing
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const viewTitle = document.getElementById('viewTitle');
  const viewSubtitle = document.getElementById('viewSubtitle');

  const tabMeta = {
    'tab-profile': { title: 'Student Profile Vault', subtitle: 'Manage identity credentials and core university records' },
    'tab-cr': { title: 'CR / WhatsApp Announcement Parser', subtitle: 'Parse messy group instructions and override form selections' },
    'tab-reviews': { title: 'Campus Reviews & Facilities Vault', subtitle: 'Store pre-filled opinions on mess, hostel, Wi-Fi, and faculty' },
    'tab-settings': { title: 'AI Engine & Configuration', subtitle: 'Manage Google Gemini API connection and global response tone' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const tabId = item.getAttribute('data-tab');
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) targetPanel.classList.add('active');

      if (tabMeta[tabId]) {
        viewTitle.innerText = tabMeta[tabId].title;
        viewSubtitle.innerText = tabMeta[tabId].subtitle;
      }
    });
  });

  // 2. Data Synchronization & Persistence
  const fieldIds = [
    'geminiApiKey', 'modelSelect', 'fullName', 'rollNo', 'numericRoll', 'phoneNumber',
    'gradYear', 'batchSection', 'collegeEmail', 'bio', 'crAnnouncement', 'sentimentSlider',
    'sentimentNotes', 'hostelRoom', 'waterFeedback', 'hostelWifiFeedback', 'cleanlinessFeedback',
    'messRatingSlider', 'foodQualityFeedback', 'facultyFeedback', 'clubInterests'
  ];

  chrome.storage.local.get(null, (data) => {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) el.value = data[id];
    });

    if (data.sentimentSlider) document.getElementById('sentimentValue').innerText = `${data.sentimentSlider} / 5`;
    if (data.messRatingSlider) document.getElementById('messRatingValue').innerText = `${data.messRatingSlider} / 5`;
  });

  document.getElementById('sentimentSlider')?.addEventListener('input', (e) => {
    document.getElementById('sentimentValue').innerText = `${e.target.value} / 5`;
  });

  document.getElementById('messRatingSlider')?.addEventListener('input', (e) => {
    document.getElementById('messRatingValue').innerText = `${e.target.value} / 5`;
  });

  // Global Save Handler
  document.getElementById('saveBtn')?.addEventListener('click', () => {
    const payload = {};
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) payload[id] = el.value.trim();
    });
    payload.apiKey = payload.geminiApiKey;
    payload.studentProfile = { ...payload };

    chrome.storage.local.set(payload, () => {
      showToast('Profile & Settings Synchronized! ✅');
    });
  });

  // 3. API Key Handshake Test
  document.getElementById('testApiKeyBtn')?.addEventListener('click', async () => {
    const key = document.getElementById('geminiApiKey').value.trim();
    const statusEl = document.getElementById('apiStatus');
    if (!key) {
      statusEl.style.color = '#f43f5e';
      statusEl.innerText = 'Key Missing ❌';
      return;
    }
    statusEl.style.color = '#38bdf8';
    statusEl.innerText = 'Testing...';
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });
      if (res.ok) {
        statusEl.style.color = '#10b981';
        statusEl.innerText = 'Connected! ✅';
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      statusEl.style.color = '#f43f5e';
      statusEl.innerText = 'Failed ❌';
    }
  });

  // 4. Voice Dictation Engine for All Textareas
  function setupDictation(btnId, targetInputId) {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(targetInputId);
    if (!btn || !target) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.style.display = 'none';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isListening) {
        recognition.start();
      } else {
        recognition.stop();
      }
    });

    recognition.onstart = () => {
      isListening = true;
      btn.classList.add('mic-recording');
      btn.innerText = '🎙️ Listening...';
    };

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript;
      target.value = (target.value ? target.value + ' ' : '') + speech;
    };

    recognition.onend = () => {
      isListening = false;
      btn.classList.remove('mic-recording');
      btn.innerText = '🎙️ Dictate';
    };
  }

  setupDictation('micBioBtn', 'bio');
  setupDictation('micCrBtn', 'crAnnouncement');
  setupDictation('micWaterBtn', 'waterFeedback');
  setupDictation('micHostelWifiBtn', 'hostelWifiFeedback');
  setupDictation('micCleanBtn', 'cleanlinessFeedback');
  setupDictation('micFoodBtn', 'foodQualityFeedback');
  setupDictation('micFacultyBtn', 'facultyFeedback');
  setupDictation('micClubBtn', 'clubInterests');

  // 5. JSON Import / Export Backup Engine
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'campus-copilot-vault.json';
      a.click();
    });
  });

  document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFileInput')?.click());
  document.getElementById('importFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          chrome.storage.local.set(parsed, () => location.reload());
        } catch {
          alert('Invalid JSON backup file.');
        }
      };
      reader.readAsText(file);
    }
  });

  document.getElementById('sampleCrBtn')?.addEventListener('click', () => {
    document.getElementById('crAnnouncement').value = "[CR Notice]: Choose 'Track 2: Generative AI & Automation', Mentor: Dr. Ramanujan, Team: ByteForce - 26BCS10220, T-Shirt: Large";
  });
  document.getElementById('clearCrBtn')?.addEventListener('click', () => {
    document.getElementById('crAnnouncement').value = '';
  });

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2200);
  }
});
