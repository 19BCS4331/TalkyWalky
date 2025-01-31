import { OPENAI_API_KEY } from '@/config/api';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Simple delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Queue for managing API requests
class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        await request();
        // Wait 1 second between requests to respect rate limits
        await delay(1000);
      }
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

const generateChatCompletion = async (messages: Message[], retries = 3): Promise<string> => {
  const makeRequest = async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data: ChatCompletionResponse = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429') && retries > 0) {
        // If rate limited, wait and retry with exponential backoff
        const waitTime = Math.pow(2, 4 - retries) * 1000;
        await delay(waitTime);
        return generateChatCompletion(messages, retries - 1);
      }
      throw error;
    }
  };

  return requestQueue.add(makeRequest);
};

export interface GeneratedLesson {
  id: string;
  languageCode: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  phrases: Array<{
    original: string;
    translation: string;
    pronunciation: string;
  }>;
  exercises: Array<{
    type: 'multiple-choice' | 'translation';
    question: string;
    options?: string[];
    correctAnswer: string;
  }>;
}

export const generateLesson = async (
  languageCode: string,
  languageName: string,
  level: string,
  category: string
): Promise<GeneratedLesson> => {
  // Create a unique ID combining language, category, and timestamp
  const uniqueId = `${languageCode}_${category.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

  const systemPrompt = `You are a language learning expert specializing in ${languageName}. Create a lesson with common phrases and practice exercises appropriate for ${level} level students. The lesson should be about ${category}.`;

  const userPrompt = `Generate a structured lesson for ${languageName} (${languageCode}) at ${level} level about ${category}. Include:
1. A descriptive title
2. A brief description
3. 5 common phrases with translations and pronunciations
4. 3 practice exercises (mix of multiple choice and translation)

Format the response in JSON with this structure:
{
  "id": "${uniqueId}",
  "title": "string",
  "description": "string",
  "level": "${level}",
  "duration": "string (e.g., '15 min')",
  "phrases": [
    {
      "original": "string",
      "translation": "string",
      "pronunciation": "string"
    }
  ],
  "exercises": [
    {
      "type": "multiple-choice | translation",
      "question": "string",
      "options": ["string"] (for multiple-choice only),
      "correctAnswer": "string"
    }
  ]
}`;

  try {
    const completion = await generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return JSON.parse(completion);
  } catch (error) {
    console.error('Error generating lesson:', error);
    throw new Error('Failed to generate lesson content');
  }
};

export const generateExercises = async (
  languageCode: string,
  languageName: string,
  phrases: Array<{ original: string; translation: string }>,
): Promise<Array<{
  type: 'multiple-choice' | 'translation';
  question: string;
  options?: string[];
  correctAnswer: string;
}>> => {
  const prompt = `Generate exercises for these ${languageName} phrases:\n${phrases
    .map(p => `${p.original} - ${p.translation}`)
    .join('\n')}`;

  try {
    const completion = await generateChatCompletion([
      {
        role: 'system',
        content: `Generate a mix of multiple-choice and translation exercises. Format:
          [
            {
              "type": "multiple-choice",
              "question": "Question text",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correctAnswer": "Correct option"
            },
            {
              "type": "translation",
              "question": "Translate this phrase",
              "correctAnswer": "Correct translation"
            }
          ]`
      },
      { role: 'user', content: prompt }
    ]);

    return JSON.parse(completion);
  } catch (error) {
    console.error('Error generating exercises:', error);
    throw new Error('Failed to generate exercises');
  }
};
