-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Languages table
CREATE TABLE languages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    speakers VARCHAR(50),
    difficulty VARCHAR(20),
    estimated_time VARCHAR(50),
    color_primary VARCHAR(7),
    color_secondary VARCHAR(7),
    total_lessons INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Difficulty levels enum
CREATE TYPE difficulty_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- Categories table
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty difficulty_level NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Lessons table
CREATE TABLE lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty difficulty_level NOT NULL,
    duration VARCHAR(20),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(language_id, category_id, order_index)
);

-- Phrases table
CREATE TABLE phrases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    pronunciation TEXT,
    audio_url TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(lesson_id, order_index)
);

-- Exercise types enum
CREATE TYPE exercise_type AS ENUM ('multiple-choice', 'translation');

-- Exercises table
CREATE TABLE exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    type exercise_type NOT NULL,
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(lesson_id, order_index)
);

-- Exercise options table (for multiple choice questions)
CREATE TABLE exercise_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(exercise_id, order_index)
);

-- User progress table
CREATE TABLE user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, lesson_id)
);

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_languages_updated_at
    BEFORE UPDATE ON languages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phrases_updated_at
    BEFORE UPDATE ON phrases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_lessons_language_id ON lessons(language_id);
CREATE INDEX idx_phrases_lesson_id ON phrases(lesson_id);
CREATE INDEX idx_exercises_lesson_id ON exercises(lesson_id);
CREATE INDEX idx_exercise_options_exercise_id ON exercise_options(exercise_id);
CREATE INDEX idx_user_progress_user_lesson ON user_progress(user_id, lesson_id);

-- Row Level Security (RLS) policies
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Public languages are viewable by everyone"
    ON languages FOR SELECT
    USING (true);

CREATE POLICY "Public categories are viewable by everyone"
    ON categories FOR SELECT
    USING (true);

CREATE POLICY "Public lessons are viewable by everyone"
    ON lessons FOR SELECT
    USING (true);

CREATE POLICY "Public phrases are viewable by everyone"
    ON phrases FOR SELECT
    USING (true);

CREATE POLICY "Public exercises are viewable by everyone"
    ON exercises FOR SELECT
    USING (true);

CREATE POLICY "Public exercise options are viewable by everyone"
    ON exercise_options FOR SELECT
    USING (true);

-- User progress policies
CREATE POLICY "Users can view their own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);
