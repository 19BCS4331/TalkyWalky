-- Insert languages
INSERT INTO languages (id, code, name, native_name, speakers, difficulty, estimated_time, color_primary, color_secondary, total_lessons, total_words)
VALUES
  ('d7897fee-4fa5-4d4f-8eee-90b69d38959c', 'es', 'Spanish', 'Español', '534 million', 'Beginner', '3-4 months', '#FF6B6B', '#FF8787', 30, 1000),
  ('123e4567-e89b-12d3-a456-426614174000', 'fr', 'French', 'Français', '280 million', 'Intermediate', '4-5 months', '#4DABF7', '#74C0FC', 35, 1200),
  ('987fcdeb-51a2-3d4b-8c9e-012345678901', 'de', 'German', 'Deutsch', '132 million', 'Intermediate', '5-6 months', '#51CF66', '#69DB7C', 40, 1500),
  ('550e8400-e29b-41d4-a716-446655440000', 'it', 'Italian', 'Italiano', '68 million', 'Beginner', '3-4 months', '#FAB005', '#FFD43B', 25, 800),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'ja', 'Japanese', '日本語', '128 million', 'Advanced', '8-12 months', '#FF922B', '#FFA94D', 50, 2000);

-- Insert categories
INSERT INTO categories (id, name, description, difficulty, icon)
VALUES
  ('7ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Basics', 'Essential phrases and greetings', 'Beginner', 'book'),
  ('8ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Travel', 'Useful phrases for traveling', 'Beginner', 'airplane'),
  ('9ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Food & Dining', 'Restaurant and food-related phrases', 'Beginner', 'restaurant'),
  ('aba7b810-9dad-11d1-80b4-00c04fd430c8', 'Business', 'Professional and workplace vocabulary', 'Intermediate', 'briefcase'),
  ('bba7b810-9dad-11d1-80b4-00c04fd430c8', 'Culture', 'Cultural aspects and traditions', 'Intermediate', 'globe');

-- Insert lessons for Spanish
INSERT INTO lessons (id, language_id, category_id, title, description, difficulty, duration, order_index)
VALUES
  ('cba7b810-9dad-11d1-80b4-00c04fd430c8', 'd7897fee-4fa5-4d4f-8eee-90b69d38959c', '7ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Greetings & Introductions', 'Learn basic Spanish greetings and how to introduce yourself', 'Beginner', '15 min', 1),
  ('dba7b810-9dad-11d1-80b4-00c04fd430c8', 'd7897fee-4fa5-4d4f-8eee-90b69d38959c', '7ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Numbers & Counting', 'Master numbers 1-100 in Spanish', 'Beginner', '20 min', 2);

-- Insert phrases for Spanish lessons
INSERT INTO phrases (id, lesson_id, original_text, translated_text, pronunciation, audio_url, order_index)
VALUES
  ('eba7b810-9dad-11d1-80b4-00c04fd430c8', 'cba7b810-9dad-11d1-80b4-00c04fd430c8', '¡Hola!', 'Hello!', 'OH-lah', 'https://example.com/audio/hola.mp3', 1),
  ('fba7b810-9dad-11d1-80b4-00c04fd430c8', 'cba7b810-9dad-11d1-80b4-00c04fd430c8', 'Buenos días', 'Good morning', 'BWEH-nohs DEE-ahs', 'https://example.com/audio/buenos-dias.mp3', 2),
  ('0ba7b810-9dad-11d1-80b4-00c04fd430c8', 'cba7b810-9dad-11d1-80b4-00c04fd430c8', '¿Cómo estás?', 'How are you?', 'KOH-moh ehs-TAHS', 'https://example.com/audio/como-estas.mp3', 3),
  ('1ba7b810-9dad-11d1-80b4-00c04fd430c8', 'cba7b810-9dad-11d1-80b4-00c04fd430c8', 'Me llamo...', 'My name is...', 'meh YAH-moh', 'https://example.com/audio/me-llamo.mp3', 4);

-- Insert exercises for Spanish lessons
INSERT INTO exercises (id, lesson_id, type, question, correct_answer, order_index)
VALUES
  ('2ba7b810-9dad-11d1-80b4-00c04fd430c8', 'cba7b810-9dad-11d1-80b4-00c04fd430c8', 'multiple-choice', 'What does "¡Hola!" mean?', 'Hello!', 1),
  ('3ba7b810-9dad-11d1-80b4-00c04fd430c8', 'cba7b810-9dad-11d1-80b4-00c04fd430c8', 'multiple-choice', 'How do you say "Good morning" in Spanish?', 'Buenos días', 2);

-- Insert exercise options
INSERT INTO exercise_options (id, exercise_id, option_text, order_index)
VALUES
  ('4ba7b810-9dad-11d1-80b4-00c04fd430c8', '2ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Hello!', 1),
  ('5ba7b810-9dad-11d1-80b4-00c04fd430c8', '2ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Goodbye!', 2),
  ('6ca7b810-9dad-11d1-80b4-00c04fd430c8', '2ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Thank you!', 3),
  ('7ca7b810-9dad-11d1-80b4-00c04fd430c8', '2ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Please!', 4),
  ('8ca7b810-9dad-11d1-80b4-00c04fd430c8', '3ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Buenas noches', 1),
  ('9ca7b810-9dad-11d1-80b4-00c04fd430c8', '3ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Buenos días', 2),
  ('aca7b810-9dad-11d1-80b4-00c04fd430c8', '3ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Buenas tardes', 3),
  ('bca7b810-9dad-11d1-80b4-00c04fd430c8', '3ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Hasta luego', 4);
