import './style.css'
import { extractLocationData, extractFarmSize, extractCropType, extractSowingDate } from './dataExtractor.js'

const translations = {
  english: {
    greeting: "Hello! What's the location of your farm? Please mention the district and state.",
    q2: "What's your farm size in acres?",
    q3: "What's your crop type?",
    q4: "When did you sow or are planning to sow the crop?",
    processing: "Processing inputs...",
    lang: 'en-US'
  },
  hindi: {
    greeting: "नमस्ते! आपके खेत का स्थान क्या है? कृपया जिला और राज्य बताएं।",
    q2: "आपके खेत का आकार एकड़ में क्या है?",
    q3: "आपकी फसल का प्रकार क्या है?",
    q4: "आपने फसल कब बोई या बोने की योजना बना रहे हैं?",
    processing: "इनपुट प्रोसेस हो रहे हैं...",
    lang: 'hi-IN'
  },
  odia: {
    greeting: "ନମସ୍କାର! ଆପଣଙ୍କ ଚାଷ ଜମିର ସ୍ଥାନ କଣ? ଦୟାକରି ଜିଲ୍ଲା ଏବଂ ରାଜ୍ୟ ଉଲ୍ଲେଖ କରନ୍ତୁ।",
    q2: "ଆପଣଙ୍କ ଚାଷ ଜମିର ଆକାର ଏକର ରେ କେତେ?",
    q3: "ଆପଣଙ୍କ ଫସଲର ପ୍ରକାର କଣ?",
    q4: "ଆପଣ କେବେ ଫସଲ ବୁଣିଛନ୍ତି କିମ୍ବା ବୁଣିବାକୁ ଯୋଜନା କରୁଛନ୍ତି?",
    processing: "ଇନପୁଟ୍ ପ୍ରକ୍ରିୟାକରଣ...",
    lang: 'en-US'
  },
  tamil: {
    greeting: "வணக்கம்! உங்கள் பண்ணையின் இடம் என்ன? மாவட்டம் மற்றும் மாநிலத்தைக் குறிப்பிடவும்.",
    q2: "உங்கள் பண்ணை அளவு ஏக்கரில் என்ன?",
    q3: "உங்கள் பயிர் வகை என்ன?",
    q4: "நீங்கள் எப்போது பயிரை விதைத்தீர்கள் அல்லது விதைக்க திட்டமிடுகிறீர்கள்?",
    processing: "உள்ளீடுகளை செயலாக்குகிறது...",
    lang: 'ta-IN'
  }
};

let currentLanguage = null;
let questionIndex = 0;
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;

const collectedData = {
  district: null,
  state: null,
  farm_size_acres: null,
  crop_type: null,
  sowing_date: null
};

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="language-modal" id="languageModal">
    <div class="modal-content">
      <h2>Select Your Language</h2>
      <p>भाषा चुनें | ଭାଷା ଚୟନ କରନ୍ତୁ | மொழியைத் தேர்ந்தெடுக்கவும்</p>
      <div class="language-buttons">
        <button class="language-btn" data-lang="english">English</button>
        <button class="language-btn" data-lang="hindi">हिन्दी</button>
        <button class="language-btn" data-lang="odia">ଓଡ଼ିଆ</button>
        <button class="language-btn" data-lang="tamil">தமிழ்</button>
      </div>
    </div>
  </div>

  <div class="chatbox">
    <div class="chat-header">
      Agricultural Data Collection
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-container">
      <div class="input-wrapper">
        <input
          type="text"
          id="messageInput"
          placeholder="Type your answer..."
          disabled
        />
      </div>
      <button class="mic-button" id="micButton" disabled>
        🎤
      </button>
    </div>
  </div>
`;

const languageButtons = document.querySelectorAll('.language-btn');
const languageModal = document.getElementById('languageModal');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const micButton = document.getElementById('micButton');

languageButtons.forEach(button => {
  button.addEventListener('click', () => {
    const lang = button.dataset.lang;
    selectLanguage(lang);
  });
});

function selectLanguage(lang) {
  currentLanguage = translations[lang];
  languageModal.classList.add('hidden');

  messageInput.disabled = false;
  micButton.disabled = false;

  addBotMessage(currentLanguage.greeting);
  speakMessage(currentLanguage.greeting, currentLanguage.lang);

  setupSpeechRecognition();
}

function addBotMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  messageDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';
  messageDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function speakMessage(text, lang) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (voice) {
      utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
  }
}

function setupSpeechRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage.lang;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
      handleUserResponse(transcript);
      micButton.classList.remove('recording');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      micButton.classList.remove('recording');
    };

    recognition.onend = () => {
      micButton.classList.remove('recording');
    };
  }
}

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && messageInput.value.trim()) {
    handleUserResponse(messageInput.value.trim());
  }
});

micButton.addEventListener('click', () => {
  if (!recognition) return;

  if (micButton.classList.contains('recording')) {
    recognition.stop();
    micButton.classList.remove('recording');
  } else {
    try {
      recognition.start();
      micButton.classList.add('recording');
    } catch (error) {
      console.error('Speech recognition start error:', error);
    }
  }
});

async function handleUserResponse(response) {
  addUserMessage(response);
  messageInput.value = '';

  let isValid = true; // 🧠 assume valid unless proven otherwise

  switch (questionIndex) {
    case 0:
      const locationData = extractLocationData(response);
      if (!locationData.district || !locationData.state) {
        addBotMessage("I couldn’t catch your district and state. Could you please mention both clearly?");
        speakMessage("Please say or type your district and state again.", currentLanguage.lang);
        isValid = false;
      } else {
        collectedData.district = locationData.district;
        collectedData.state = locationData.state;
        console.log('Extracted location:', locationData);
      }
      break;

    case 1:
      const farmSize = extractFarmSize(response);
      if (!farmSize || isNaN(farmSize) || farmSize <= 0) {
        addBotMessage("Hmm, that doesn’t seem like a valid number of acres. Could you please repeat it?");
        speakMessage("Please say or type your farm size in acres again.", currentLanguage.lang);
        isValid = false;
      } else {
        collectedData.farm_size_acres = farmSize;
        console.log('Extracted farm size:', farmSize);
      }
      break;

    case 2:
      const cropType = extractCropType(response);
      if (!cropType || cropType.length < 2) {
        addBotMessage("I didn’t recognize that crop type. Could you please name your crop again?");
        speakMessage("Please say your crop type again.", currentLanguage.lang);
        isValid = false;
      } else {
        collectedData.crop_type = cropType;
        console.log('Extracted crop type:', cropType);
      }
      break;

    case 3:
      const sowingDate = extractSowingDate(response);
      if (!sowingDate) {
        addBotMessage("I couldn’t understand your sowing date. Could you please mention it again?");
        speakMessage("Please say or type your sowing date again.", currentLanguage.lang);
        isValid = false;
      } else {
        collectedData.sowing_date = sowingDate;
        console.log('Extracted sowing date:', sowingDate);
      }
      break;
  }

  // ❌ If invalid, don't move forward
  if (!isValid) return;

  // ✅ If valid, go to the next question
  questionIndex++;

  setTimeout(() => {
    let nextMessage = '';

    switch (questionIndex) {
      case 1:
        nextMessage = currentLanguage.q2;
        break;
      case 2:
        nextMessage = currentLanguage.q3;
        break;
      case 3:
        nextMessage = currentLanguage.q4;
        break;
      case 4:
        nextMessage = currentLanguage.processing;
        addBotMessage(nextMessage);
        messageInput.disabled = true;
        micButton.disabled = true;

        console.log('=== Final Collected Data for ML Model ===');
        console.log(JSON.stringify(collectedData, null, 2));

        // 🧠 Show JSON + call backend LLM
        setTimeout(async () => {
          const formattedJSON = JSON.stringify(collectedData, null, 2);
          addBotMessage(`<pre>${formattedJSON}</pre>`);

          try {
            const response = await fetch('https://llmbackend-ncgh.onrender.com/api/ask-llm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: `Here is the collected farm data:\n${formattedJSON}\nProvide agricultural insights or recommendations based on this information.`
              })
            });

            const result = await response.json();
            const llmText = Array.isArray(result)
              ? result[0].generated_text
              : JSON.stringify(result, null, 2);

            addBotMessage(`<strong>AI Insights:</strong><br>${llmText}`);
          } catch (err) {
            console.error('LLM request failed:', err);
            addBotMessage('❌ Failed to retrieve AI insights from the model.');
          }
        }, 1000);
        return;
    }

    addBotMessage(nextMessage);
    speakMessage(nextMessage, currentLanguage.lang);
  }, 500);
}


if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };
}
