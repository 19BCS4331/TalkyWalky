-- First, clean up existing data
DELETE FROM exercise_options;
DELETE FROM exercises;
DELETE FROM phrases;
DELETE FROM lessons;
DELETE FROM categories;
DELETE FROM languages;

-- Insert languages
INSERT INTO languages (id, code, name, native_name, speakers, difficulty, estimated_time, color_primary, color_secondary, total_lessons, total_words)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'en', 'English', 'English', '1.5B+', 'Easy', '2-3 months', '#FF416C', '#FF4B2B', 150, 3000),
  ('22222222-2222-2222-2222-222222222222', 'es', 'Spanish', 'Español', '550M+', 'Medium', '3-4 months', '#6441A5', '#2a0845', 120, 2500),
  ('33333333-3333-3333-3333-333333333333', 'fr', 'French', 'Français', '280M+', 'Medium', '3-4 months', '#4776E6', '#8E54E9', 130, 2800),
  ('44444444-4444-4444-4444-444444444444', 'de', 'German', 'Deutsch', '130M+', 'Hard', '4-5 months', '#11998e', '#38ef7d', 140, 3200),
  ('55555555-5555-5555-5555-555555555555', 'hi', 'Hindi', 'हिन्दी', '600M+', 'Medium', '3-4 months', '#FA8BFF', '#2BD2FF', 110, 2300),
  ('66666666-6666-6666-6666-666666666666', 'zh', 'Chinese', '中文', '1.1B+', 'Hard', '5-6 months', '#FF512F', '#DD2476', 115, 2400);

-- Insert categories
INSERT INTO categories (id, name, description, difficulty, icon)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'Basics', 'Essential phrases and greetings', 'Beginner', 'book'),
  ('88888888-8888-8888-8888-888888888888', 'Travel', 'Useful phrases for traveling', 'Beginner', 'airplane'),
  ('99999999-9999-9999-9999-999999999999', 'Food & Dining', 'Restaurant and food-related phrases', 'Beginner', 'restaurant'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Business', 'Professional and workplace vocabulary', 'Intermediate', 'briefcase'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Culture', 'Cultural aspects and traditions', 'Intermediate', 'globe');

-- English Lessons
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cccccccc-1111-1111-1111-cccccccccccc', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Basic Greetings', 'Learn essential English greetings', 'Beginner', '15 min', 1),
  ('cccccccc-2222-2222-2222-cccccccccccc', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Numbers 1-100', 'Master counting in English', 'Beginner', '20 min', 2);

-- English Phrases
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('dddddddd-1111-1111-1111-dddddddddddd', 'cccccccc-1111-1111-1111-cccccccccccc', 'Hello!', 'Hello!', 'heh-LOH', 'https://example.com/audio/hello.mp3', 1),
  ('dddddddd-2222-2222-2222-dddddddddddd', 'cccccccc-1111-1111-1111-cccccccccccc', 'Good morning!', 'Good morning!', 'good MOR-ning', 'https://example.com/audio/good-morning.mp3', 2);

-- Spanish Lessons
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cccccccc-3333-3333-3333-cccccccccccc', '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'Saludos Básicos', 'Learn basic Spanish greetings', 'Beginner', '15 min', 1),
  ('cccccccc-4444-4444-4444-cccccccccccc', '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'Números 1-100', 'Master counting in Spanish', 'Beginner', '20 min', 2);

-- Spanish Phrases
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('dddddddd-3333-3333-3333-dddddddddddd', 'cccccccc-3333-3333-3333-cccccccccccc', '¡Hola!', 'Hello!', 'OH-lah', 'https://example.com/audio/hola.mp3', 1),
  ('dddddddd-4444-4444-4444-dddddddddddd', 'cccccccc-3333-3333-3333-cccccccccccc', 'Buenos días', 'Good morning', 'BWEH-nos DEE-as', 'https://example.com/audio/buenos-dias.mp3', 2);

-- French Lessons
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cccccccc-5555-5555-5555-cccccccccccc', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'Salutations', 'Learn basic French greetings', 'Beginner', '15 min', 1),
  ('cccccccc-6666-6666-6666-cccccccccccc', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'Les Nombres 1-100', 'Master counting in French', 'Beginner', '20 min', 2);

-- French Phrases
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('dddddddd-5555-5555-5555-dddddddddddd', 'cccccccc-5555-5555-5555-cccccccccccc', 'Bonjour!', 'Hello!', 'bohn-ZHOOR', 'https://example.com/audio/bonjour.mp3', 1),
  ('dddddddd-6666-6666-6666-dddddddddddd', 'cccccccc-5555-5555-5555-cccccccccccc', 'Bonne journée', 'Good day', 'bun zhoor-NAY', 'https://example.com/audio/bonne-journee.mp3', 2);

-- German Lessons
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cccccccc-7777-7777-7777-cccccccccccc', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'Begrüßungen', 'Learn basic German greetings', 'Beginner', '15 min', 1),
  ('cccccccc-8888-8888-8888-cccccccccccc', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'Zahlen 1-100', 'Master counting in German', 'Beginner', '20 min', 2);

-- German Phrases
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('dddddddd-7777-7777-7777-dddddddddddd', 'cccccccc-7777-7777-7777-cccccccccccc', 'Hallo!', 'Hello!', 'HAH-loh', 'https://example.com/audio/hallo.mp3', 1),
  ('dddddddd-8888-8888-8888-dddddddddddd', 'cccccccc-7777-7777-7777-cccccccccccc', 'Guten Morgen', 'Good morning', 'GOO-ten MOR-gen', 'https://example.com/audio/guten-morgen.mp3', 2);

-- Hindi Lessons
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cccccccc-9999-9999-9999-cccccccccccc', '55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'अभिवादन', 'Learn basic Hindi greetings', 'Beginner', '15 min', 1),
  ('cccccccc-aaaa-aaaa-aaaa-cccccccccccc', '55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'संख्या 1-100', 'Master counting in Hindi', 'Beginner', '20 min', 2);

-- Hindi Phrases
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('dddddddd-9999-9999-9999-dddddddddddd', 'cccccccc-9999-9999-9999-cccccccccccc', 'नमस्ते', 'Hello', 'nuh-muh-stay', 'https://example.com/audio/namaste.mp3', 1),
  ('dddddddd-aaaa-aaaa-aaaa-dddddddddddd', 'cccccccc-9999-9999-9999-cccccccccccc', 'शुभ प्रभात', 'Good morning', 'shubh pruh-bhat', 'https://example.com/audio/shubh-prabhat.mp3', 2);

-- Chinese Lessons
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cccccccc-bbbb-bbbb-bbbb-cccccccccccc', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '问候语', 'Learn basic Chinese greetings', 'Beginner', '15 min', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '数字 1-100', 'Master counting in Chinese', 'Beginner', '20 min', 2);

-- Chinese Phrases
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('dddddddd-bbbb-bbbb-bbbb-dddddddddddd', 'cccccccc-bbbb-bbbb-bbbb-cccccccccccc', '你好', 'Hello', 'nǐ hǎo', 'https://example.com/audio/nihao.mp3', 1),
  ('dddddddd-cccc-cccc-cccc-dddddddddddd', 'cccccccc-bbbb-bbbb-bbbb-cccccccccccc', '早安', 'Good morning', 'zǎo ān', 'https://example.com/audio/zaoan.mp3', 2);

-- Add exercises and options for each language's first lesson
-- English
INSERT INTO exercises (id, lesson_id, type, question, correct_answer, order_index)
VALUES
  ('eeeeeeee-1111-1111-1111-eeeeeeeeeeee', 'cccccccc-1111-1111-1111-cccccccccccc', 'multiple-choice', 'What is the meaning of "Hello"?', 'A friendly greeting', 1);

INSERT INTO exercise_options (id, exercise_id, option_text, order_index)
VALUES
  ('ffffffff-1111-1111-1111-ffffffffffff', 'eeeeeeee-1111-1111-1111-eeeeeeeeeeee', 'A friendly greeting', 1),
  ('ffffffff-2222-2222-2222-ffffffffffff', 'eeeeeeee-1111-1111-1111-eeeeeeeeeeee', 'Goodbye', 2),
  ('ffffffff-3333-3333-3333-ffffffffffff', 'eeeeeeee-1111-1111-1111-eeeeeeeeeeee', 'Thank you', 3),
  ('ffffffff-4444-4444-4444-ffffffffffff', 'eeeeeeee-1111-1111-1111-eeeeeeeeeeee', 'Please', 4);

-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
