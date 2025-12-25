require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING!');

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const models = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest', 
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
  'gemini-1.0-pro',
  'models/gemini-1.5-flash',
  'models/gemini-pro',
];

async function testModels() {
  console.log('\n🔍 Testing Gemini models...\n');
  
  for (const modelName of models) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "Hello" in one word');
      const text = result.response.text();
      console.log(`✅ ${modelName} works! Response: "${text.trim()}"\n`);
      return modelName; // Return first working model
    } catch (e) {
      console.log(`❌ ${modelName}`);
      console.log(`   Error: ${e.message}\n`);
    }
  }
  
  console.log('❌ No working model found!');
  return null;
}

testModels().then(workingModel => {
  if (workingModel) {
    console.log(`\n🎉 Use this model in your code: "${workingModel}"`);
  }
});
