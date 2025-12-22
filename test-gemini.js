const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyDKw9Ku-aZU5_cVLtKkWhh0i0FfYIXfJVo';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

async function test() {
  try {
    console.log('⏳ Testing Gemini API...');
    const result = await model.generateContent('Xin chào');
    const text = await result.response.text();
    console.log('✅ Gemini API works!');
    console.log('Response:', text.substring(0, 100));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
