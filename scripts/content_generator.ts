import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Supabase configuration
const SUPABASE_URL = 'https://oieoxgngqydvjzbyfrav.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZW94Z25ncXlkdmp6YnlmcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzEyMzgsImV4cCI6MjA1MzgwNzIzOH0.Nelk8fjA9Yh5gbli3MDSI9L0Jaz4Z15qepWFvr8AOCE';

// Initialize clients with admin rights to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Language name mappings
const LANGUAGE_NAMES: Record<string, { name: string, native_name: string }> = {
  'es': { 
    name: 'Spanish', 
    native_name: 'Español',
  },
  'fr': { 
    name: 'French', 
    native_name: 'Français',
  }
};

interface LanguageContent {
  code: string;
  categories: {
    name: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    description: string;
    lessons: {
      difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
      title: string;
      description: string;
      phrases: {
        original: string;
        translated: string;
        pronunciation?: string;
        order_index: number;
      }[];
    }[];
  }[];
}

interface GeneratedCategoryContent {
  name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; 
  description: string;
  lessons: {
    title: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    phrases: {
      original: string;
      translated: string;
      pronunciation?: string;
      order_index: number;
    }[];
  }[];
}

interface LessonContent {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  phrases: {
    
    original: string;
    translated: string;
    pronunciation?: string;
    order_index: number;
  }[];
}

async function generatePhrasesWithGPT(category: string, lessonTitle: string, targetLanguage: string, count: number = 10) {
  const prompt = `Generate ${count} common and useful phrases for a language learning app.
    Category: ${category}
    Lesson: ${lessonTitle}
    Target Language: ${targetLanguage}
    
    Format each phrase as:
    English: [phrase]
    ${targetLanguage}: [translation]
    Pronunciation: [pronunciation guide]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}

async function generateCategoryContent(categoryName: string): Promise<GeneratedCategoryContent> {
  const prompt = `Generate a category for a language learning app based on the name: ${categoryName}. Include a brief description and suggested difficulty level (either Beginner, Intermediate, or Advanced). Include lessons with titles, descriptions, and phrases with original text, translation, and pronunciation.`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0].message.content;
  console.log(content);

  // Check if content is null or undefined
  if (!content) {
    throw new Error('Generated content is null or undefined');
  }

  // Parse the content into the expected structure
  return JSON.parse(content); // Ensure the response is in the correct format
}

async function checkCategoryExists(categoryName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    throw new Error(`Error checking category existence: ${error.message}`);
  }

  return !!data; // Return true if category exists
}

async function generateLessonContent(categoryName: string, lessonTitle: string, languageCode: string): Promise<LessonContent> {
  const prompt = `Generate lesson content for the category ${categoryName} and lesson ${lessonTitle} in ${languageCode}. Include a brief description and phrases with original text, translation, and pronunciation.`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0].message.content;
  console.log(content);

  // Check if content is null or undefined
  if (!content) {
    throw new Error('Generated content is null or undefined');
  }

  // Parse the content into the expected structure
  return JSON.parse(content); // Ensure the response is in the correct format
}

async function populateDatabase(content: LanguageContent) {
  try {
    console.log(`Creating/updating language: ${content.code}`);
    
    const languageExists = await checkLanguageExists(content.code);
    let languageId;

    if (languageExists) {
      console.log(`Language ${content.code} already exists, skipping language creation`);
      const { data, error } = await supabase
        .from('languages')
        .select('id')
        .eq('code', content.code)
        .single();
      
      if (error) {
        throw new Error(`Error fetching existing language ID: ${error.message}`);
      }
      languageId = data.id; // Use the existing language ID
    } else {
      console.log(`Creating new language: ${content.code}`);
      const { data: language, error: langError } = await supabase
        .from('languages')
        .upsert({
          code: content.code,
          name: LANGUAGE_NAMES[content.code].name,
          native_name: LANGUAGE_NAMES[content.code].native_name,
          speakers: '500M+',  // Default value
          difficulty: 'Beginner',  // Default value
          estimated_time: '3-6 months',  // Default value
          color_primary: '#FF5733',  // Default color
          color_secondary: '#FFC300',  // Default color
          total_lessons: content.categories.reduce((sum, cat) => sum + cat.lessons.length, 0),
          total_words: content.categories.reduce((sum, cat) => 
            sum + cat.lessons.reduce((lSum, lesson) => lSum + lesson.phrases.length, 0), 0)
        })
        .select()
        .single();

      if (langError) {
        throw new Error(`Error inserting language: ${langError.message}`);
      }
      languageId = language.id; // Use the newly created language ID
    }

    // Proceed with categories
    for (const category of content.categories) {
      console.log(`Processing category: ${category.name}`);
      
      // Check if the category already exists
      const categoryExists = await checkCategoryExists(category.name);
      let categoryId;

      if (categoryExists) {
        console.log(`Category ${category.name} already exists, skipping category creation`);
        const { data, error } = await supabase
          .from('categories')
          .select('id')
          .eq('name', category.name)
          .single();
        
        if (error) {
          throw new Error(`Error fetching existing category ID: ${error.message}`);
        }
        categoryId = data.id; // Use the existing category ID
      } else {
        console.log(`Creating new category: ${category.name}`);
        const { data: newCategory, error: catError } = await supabase
          .from('categories')
          .upsert({
            name: category.name,
            difficulty: category.difficulty,
            description: category.description,
          })
          .select()
          .single();

        if (catError) {
          throw new Error(`Error inserting category: ${catError.message}`);
        }
        categoryId = newCategory.id; // Use the newly created category ID
      }

      // Proceed with lessons
      for (let lesson of category.lessons) {
        console.log(`Processing lesson: ${lesson.title}`);

        // Check if the lesson already exists
        const lessonExists = await checkLessonExists(lesson.title, categoryId);
        let lessonId;

        if (lessonExists) {
          console.log(`Lesson ${lesson.title} already exists, using existing lesson ID.`);
          const { data, error } = await supabase
            .from('lessons')
            .select('id')
            .eq('title', lesson.title)
            .eq('category_id', categoryId)
            .single();

          if (error) {
            throw new Error(`Error fetching existing lesson ID: ${error.message}`);
          }
          lessonId = data.id; // Use the existing lesson ID
        } else {
          // Generate lesson content using OpenAI
          const generatedLessonContent = await generateLessonContent(category.name, lesson.title, content.code);

          // Insert or upsert the lesson
          const { data: newLessonData, error: lessonError } = await supabase
            .from('lessons')
            .upsert({
              title: generatedLessonContent.title,
              description: generatedLessonContent.description,
              difficulty: generatedLessonContent.difficulty,
              category_id: categoryId,
            })
            .select()
            .single();

          if (lessonError) {
            throw new Error(`Error inserting lesson: ${lessonError.message}`);
          }
          lessonId = newLessonData.id; // Use the newly created lesson ID
        }

        // Generate phrases for the lesson using OpenAI
        const phrasesString = await generatePhrasesWithGPT(category.name, lesson.title, content.code);
        console.log(phrasesString); // Log the raw phrases string for debugging

        // Check if phrasesString is null or undefined
        if (!phrasesString) {
          throw new Error('Generated phrases string is null or undefined');
        }

        // Parse the phrases from the generated string format
        const phrases = parsePhrases(phrasesString);

        console.log(phrases);

        // Ensure phrases are valid
        if (!Array.isArray(phrases) || phrases.length === 0) {
          throw new Error('Generated phrases are not in the expected format');
        }

        // Insert phrases into the database
        for (let phrase of phrases) {
          await supabase
            .from('phrases')
            .upsert({
              lesson_id: lessonId,
              original_text: phrase.original,
              translated_text: phrase.translated,
              pronunciation: phrase.pronunciation,
              order_index: phrase.order_index,
            });
        }

        // Generate exercises for the lesson
        await generateExercises(lessonId, phrases);
      }
    }
  } catch (error) {
    console.error('Error in populateDatabase:', error);
    throw error;
  }
}

// Function to parse phrases from the generated string format
function parsePhrases(phrasesString: string): { original: string; translated: string; pronunciation?: string; order_index: number }[] {
  if (!phrasesString) {
    throw new Error('Phrases string is null or undefined');
  }

  const phrasesArray = phrasesString.split('\n\n'); // Split by double newlines for each phrase
  const parsedPhrases = phrasesArray.map((phraseBlock, index) => {
    const lines = phraseBlock.split('\n');
    const translated = lines.find(line => line.startsWith('English:'))?.replace('English: ', '').trim() || '';
    const original = lines.find(line => line.startsWith('es:'))?.replace('es: ', '').trim() || '';
    const pronunciation = lines.find(line => line.startsWith('Pronunciation:'))?.replace('Pronunciation: ', '').trim();

    return { original, translated, pronunciation, order_index: index }; // Include order_index
  });

  return parsedPhrases.filter(phrase => phrase.original && phrase.translated); // Filter out incomplete phrases
}

async function generateExercises(lessonId: string, phrases: any[]) {
  let exerciseIndex = 0;
  
  try {
    // Generate multiple-choice exercises
    for (const phrase of phrases) {
      // Create a multiple choice question for translation
      const { data: exercise, error: exError } = await supabase
        .from('exercises')
        .insert({
          lesson_id: lessonId,
          type: 'multiple-choice',
          question: phrase.original,
          correct_answer: phrase.translated,
          order_index: exerciseIndex++,
        })
        .select()
        .single();

      if (exError) {
        throw new Error(`Error inserting exercise: ${exError.message}`);
      }
      if (!exercise) {
        throw new Error('No exercise data returned after insert');
      }

      // Get other phrases to use as wrong options
      const wrongOptions = phrases
        .filter(p => p.translated !== phrase.translated)
        .map(p => p.translated)
        .slice(0, 3);
      
      // Insert exercise options
      const options = [...wrongOptions, phrase.translated];
      for (let i = 0; i < options.length; i++) {
        const { error: optError } = await supabase
          .from('exercise_options')
          .insert({
            exercise_id: exercise.id,
            option_text: options[i],
            order_index: i,
          });

        if (optError) {
          throw new Error(`Error inserting exercise option: ${optError.message}`);
        }
      }
    }

    // Generate translation exercises
    for (const phrase of phrases) {
      const { error: transError } = await supabase
        .from('exercises')
        .insert({
          lesson_id: lessonId,
          type: 'translation',
          question: phrase.original,
          correct_answer: phrase.translated,
          order_index: exerciseIndex++,
        });

      if (transError) {
        throw new Error(`Error inserting translation exercise: ${transError.message}`);
      }
    }
  } catch (error) {
    console.error('Error in generateExercises:', error);
    throw error;
  }
}

// First check if language exists
async function checkLanguageExists(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('languages')
    .select('id')
    .eq('code', code)
    .single();
  
  if (error && error.code !== 'PGRST116') { 
    throw error;
  }
  
  return !!data;
}

// Check if lesson exists
async function checkLessonExists(title: string, categoryId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id')
    .eq('title', title)
    .eq('category_id', categoryId)
    .single();
  
  if (error && error.code !== 'PGRST116') { 
    throw error;
  }
  
  return !!data;
}

// Main execution
async function main() {
  try {
    // Load content template
    const contentTemplate = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/language_content_template.json'), 'utf-8')
    );

    // Process each language
    for (const content of contentTemplate) {
      console.log(`Processing language: ${content.code}`);
      await populateDatabase(content);
      console.log(`Completed processing language: ${content.code}`);
    }
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generatePhrasesWithGPT, populateDatabase, generateExercises };
