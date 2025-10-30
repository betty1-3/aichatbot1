import './style.css'
import { extractLocationData, extractFarmSize, extractCropType, extractSowingDate } from './dataExtractor.js'

async function validateAnswerWithLLM(question, answer) {
  try {
    const response = await fetch('https://llmbackend1-2.onrender.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Question: "${question}"\nUser Answer: "${answer}"\nDoes the answer make logical sense for this question? Reply only 'Yes' or 'No'.`,
        validation: true
      })
    });
    const data = await response.json();
    return data.valid;
  } catch (error) {
    console.error('LLM validation error:', error);
    return true; // fallback to avoid blocking
  }
}


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

  let isValid = true;
  let currentQuestion = '';

  switch (questionIndex) {
    case 0:
      currentQuestion = currentLanguage.greeting;
      const locationData = extractLocationData(response);
      isValid = await validateAnswerWithLLM(currentQuestion, response);
      if (!locationData.district || !locationData.state || !isValid) {
        addBotMessage("I couldn’t identify a valid district and state. Could you please mention both clearly?");
        speakMessage("Please say or type your district and state again.", currentLanguage.lang);
        return;
      }
      collectedData.district = locationData.district;
      collectedData.state = locationData.state;
      break;

    case 1:
      currentQuestion = currentLanguage.q2;
      const farmSize = extractFarmSize(response);
      isValid = farmSize && !isNaN(farmSize) && farmSize > 0;
      if (!isValid) {
        addBotMessage("That doesn’t seem like a valid farm size. Please say the number of acres again.");
        speakMessage("Please say or type your farm size in acres again.", currentLanguage.lang);
        return;
      }
      collectedData.farm_size_acres = farmSize;
      break;

    case 2:
      currentQuestion = currentLanguage.q3;
      isValid = await validateAnswerWithLLM(currentQuestion, response);
      const cropType = extractCropType(response);
      if (!isValid || !cropType || cropType.length < 2) {
        addBotMessage("That doesn’t seem like a valid crop name. Please name your crop again.");
        speakMessage("Please say your crop name again.", currentLanguage.lang);
        return;
      }
      collectedData.crop_type = cropType;
      break;

    case 3:
      currentQuestion = currentLanguage.q4;
      isValid = await validateAnswerWithLLM(currentQuestion, response);
      const sowingDate = extractSowingDate(response);
      if (!isValid || !sowingDate) {
        addBotMessage("I couldn’t understand the date you mentioned. Please say your sowing date again.");
        speakMessage("Please say or type your sowing date again.", currentLanguage.lang);
        return;
      }
      collectedData.sowing_date = sowingDate;
      break;
  }

  questionIndex++;

  // Continue as before
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

        console.log('=== Final Collected Data ===');
        console.log(JSON.stringify(collectedData, null, 2));

        try {
    // Send data to ML model
          const mlResponse = await fetch('https://agri-ai-web-app.onrender.com/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectedData)
          });

          const mlResult = await mlResponse.json();

          addBotMessage(`<strong>ML Model Output:</strong><br>${JSON.stringify(mlResult, null, 2)}`);
          } catch (err) {
          console.error('ML request failed:', err);
          addBotMessage('❌ Failed to connect to ML model.');
        }

  // Redirect to ML model UI
        const queryString = new URLSearchParams(collectedData).toString();
        const mlModelUrl = `https://agri-ai-web-app.onrender.com/?${queryString}`;

        addBotMessage("Redirecting you to the detailed ML model insights page...");
        speakMessage("Redirecting you to the insights page.", currentLanguage.lang);

        setTimeout(() => {
          window.location.href = mlModelUrl;
        }, 2000);

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
