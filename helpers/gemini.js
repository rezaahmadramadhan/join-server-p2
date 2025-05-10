const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini API
const initGemini = () => {
  // Get API key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables");
  }

  // Create and return the Gemini client
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};

// Get a model instance
const getGeminiModel = (modelName = "gemini-2.0-flash") => {
  const genAI = initGemini();
  return genAI.getGenerativeModel({ model: modelName });
};

// Generate content with Gemini
const generateContent = async (prompt, modelName = "gemini-2.0-flash") => {
  try {
    const model = getGeminiModel(modelName);
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw error;
  }
};

module.exports = {
  initGemini,
  getGeminiModel,
  generateContent,
};
