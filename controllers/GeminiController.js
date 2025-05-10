const { generateContent } = require("../helpers/gemini");

class GeminiController {
  static async generateQuiz(req, res, next) {
    try {
      const { topic, difficulty = 'medium'} = req.body;
      
      if (!topic) {
        return res.status(400).json({
          success: false,
          message: 'Topic is required'
        });
      }
      
      const programmingTopics = [
        'javascript', 'python', 'java', 'c#', 'c++', 'php', 'ruby', 'swift', 'kotlin', 'rust',
        'golang', 'typescript', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
        'spring', 'html', 'css', 'sass', 'less', 'sql', 'mongodb', 'postgresql', 'mysql',
        'database', 'data structure', 'algorithm', 'programming', 'software', 'development',
        'web development', 'mobile development', 'frontend', 'backend', 'full stack',
        'devops', 'git', 'docker', 'kubernetes', 'aws', 'azure', 'cloud computing',
        'machine learning', 'artificial intelligence', 'deep learning', 'cybersecurity',
        'networking', 'api', 'testing', 'debugging', 'design patterns', 'object-oriented',
        'functional programming', 'agile', 'scrum', 'code', 'coding', 'compiler', 'interpreter',
        'framework', 'library', 'package', 'module', 'component', 'rest api', 'graphql',
        'microservices', 'architecture', 'operating system', 'linux', 'unix', 'windows',
        'embedded systems', 'blockchain', 'game development', 'unity', 'unreal engine'
      ];
      
      const isProgrammingRelated = programmingTopics.some(progTopic => 
        topic.toLowerCase().includes(progTopic) || progTopic.includes(topic.toLowerCase())
      );
      
      if (!isProgrammingRelated) {
        return res.status(400).json({
          success: false,
          message: 'Sorry, quizzes can only be generated for programming-related topics.'
        });
      }
      
      const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
      const selectedDifficulty = validDifficulties.includes(difficulty.toLowerCase()) 
        ? difficulty.toLowerCase() 
        : 'medium';

      const prompt = `Create a ${selectedDifficulty} difficulty quiz with 5 multiple-choice questions about ${topic}.
      For each question, provide 4 options (labeled A, B, C, D) and indicate the correct answer.
      Format your response as a valid JSON array with this structure:
      [
        {
          "question": "Question text here?",
          "options": {
            "A": "First option",
            "B": "Second option",
            "C": "Third option",
            "D": "Fourth option"
          },
          "correctAnswer": "A",
          "explanation": "Brief explanation why this is the correct answer"
        }
      ]
      Make sure the response is valid JSON with no additional text before or after.`;
      
      const quizResponse = await generateContent(prompt);
        let quizData;
      try {
        const jsonMatch = quizResponse.match(/\[\s*{[\s\S]*}\s*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : quizResponse;
        
        quizData = JSON.parse(jsonStr);
        
        if (!Array.isArray(quizData)) {
          throw new Error("Response is not an array");
        }
        
        // Validate the structure of each quiz question
        quizData = quizData.map((q, index) => {
          // Ensure the question has all required fields
          if (!q.question || !q.options || !q.correctAnswer || !q.explanation) {
            console.warn(`Quiz question ${index} is missing required fields, applying defaults`);
          }
          
          // Make sure options are present and have A, B, C, D keys
          const validOptions = q.options && 
            typeof q.options === 'object' && 
            'A' in q.options && 
            'B' in q.options && 
            'C' in q.options && 
            'D' in q.options;
          
          if (!validOptions) {
            console.warn(`Quiz question ${index} has invalid options, applying defaults`);
            q.options = q.options || {
              A: "Option A", 
              B: "Option B", 
              C: "Option C", 
              D: "Option D"
            };
          }
          
          // Ensure correctAnswer is one of A, B, C, D
          if (!q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer.toUpperCase())) {
            console.warn(`Quiz question ${index} has invalid correctAnswer, defaulting to A`);
            q.correctAnswer = 'A';
          } else {
            q.correctAnswer = q.correctAnswer.toUpperCase();
          }
          
          return q;
        });
        
        const quizForUser = quizData.map((q, index) => ({
          id: index,
          question: q.question,
          options: q.options,
        }));
        
        req.app.locals.quizzes = req.app.locals.quizzes || {};
        const quizId = Date.now().toString();
        req.app.locals.quizzes[quizId] = quizData;
        
        // Add expiration after 30 minutes
        setTimeout(() => {
          if (req.app.locals.quizzes && req.app.locals.quizzes[quizId]) {
            delete req.app.locals.quizzes[quizId];
            console.log(`Quiz ${quizId} expired and removed from memory`);
          }
        }, 30 * 60 * 1000);
        
        res.status(200).json({ 
          success: true,
          message: "Quiz generated successfully",
          data: { 
            quizId,
            topic,
            difficulty: selectedDifficulty,
            questionCount: quizData.length,
            quiz: quizForUser 
          } 
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to generate a properly formatted quiz. Please try again."
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async generateQuizKaboom(req, res) {
    try {
      const prompt = `Generate 10 multiple-choice questions about random fun facts in this world in Bahasa Indonesia. 
          For each question, provide 4 options and indicate the index (0-based) of the correct answer.
          Format the response as a JSON object with this exact structure:
          {
            "questions": [
              { "question": "question text in Bahasa Indonesia", "choices": ["option1", "option2", "option3", "option4"], "correctAnswer": correctAnswerIndex },
              ...
            ]
          }
          Only return the JSON, nothing else. Make sure all questions, options, and explanations are written in Bahasa Indonesia.`;

      try {
        const result = await generateContent(prompt);
        let cleanedResult = result;
        cleanedResult = cleanedResult.replace(/^```(json)?\s+/m, '').replace(/\s+```$/m, '');
        const quiz = JSON.parse(cleanedResult);
        return res.status(200).json(quiz);
      } catch (error) {
        console.error("Error generating or parsing quiz:", error);
        
        if (error.isRateLimit || error.status === 429) {
          console.log("API rate limit exceeded. Using fallback quiz data.");
          return res.status(200).json({
            ...fallbackQuizData,
            source: "fallback",
            message: "Quiz generated from fallback data due to API rate limits"
          });
        }
        
        return res.status(500).json({ 
          error: "Failed to generate quiz", 
          message: error.message 
        });
      }
    } catch (error) {
      console.error("Unexpected error in generateQuiz:", error);
    }
  }  static async checkAnswers(req, res, next) {
    try {
      const { quizId, answers } = req.body || {};
      
      if (!quizId || !answers) {
        throw { name: "BadRequest", message: "Quiz ID and answers are required" };
      }
      
      // Ensure answers is an array and log what we received for debugging
      console.log("Received answers:", JSON.stringify(answers, null, 2));
      
      // Convert single answer to array if needed
      const userAnswers = Array.isArray(answers) ? answers : [answers];
      
      // Retrieve the stored quiz
      const storedQuizzes = req.app.locals.quizzes || {};
      const quizData = storedQuizzes[quizId];
      
      if (!quizData) {
        throw { name: "NotFound", message: "Quiz not found. It may have expired or been completed already." };
      }
      
      // Log quiz data for debugging
      console.log("Quiz questions and correct answers:", 
        JSON.stringify(quizData.map(q => ({
          question: q.question.substring(0, 30) + "...",
          correctAnswer: q.correctAnswer
        })), null, 2)
      );
      
      // Calculate the score and provide detailed feedback
      let correctCount = 0;
      
      // Process each user answer
      const results = userAnswers.map(answer => {
        // Extract questionId and userAnswer regardless of format
        let questionId = 0;
        let userAnswer = "";
        
        if (typeof answer === 'object') {
          // Handle object format with questionId or id
          questionId = 'questionId' in answer ? 
            parseInt(answer.questionId, 10) : 
            'id' in answer ? 
              parseInt(answer.id, 10) : 0;
          
          // Extract user's actual answer
          userAnswer = 'answer' in answer ? 
            String(answer.answer).trim().toUpperCase() : "";
        } else if (typeof answer === 'string') {
          // Handle string format (assumes questionId=0)
          userAnswer = answer.trim().toUpperCase();
        }
        
        // Verify question exists
        if (questionId >= quizData.length || questionId < 0) {
          return { 
            valid: false, 
            message: "Question does not exist",
            questionId
          };
        }
        
        // Get question data
        const question = quizData[questionId];
        
        // Normalize the correct answer
        const correctAnswer = question.correctAnswer.toUpperCase();
        
        // Check if the answer is correct
        const isCorrect = userAnswer === correctAnswer;
        
        if (isCorrect) {
          correctCount++;
        }
        
        // Log validation results
        console.log(
          `Q${questionId}: "${question.question.substring(0, 20)}..." - ` +
          `User: "${userAnswer}", Correct: "${correctAnswer}" - ${isCorrect ? "CORRECT" : "INCORRECT"}`
        );
        
        // Return detailed result
        return {
          questionId,
          question: question.question,
          userAnswer,
          isCorrect,
          correctAnswer,
          correctOption: question.options[correctAnswer],
          explanation: question.explanation,
          options: question.options
        };
      });
      
      // Calculate score as percentage
      const score = (correctCount / quizData.length) * 100;
      
      // Generate performance message based on score
      let performanceMessage = "";
      if (score >= 90) {
        performanceMessage = "Excellent! You've mastered this topic.";
      } else if (score >= 70) {
        performanceMessage = "Very good! You have a solid understanding of this topic.";
      } else if (score >= 50) {
        performanceMessage = "Good effort! Review the explanations to improve your understanding.";
      } else {
        performanceMessage = "Keep practicing! Review the explanations to strengthen your knowledge.";
      }
      
      // Create final feedback messages for each question
      const processedResults = results.map(result => {
        if (!result.valid && result.message) {
          return result; // Return invalid question as-is
        }
        
        // Make sure we have the correct option text
        const correctOptionText = result.options?.[result.correctAnswer] || 
          `Option ${result.correctAnswer}`;
        
        // Create feedback message
        const feedbackMessage = result.isCorrect 
          ? `✅ Correct! ${result.explanation || ""}`
          : `❌ Not quite. The correct answer is ${result.correctAnswer}: ${correctOptionText}. ${result.explanation || ""}`;
        
        return {
          ...result,
          feedbackMessage
        };
      });
        // Send the response with processed results
      res.status(200).json({
        success: true,
        message: "Quiz answers checked successfully",
        data: {
          score: score.toFixed(1),
          correctCount,
          totalQuestions: quizData.length,
          performanceMessage,
          results: processedResults,
          answeredAll: userAnswers.length === quizData.length
        }
      });
      
      // Optionally, keep the quiz in memory in case the user wants to review it again
      // Set a longer timeout for cleanup after checking (additional 15 minutes)
      setTimeout(() => {
        if (req.app.locals.quizzes && req.app.locals.quizzes[quizId]) {
          delete req.app.locals.quizzes[quizId];
          console.log(`Quiz ${quizId} completed and removed from memory after review period`);
        }
      }, 15 * 60 * 1000);
      
    } catch (error) {
      next(error);
    }
  }

  static async getHint(req, res, next) {
    try {
      const { quizId, questionIndex } = req.body;
      
      if (!quizId || questionIndex === undefined) {
        throw { name: "BadRequest", message: "Quiz ID and question index are required" };
      }
      
      // Retrieve the stored quiz
      const storedQuizzes = req.app.locals.quizzes || {};
      const quizData = storedQuizzes[quizId];
      
      if (!quizData) {
        throw { name: "NotFound", message: "Quiz not found. It may have expired." };
      }
      
      if (questionIndex >= quizData.length || questionIndex < 0) {
        throw { name: "BadRequest", message: "Invalid question index." };
      }
      
      const question = quizData[questionIndex];
      
      // Generate a hint based on the correct answer but without giving it away
      const hint = await generateContent(`
        I need a hint for this question without revealing the answer directly:
        Question: ${question.question}
        Options:
        A: ${question.options.A}
        B: ${question.options.B}
        C: ${question.options.C}
        D: ${question.options.D}
        
        The correct answer is ${question.correctAnswer}: ${question.options[question.correctAnswer]}.
        
        Please provide a subtle hint that guides the user towards the correct answer without explicitly stating it. 
        The hint should be one or two sentences maximum.
      `);
      
      res.status(200).json({
        success: true,
        data: {
          questionIndex,
          question: question.question,
          hint
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GeminiController;