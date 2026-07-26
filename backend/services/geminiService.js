const { GoogleGenAI } = require("@google/genai");

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from the backend .env file"
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function getGeminiModel() {
  return (
    process.env.GEMINI_MODEL ||
    "gemini-3.6-flash"
  );
}

async function testGeminiConnection() {
  const ai = createGeminiClient();

  const response = await ai.models.generateContent({
    model: getGeminiModel(),

    contents:
      'Return exactly this JSON: {"connected":true}',

    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  if (!response?.text) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  return JSON.parse(response.text);
}

async function generateStructuredContent({
  prompt,
  responseJsonSchema,
}) {
  if (!prompt?.trim()) {
    throw new Error(
      "A prompt is required for Gemini generation"
    );
  }

  const ai = createGeminiClient();

  const response = await ai.models.generateContent({
    model: getGeminiModel(),

    contents: prompt,

    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  if (!response?.text) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error(
      "Invalid Gemini JSON response:",
      response.text
    );

    throw new Error(
      "Gemini returned an invalid JSON response"
    );
  }
}

module.exports = {
  getGeminiModel,
  testGeminiConnection,
  generateStructuredContent,
};