import { supabase } from '@/lib/supabase';

export interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  speakers: string;
  difficulty: string;
  estimated_time: string;
  color_primary: string;
  color_secondary: string;
  total_lessons: number;
  total_words: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: string;
}

export interface Lesson {
  id: string;
  language_id: string;
  category_id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  order_index: number;
  phrases?: Phrase[];
  exercises?: Exercise[];
}

export interface Phrase {
  id: string;
  lesson_id: string;
  original_text: string;
  translated_text: string;
  pronunciation: string;
  audio_url: string | null;
  order_index: number;
}

export interface Exercise {
  id: string;
  lesson_id: string;
  type: 'multiple-choice' | 'translation';
  question: string;
  correct_answer: string;
  order_index: number;
  options?: ExerciseOption[];
}

export interface ExerciseOption {
  id: string;
  exercise_id: string;
  option_text: string;
  order_index: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  score: number | null;
  completed_at: string | null;
}

export const getLanguages = async (): Promise<Language[]> => {
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching languages:', error);
    throw error;
  }

  return data || [];
};

export const getLanguageById = async (code: string): Promise<Language | null> => {
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .eq('code', code);

  if (error) {
    console.error('Error fetching language:', error);
    throw error;
  }

  return data?.[0] || null;
};

export const getLessonsByLanguage = async (languageId: string): Promise<Lesson[]> => {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      phrases (
        *,
        order_index
      ),
      exercises (
        *,
        exercise_options (
          *,
          order_index
        ),
        order_index
      )
    `)
    .eq('language_id', languageId)
    .order('order_index');

  if (error) {
    console.error('Error fetching lessons:', error);
    throw error;
  }

  if (!data) return [];

  return data.map(lesson => ({
    ...lesson,
    phrases: lesson.phrases?.sort((a, b) => a.order_index - b.order_index) || [],
    exercises: lesson.exercises?.sort((a, b) => a.order_index - b.order_index).map(exercise => ({
      ...exercise,
      options: exercise.exercise_options?.sort((a, b) => a.order_index - b.order_index) || []
    })) || []
  }));
};

export const getLessonById = async (lessonId: string): Promise<Lesson | null> => {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      phrases (
        *,
        order_index
      ),
      exercises (
        *,
        exercise_options (
          *,
          order_index
        ),
        order_index
      )
    `)
    .eq('id', lessonId);

  if (error) {
    console.error('Error fetching lesson:', error);
    throw error;
  }

  if (!data?.[0]) return null;

  return {
    ...data[0],
    phrases: data[0].phrases?.sort((a, b) => a.order_index - b.order_index) || [],
    exercises: data[0].exercises?.sort((a, b) => a.order_index - b.order_index).map(exercise => ({
      ...exercise,
      options: exercise.exercise_options?.sort((a, b) => a.order_index - b.order_index) || []
    })) || []
  };
};

export const getUserProgress = async (userId: string): Promise<UserProgress[]> => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user progress:', error);
    throw error;
  }

  return data || [];
};

export const updateUserProgress = async (
  userId: string,
  lessonId: string,
  completed: boolean,
  score?: number
): Promise<void> => {
  // First check if a record exists
  const { data: existingProgress, error: fetchError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error('Error fetching user progress:', fetchError);
    throw fetchError;
  }

  // If exists, update. If not, insert.
  const { error: upsertError } = await supabase
    .from('user_progress')
    .upsert({
      id: existingProgress?.id || undefined, // Include existing ID if updating
      user_id: userId,
      lesson_id: lessonId,
      completed,
      score: score !== undefined ? score : existingProgress?.score,
      completed_at: completed ? new Date().toISOString() : existingProgress?.completed_at,
    }, {
      onConflict: 'user_id,lesson_id'
    });

  if (upsertError) {
    console.error('Error updating user progress:', upsertError);
    throw upsertError;
  }
};
