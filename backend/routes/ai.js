const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/authMiddleware');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize the google AI Client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// All routes here are protected
router.use(protect);

// POST /api/ai/analyze
router.post('/analyze', async (req, res) => {
    const { codeContent, language, userContext } = req.body;
    const authorId = req.userId;

    if (!codeContent || !language) {
        return res.status(400).json({ message: 'Code content and language are required.' });
    }

    try {
        // Conditionally create a context block for the prompt
        const contextPromptPart = userContext
        ? `The user has provided the following context about their code's intent: "${userContext}". 
        Please consider this context heavily in your analysis, especially for the "explanation" and "bugs" sections.`
        : `The user has not provided any context. Analyze the code based on its content alone.`;

        // Craft the Prompt
        const prompt = `
            You are an expert code reviewer. Your task is to analyze the following ${language} code snippet.
            ${contextPromptPart}

            Provide your analysis in a structured JSON object with three distinct keys: "bugs", "style", and "explanation".
            - "bugs": Identify potential bugs, errors, or security vulnerabilities where the code might fail or not meet the user's intent. If none, say "No apparent bugs found.".
            - "style": Suggest improvements for code style, naming conventions, and readability. If code is perfect, say "Excellent style.".
            - "explanation": Briefly explain what the code does and whether it aligns with the user's stated intent (if provided).

            Here is the code:
            \`\`\`${language}
            ${codeContent}
            \`\`\`

            Your response MUST be a valid JSON object. Do not include any text before or after the JSON object.
        `;

        // Call the Gemini API
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: {
                    thinkingBudget: 0, // Disable thinking
                },
            }
        });
    
        const text = response.text;

        let aiAnalysis;
        try {
            // The AI output might include markdown backticks for the JSON block,
            // so we'll clean it
            const cleanedText = text.replace(/^```json\n?/, '').replace(/```$/, '');
            aiAnalysis = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse AI response as JSON:", text);
            return res.status(500).json({ message: "AI response was not valid JSON." });
        }

        // Save the code and its analysis to the database
        const newSnippet = await prisma.snippet.create({
            data: {
                codeContent,
                language,
                userContext,
                aiAnalysis, // Storing the parsed JSON object
                authorId,
            },
        });

        // Send the completed code snippet back to the frontend
        res.status(201).json(newSnippet);
    } catch (error) {
        console.error("Error with AI analysis or database saving:", error);
        res.status(500).json({ message: 'An error ocurred during AI analysis. '});
    }
});

module.exports = router;