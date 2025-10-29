const indianStates = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal'
];

export function extractLocationData(text) {
  const normalizedText = text.toLowerCase();

  let state = null;
  let district = null;

  for (const stateName of indianStates) {
    if (normalizedText.includes(stateName)) {
      state = stateName.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      break;
    }
  }

  const words = text.split(/[\s,]+/).filter(w => w.length > 2);

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    const isState = indianStates.some(s => s === word || s.includes(word));

    if (!isState && word !== 'district' && word !== 'state' &&
        word !== 'from' && word !== 'in' && word !== 'at') {
      if (!district || words[i].length > district.length) {
        district = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
      }
    }
  }

  return {
    district: district || 'Unknown',
    state: state || 'Unknown'
  };
}

export function extractFarmSize(text) {
  const numbers = text.match(/\d+(\.\d+)?/g);

  if (numbers && numbers.length > 0) {
    return parseFloat(numbers[0]);
  }

  const wordToNumber = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'hundred': 100
  };

  const normalizedText = text.toLowerCase();
  for (const [word, num] of Object.entries(wordToNumber)) {
    if (normalizedText.includes(word)) {
      return num;
    }
  }

  return 0;
}

export function extractCropType(text) {
  const commonCrops = [
    'rice', 'wheat', 'maize', 'corn', 'barley', 'millet', 'sorghum',
    'cotton', 'sugarcane', 'tea', 'coffee', 'jute', 'rubber',
    'potato', 'tomato', 'onion', 'garlic', 'cabbage', 'cauliflower',
    'banana', 'mango', 'apple', 'orange', 'grapes', 'papaya',
    'soybean', 'groundnut', 'mustard', 'sunflower', 'chickpea',
    'lentil', 'peas', 'beans', 'pulses', 'paddy'
  ];

  const normalizedText = text.toLowerCase();

  for (const crop of commonCrops) {
    if (normalizedText.includes(crop)) {
      return crop.charAt(0).toUpperCase() + crop.slice(1);
    }
  }

  const words = text.split(/[\s,]+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const cleanWord = words[0].replace(/[^a-zA-Z]/g, '');
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
  }

  return 'Unknown';
}

export function extractSowingDate(text) {
  const datePatterns = [
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
    /(\d{4})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('-') || match[0].includes('/')) {
        if (match[1].length === 4) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
      }
    }
  }

  const monthMap = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  };

  const normalizedText = text.toLowerCase();
  for (const [month, num] of Object.entries(monthMap)) {
    if (normalizedText.includes(month)) {
      const yearMatch = text.match(/\d{4}/);
      const dayMatch = text.match(/\b(\d{1,2})\b/);

      const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
      const day = dayMatch ? dayMatch[1].padStart(2, '0') : '15';

      return `${year}-${num}-${day}`;
    }
  }

  const relativeTerms = {
    'today': 0,
    'yesterday': -1,
    'last week': -7,
    'last month': -30,
    'two weeks ago': -14,
    'three weeks ago': -21
  };

  for (const [term, daysOffset] of Object.entries(relativeTerms)) {
    if (normalizedText.includes(term)) {
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const seasonMap = {
    'kharif': `${new Date().getFullYear()}-06-15`,
    'rabi': `${new Date().getFullYear()}-10-15`,
    'zaid': `${new Date().getFullYear()}-03-15`,
    'summer': `${new Date().getFullYear()}-03-15`,
    'monsoon': `${new Date().getFullYear()}-06-15`,
    'winter': `${new Date().getFullYear()}-10-15`
  };

  for (const [season, date] of Object.entries(seasonMap)) {
    if (normalizedText.includes(season)) {
      return date;
    }
  }

  return new Date().toISOString().split('T')[0];
}
