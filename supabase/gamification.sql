-- Gamification Tables

-- User Experience and Levels (extends user_progress functionality)
CREATE TABLE user_stats (
    id uuid references auth.users on delete cascade primary key,
    total_xp integer default 0,
    level integer default 1,
    current_streak integer default 0,
    longest_streak integer default 0,
    last_activity_date date,
    streak_freeze_count integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Achievements
CREATE TABLE achievements (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text not null,
    category text not null, -- 'streak', 'xp', 'lesson', 'language'
    requirement_type text not null, -- 'streak_days', 'total_xp', 'lessons_completed', etc.
    requirement_value integer not null,
    xp_reward integer not null,
    icon_name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User Achievements
CREATE TABLE user_achievements (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade,
    achievement_id uuid references achievements(id) on delete cascade,
    unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    UNIQUE(user_id, achievement_id)
);

-- Daily Goals
CREATE TABLE daily_goals (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade,
    goal_date date not null,
    xp_target integer not null default 50,
    xp_earned integer not null default 0,
    completed boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    UNIQUE(user_id, goal_date)
);

-- XP Transactions (tied to user_progress)
CREATE TABLE xp_transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade,
    amount integer not null,
    source text not null, -- 'lesson_complete', 'achievement_unlock', 'streak_bonus', etc.
    progress_id uuid references user_progress(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Level Configuration
CREATE TABLE level_config (
    level integer primary key,
    xp_required integer not null,
    xp_to_next_level integer not null,
    rewards jsonb -- Store any level-specific rewards
);

-- Insert initial achievements
INSERT INTO achievements (name, description, category, requirement_type, requirement_value, xp_reward, icon_name) VALUES
-- Streak Achievements
('Beginner Streak', 'Maintain a 3-day learning streak', 'streak', 'streak_days', 3, 50, 'streak-3'),
('Consistent Learner', 'Maintain a 7-day learning streak', 'streak', 'streak_days', 7, 100, 'streak-7'),
('Dedication Master', 'Maintain a 30-day learning streak', 'streak', 'streak_days', 30, 500, 'streak-30'),

-- XP Achievements
('XP Collector', 'Earn 500 XP', 'xp', 'total_xp', 500, 100, 'xp-500'),
('XP Master', 'Earn 1000 XP', 'xp', 'total_xp', 1000, 200, 'xp-1000'),
('XP Champion', 'Earn 5000 XP', 'xp', 'total_xp', 5000, 1000, 'xp-5000'),

-- Lesson Achievements
('First Steps', 'Complete your first lesson', 'lesson', 'lessons_completed', 1, 50, 'lesson-1'),
('Quick Learner', 'Complete 5 lessons', 'lesson', 'lessons_completed', 5, 100, 'lesson-5'),
('Study Expert', 'Complete 20 lessons', 'lesson', 'lessons_completed', 20, 300, 'lesson-20'),

-- Perfect Score Achievements
('Perfect Start', 'Get 100% on your first lesson', 'lesson', 'perfect_scores', 1, 100, 'perfect-1'),
('Perfectionist', 'Get 100% on 5 lessons', 'lesson', 'perfect_scores', 5, 300, 'perfect-5');

-- Insert level configuration
INSERT INTO level_config (level, xp_required, xp_to_next_level, rewards) VALUES
(1, 0, 100, '{"streak_freeze": 1}'),
(2, 100, 200, '{"bonus_xp_multiplier": 1.1}'),
(3, 300, 300, '{"streak_freeze": 1}'),
(4, 600, 400, '{"bonus_xp_multiplier": 1.2}'),
(5, 1000, 500, '{"streak_freeze": 2, "bonus_xp_multiplier": 1.3}');

-- Set up Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stats"
    ON user_stats FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can view their own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily goals"
    ON daily_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own XP transactions"
    ON xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Function to handle new user stats setup
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_stats (id)
    VALUES (NEW.id);
    
    -- Create first daily goal
    INSERT INTO public.daily_goals (user_id, goal_date)
    VALUES (NEW.id, CURRENT_DATE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create stats profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created_stats
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_stats();

-- Function to award XP when lesson is completed
CREATE OR REPLACE FUNCTION award_lesson_xp()
RETURNS trigger AS $$
DECLARE
    xp_amount INTEGER;
    perfect_score BOOLEAN;
BEGIN
    -- Base XP for completing a lesson
    xp_amount := 50;
    
    -- Bonus XP for high scores
    IF NEW.score >= 90 THEN
        xp_amount := xp_amount + 30;
    ELSIF NEW.score >= 70 THEN
        xp_amount := xp_amount + 15;
    END IF;
    
    -- Perfect score check
    perfect_score := (NEW.score = 100);
    
    -- Record XP transaction
    INSERT INTO xp_transactions (user_id, amount, source, progress_id)
    VALUES (NEW.user_id, xp_amount, 'lesson_complete', NEW.id);
    
    -- Update user stats
    UPDATE user_stats
    SET total_xp = total_xp + xp_amount,
        last_activity_date = CURRENT_DATE
    WHERE id = NEW.user_id;
    
    -- Update daily goal
    UPDATE daily_goals
    SET xp_earned = xp_earned + xp_amount,
        completed = CASE WHEN xp_earned + xp_amount >= xp_target THEN true ELSE false END
    WHERE user_id = NEW.user_id AND goal_date = CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to award XP when lesson is completed
CREATE TRIGGER on_lesson_complete
    AFTER UPDATE OF completed ON user_progress
    FOR EACH ROW
    WHEN (OLD.completed = false AND NEW.completed = true)
    EXECUTE PROCEDURE award_lesson_xp();

-- Function to update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS trigger AS $$
DECLARE
    new_level integer;
BEGIN
    -- Find the highest level where the user's XP meets or exceeds the requirement
    SELECT level INTO new_level
    FROM level_config
    WHERE xp_required <= NEW.total_xp
    ORDER BY level DESC
    LIMIT 1;

    -- Update the user's level if it has changed
    IF new_level IS NOT NULL AND new_level != OLD.level THEN
        NEW.level := new_level;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update level when XP changes
CREATE TRIGGER update_level_on_xp_change
    BEFORE UPDATE OF total_xp ON user_stats
    FOR EACH ROW
    EXECUTE PROCEDURE update_user_level();
