chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GENERATE_FORM_ANSWERS') {
    const { prompt, apiKey } = request;

    if (!apiKey || apiKey.trim() === '') {
      sendResponse({ success: false, fallback: true, error: 'No API Key' });
      return true;
    }

    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      return res.json();
    })
    .then((data) => {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty AI response");
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      sendResponse({ success: true, answers: JSON.parse(cleanJson) });
    })
    .catch((err) => {
      console.warn("Gemini API call failed, activating local fallback:", err.message);
      sendResponse({ success: false, fallback: true, error: err.message });
    });

    return true;
  }
});
