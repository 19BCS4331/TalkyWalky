-- Drop existing tables (in correct order due to dependencies)
DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_lesson_complete ON user_progress CASCADE;
DROP TRIGGER IF EXISTS update_level_on_xp_change ON user_stats CASCADE;
DROP TRIGGER IF EXISTS on_xp_transaction ON xp_transactions CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_stats() CASCADE;
DROP FUNCTION IF EXISTS award_lesson_xp() CASCADE;
DROP FUNCTION IF EXISTS update_user_level() CASCADE;
DROP FUNCTION IF EXISTS update_user_stats_on_xp() CASCADE;

DROP TABLE IF EXISTS daily_goals CASCADE;
DROP TABLE IF EXISTS xp_transactions CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS level_config CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;

-- Create tables
CREATE TABLE user_stats (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0
);

CREATE TABLE user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    lesson_id UUID NOT NULL,
    completed BOOLEAN DEFAULT false,
    score INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE xp_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    source_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE daily_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    goal_date DATE NOT NULL,
    xp_target INTEGER NOT NULL DEFAULT 100,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, goal_date)
);

CREATE TABLE achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL,
    icon_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- Level Configuration
DROP TABLE IF EXISTS level_config CASCADE;
CREATE TABLE level_config (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert level configuration data
INSERT INTO level_config (level, xp_required, title)
VALUES 
    (1, 0, 'Beginner'),
    (2, 100, 'Novice'),
    (3, 300, 'Apprentice'),
    (4, 600, 'Student'),
    (5, 1000, 'Scholar'),
    (6, 1500, 'Graduate'),
    (7, 2100, 'Expert'),
    (8, 2800, 'Master'),
    (9, 3600, 'Grandmaster'),
    (10, 4500, 'Legend')
ON CONFLICT (level) DO UPDATE
SET xp_required = EXCLUDED.xp_required,
    title = EXCLUDED.title;

-- Insert initial achievements
INSERT INTO achievements (name, description, category, requirement_type, requirement_value, xp_reward, icon_name)
VALUES
('First Steps', 'Complete your first lesson', 'lesson', 'lessons_completed', 1, 50, 'first-lesson'),
('Getting Started', 'Complete 5 lessons', 'lesson', 'lessons_completed', 5, 100, 'five-lessons'),
('Dedicated Learner', 'Complete 25 lessons', 'lesson', 'lessons_completed', 25, 250, 'twenty-five-lessons'),
('Language Explorer', 'Complete 100 lessons', 'lesson', 'lessons_completed', 100, 500, 'hundred-lessons'),
('Streak Starter', 'Maintain a 3-day streak', 'streak', 'streak_days', 3, 50, 'three-day-streak'),
('Streak Master', 'Maintain a 7-day streak', 'streak', 'streak_days', 7, 100, 'seven-day-streak'),
('Streak Champion', 'Maintain a 30-day streak', 'streak', 'streak_days', 30, 500, 'thirty-day-streak'),
('XP Hunter', 'Earn 1000 XP', 'xp', 'total_xp', 1000, 200, 'xp-1000'),
('XP Master', 'Earn 5000 XP', 'xp', 'total_xp', 5000, 500, 'xp-5000'),
('Perfect Start', 'Get 100% on your first lesson', 'lesson', 'perfect_scores', 1, 100, 'perfect-1'),
('Perfectionist', 'Get 100% on 5 lessons', 'lesson', 'perfect_scores', 5, 300, 'perfect-5');

-- Update achievement icons to use valid MaterialCommunityIcons names
UPDATE achievements 
SET icon_name = 
    CASE 
        WHEN name = 'First Steps' THEN 'shoe-print'
        WHEN name = 'Perfect Start' THEN 'star-circle'
        WHEN name = 'Getting Started' THEN 'rocket'
        WHEN name = 'Streak Master' THEN 'fire'
        WHEN name = 'Language Explorer' THEN 'compass'
        WHEN name = 'XP Hunter' THEN 'trophy-award'
        WHEN name = 'XP Master' THEN 'numeric-10-circle'
        WHEN name = 'Streak Starter' THEN 'calendar-check'
        WHEN name = 'Streak Champion' THEN 'school'
        WHEN name = 'Dedicated Learner' THEN 'medal'
        WHEN name = 'Perfectionist' THEN 'trophy' -- Default icon
        ELSE 'trophy' -- Default icon
    END;

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

-- Drop any existing triggers on user_stats
DROP TRIGGER IF EXISTS update_user_level ON user_stats CASCADE;
DROP TRIGGER IF EXISTS after_user_stats_update ON user_stats CASCADE;

-- Function to award XP when a lesson is completed
CREATE OR REPLACE FUNCTION award_lesson_xp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    base_xp integer := 50;  -- Base XP for completing a lesson
    bonus_xp integer;       -- Bonus XP based on score
    xp_to_award integer;    -- Total XP to award
    user_stats_exists boolean;
    xp_already_awarded boolean;
    lock_obtained boolean;
    lock_key bigint;
    current_xp integer;
BEGIN
    -- Debug log start
    RAISE LOG 'award_lesson_xp triggered: TG_OP=%, OLD.completed=%, NEW.completed=%, OLD.score=%, NEW.score=%', 
              TG_OP, OLD.completed, NEW.completed, OLD.score, NEW.score;

    -- Create a unique lock key based on user_id and lesson_id
    lock_key := ('x' || substr(md5(NEW.user_id::text || '-' || NEW.lesson_id::text), 1, 16))::bit(64)::bigint;
    
    -- Try to obtain a lock
    lock_obtained := pg_try_advisory_xact_lock(lock_key);
    
    IF NOT lock_obtained THEN
        RAISE LOG 'Could not obtain lock for user_id=% and lesson_id=%', NEW.user_id, NEW.lesson_id;
        RETURN NEW;
    END IF;

    -- Ensure daily goals exist
    PERFORM ensure_daily_goals(NEW.user_id);

    -- Check if XP was already awarded for this lesson
    SELECT EXISTS (
        SELECT 1 
        FROM xp_transactions 
        WHERE user_id = NEW.user_id 
        AND source = 'lesson_completion' 
        AND source_id = NEW.lesson_id
        FOR UPDATE
    ) INTO xp_already_awarded;

    -- Get current XP before any updates
    SELECT total_xp INTO current_xp FROM user_stats WHERE id = NEW.user_id FOR UPDATE;
    RAISE LOG 'Current XP before update: %', current_xp;

    -- Only award XP if:
    -- 1. This is an INSERT with completed=true, or UPDATE from false/null to true
    -- 2. XP hasn't been awarded for this lesson yet
    -- 3. A score is provided
    IF (
        NOT xp_already_awarded AND
        NEW.score IS NOT NULL AND
        NEW.completed = true AND
        (
            TG_OP = 'INSERT' OR 
            (TG_OP = 'UPDATE' AND (OLD.completed IS NULL OR OLD.completed = false))
        )
    ) THEN
        -- Calculate bonus XP based on score (up to 50 bonus XP)
        bonus_xp := FLOOR((NEW.score::float / 100) * 50);
        xp_to_award := base_xp + bonus_xp;

        RAISE LOG 'Awarding XP: base_xp=%, bonus_xp=%, xp_to_award=%, user_id=%, lesson_id=%', 
                    base_xp, bonus_xp, xp_to_award, NEW.user_id, NEW.lesson_id;

        -- Check if user_stats exists
        SELECT EXISTS (
            SELECT 1 FROM user_stats WHERE id = NEW.user_id FOR UPDATE
        ) INTO user_stats_exists;

        -- Create user_stats if it doesn't exist
        IF NOT user_stats_exists THEN
            INSERT INTO user_stats (id, total_xp, level, last_activity_date)
            VALUES (NEW.user_id, 0, 1, CURRENT_DATE);
            RAISE LOG 'Created new user_stats record for user %', NEW.user_id;
        END IF;

        BEGIN
            -- Insert XP transaction first
            INSERT INTO xp_transactions (
                user_id,
                amount,
                source,
                source_id,
                metadata
            ) VALUES (
                NEW.user_id,
                xp_to_award,
                'lesson_completion',
                NEW.lesson_id,
                jsonb_build_object(
                    'lesson_id', NEW.lesson_id,
                    'score', NEW.score,
                    'base_xp', base_xp,
                    'bonus_xp', bonus_xp
                )
            );
            RAISE LOG 'XP transaction inserted successfully';

            -- Update daily goal
            INSERT INTO daily_goals (
                user_id,
                goal_date,
                xp_target,
                xp_earned
            ) VALUES (
                NEW.user_id,
                CURRENT_DATE,
                100,  -- Default daily target
                xp_to_award
            )
            ON CONFLICT (user_id, goal_date) DO UPDATE
            SET xp_earned = COALESCE(daily_goals.xp_earned, 0) + EXCLUDED.xp_earned,
                completed = CASE 
                    WHEN COALESCE(daily_goals.xp_earned, 0) + EXCLUDED.xp_earned >= EXCLUDED.xp_target 
                    THEN true 
                    ELSE false 
                END;
            RAISE LOG 'Daily goals updated successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Error in award_lesson_xp: %', SQLERRM;
            RAISE;
        END;
    ELSE
        RAISE LOG 'Skipping XP award: already awarded or conditions not met. xp_already_awarded=%, NEW.completed=%, NEW.score=%',
                  xp_already_awarded, NEW.completed, NEW.score;
    END IF;

    -- Check for achievements after XP award
    PERFORM check_and_award_achievements(NEW.user_id);
    RAISE LOG 'Achievements checked';

    RETURN NEW;
END;
$$;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS on_lesson_complete ON user_progress CASCADE;

-- Recreate trigger for both INSERT and UPDATE
CREATE TRIGGER on_lesson_complete
    AFTER INSERT OR UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION award_lesson_xp();

-- Create a trigger to update user level
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    new_level integer;
BEGIN
    -- Only proceed if total_xp has changed
    IF OLD.total_xp = NEW.total_xp THEN
        RETURN NEW;
    END IF;

    RAISE LOG 'update_user_level triggered. Old XP: %, New XP: %', OLD.total_xp, NEW.total_xp;

    -- Get the new level based on total XP
    SELECT level INTO new_level
    FROM level_config
    WHERE xp_required <= NEW.total_xp
    ORDER BY level DESC
    LIMIT 1;

    IF new_level IS NOT NULL AND new_level != NEW.level THEN
        NEW.level := new_level;
        RAISE LOG 'User level updated to: %', new_level;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_level
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- Function to update user stats when XP is earned
CREATE OR REPLACE FUNCTION update_user_stats_on_xp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RAISE LOG 'update_user_stats_on_xp triggered: NEW.amount=%, NEW.user_id=%', 
                NEW.amount, NEW.user_id;

    -- Update user stats
    UPDATE user_stats
    SET total_xp = COALESCE(total_xp, 0) + NEW.amount,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = NEW.user_id;

    -- Update daily goals
    INSERT INTO daily_goals (user_id, goal_date, xp_target, xp_earned)
    VALUES (NEW.user_id, CURRENT_DATE, 100, NEW.amount)
    ON CONFLICT (user_id, goal_date) DO UPDATE
    SET 
        xp_earned = COALESCE(daily_goals.xp_earned, 0) + EXCLUDED.xp_earned,
        completed = CASE 
            WHEN COALESCE(daily_goals.xp_earned, 0) + EXCLUDED.xp_earned >= daily_goals.xp_target 
            THEN true 
            ELSE false 
        END;

    RAISE LOG 'User stats and daily goals updated successfully';
    RETURN NEW;
END;
$$;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS update_level_on_xp_change ON user_stats CASCADE;
DROP TRIGGER IF EXISTS on_xp_transaction ON xp_transactions CASCADE;

-- Recreate triggers
CREATE TRIGGER update_level_on_xp_change
    BEFORE UPDATE OF total_xp ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

CREATE TRIGGER on_xp_transaction
    AFTER INSERT ON xp_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_xp();

-- Function to calculate and update streaks
CREATE OR REPLACE FUNCTION calculate_streaks(user_id_param UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    current_streak_count INTEGER := 0;
    longest_streak_count INTEGER := 0;
    last_completed_date DATE := NULL;
    goal_record RECORD;
BEGIN
    -- Get the current longest streak
    SELECT longest_streak INTO longest_streak_count
    FROM user_stats
    WHERE id = user_id_param;

    -- Calculate current streak
    FOR goal_record IN (
        SELECT goal_date, completed
        FROM daily_goals
        WHERE user_id = user_id_param
        AND goal_date <= CURRENT_DATE
        ORDER BY goal_date DESC
    ) LOOP
        IF goal_record.completed THEN
            IF last_completed_date IS NULL OR 
               last_completed_date = goal_record.goal_date + 1 THEN
                current_streak_count := current_streak_count + 1;
                last_completed_date := goal_record.goal_date;
            ELSE
                EXIT;
            END IF;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    -- Update longest streak if current streak is longer
    IF current_streak_count > longest_streak_count THEN
        longest_streak_count := current_streak_count;
    END IF;

    -- Update user_stats with new streak values
    UPDATE user_stats
    SET current_streak = current_streak_count,
        longest_streak = longest_streak_count
    WHERE id = user_id_param;
END;
$$;

-- Function to update streaks when daily goals are updated
CREATE OR REPLACE FUNCTION update_streaks_on_daily_goal_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Only recalculate if the completion status changed
    IF (TG_OP = 'UPDATE' AND OLD.completed != NEW.completed) OR
       TG_OP = 'INSERT' THEN
        PERFORM calculate_streaks(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for streak updates
DROP TRIGGER IF EXISTS on_daily_goal_change ON daily_goals CASCADE;
CREATE TRIGGER on_daily_goal_change
    AFTER INSERT OR UPDATE ON daily_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_streaks_on_daily_goal_change();

-- Function to ensure daily goals exist
CREATE OR REPLACE FUNCTION ensure_daily_goals(user_id_param UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Create daily goal for today if it doesn't exist
    INSERT INTO daily_goals (user_id, goal_date, xp_target)
    VALUES (user_id_param, CURRENT_DATE, 100)
    ON CONFLICT (user_id, goal_date) DO NOTHING;

    -- Create daily goal for yesterday if it doesn't exist (to handle streak calculation)
    INSERT INTO daily_goals (user_id, goal_date, xp_target)
    VALUES (user_id_param, CURRENT_DATE - INTERVAL '1 day', 100)
    ON CONFLICT (user_id, goal_date) DO NOTHING;
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(user_id_param UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    user_stats_record RECORD;
    achievement RECORD;
    xp_awarded INTEGER;
    lock_obtained boolean;
    lock_key bigint;
BEGIN
    -- Create a unique lock key based on user_id
    lock_key := ('x' || substr(md5(user_id_param::text), 1, 16))::bit(64)::bigint;
    
    -- Try to obtain a lock
    lock_obtained := pg_try_advisory_xact_lock(lock_key);
    
    IF NOT lock_obtained THEN
        RAISE LOG 'Could not obtain lock for user_id=% in check_and_award_achievements', user_id_param;
        RETURN;
    END IF;

    -- Get user stats with locking
    SELECT 
        total_xp,
        current_streak,
        COALESCE((
            SELECT COUNT(*)::integer 
            FROM user_progress 
            WHERE user_id = user_id_param 
            AND completed = true
        ), 0) as lessons_completed,
        COALESCE((
            SELECT COUNT(*)::integer 
            FROM user_progress 
            WHERE user_id = user_id_param 
            AND completed = true 
            AND score = 100
        ), 0) as perfect_lessons
    INTO user_stats_record
    FROM user_stats
    WHERE id = user_id_param
    FOR UPDATE;

    -- Check each unearned achievement
    FOR achievement IN 
        SELECT a.* 
        FROM achievements a
        WHERE NOT EXISTS (
            SELECT 1 
            FROM user_achievements ua 
            WHERE ua.user_id = user_id_param 
            AND ua.achievement_id = a.id
        )
        ORDER BY a.requirement_value ASC
        FOR UPDATE OF a
    LOOP
        xp_awarded := 0;

        -- Check if achievement conditions are met
        CASE achievement.requirement_type
            WHEN 'lessons_completed' THEN
                IF user_stats_record.lessons_completed >= achievement.requirement_value THEN
                    xp_awarded := achievement.xp_reward;
                END IF;
            
            WHEN 'perfect_scores' THEN
                IF user_stats_record.perfect_lessons >= achievement.requirement_value THEN
                    xp_awarded := achievement.xp_reward;
                END IF;
            
            WHEN 'streak_days' THEN
                IF user_stats_record.current_streak >= achievement.requirement_value THEN
                    xp_awarded := achievement.xp_reward;
                END IF;
            
            WHEN 'total_xp' THEN
                IF user_stats_record.total_xp >= achievement.requirement_value THEN
                    xp_awarded := achievement.xp_reward;
                END IF;
        END CASE;

        -- If achievement earned, record it and award XP
        IF xp_awarded > 0 THEN
            BEGIN
                -- Record achievement with explicit locking
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (user_id_param, achievement.id)
                ON CONFLICT (user_id, achievement_id) DO NOTHING;

                -- Only proceed if we actually inserted the achievement
                IF FOUND THEN
                    -- Add XP transaction
                    INSERT INTO xp_transactions (
                        user_id, 
                        amount, 
                        source,
                        source_id,
                        metadata
                    ) VALUES (
                        user_id_param,
                        xp_awarded,
                        'achievement',
                        achievement.id,
                        jsonb_build_object(
                            'achievement_name', achievement.name,
                            'achievement_type', achievement.requirement_type,
                            'requirement_value', achievement.requirement_value
                        )
                    );
                    
                    RAISE LOG 'Achievement awarded: % (Type: %, XP: %)',
                        achievement.name, achievement.requirement_type, xp_awarded;
                END IF;
            EXCEPTION WHEN unique_violation THEN
                -- Another transaction already awarded this achievement
                RAISE LOG 'Achievement % already awarded to user %',
                    achievement.name, user_id_param;
            END;
        END IF;
    END LOOP;
END;
$$;

-- Trigger function to check achievements after XP updates
CREATE OR REPLACE FUNCTION check_achievements_after_xp_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Only check achievements if XP has changed
    IF OLD.total_xp IS DISTINCT FROM NEW.total_xp THEN
        PERFORM check_and_award_achievements(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for checking achievements after XP updates
DROP TRIGGER IF EXISTS check_achievements_on_xp_update ON user_stats;
CREATE TRIGGER check_achievements_on_xp_update
    AFTER UPDATE OF total_xp ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION check_achievements_after_xp_update();

-- Set up Row Level Security (RLS)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress CASCADE;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress CASCADE;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress CASCADE;
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats CASCADE;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats CASCADE;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats CASCADE;
DROP POLICY IF EXISTS "System can manage user stats" ON user_stats CASCADE;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements CASCADE;
DROP POLICY IF EXISTS "System can manage achievements" ON user_achievements CASCADE;
DROP POLICY IF EXISTS "Users can view their own daily goals" ON daily_goals CASCADE;
DROP POLICY IF EXISTS "System can manage daily goals" ON daily_goals CASCADE;
DROP POLICY IF EXISTS "Users can view their own XP transactions" ON xp_transactions CASCADE;
DROP POLICY IF EXISTS "System can manage XP transactions" ON xp_transactions CASCADE;

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_stats
CREATE POLICY "Users can view their own stats"
    ON user_stats FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own stats"
    ON user_stats FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own stats"
    ON user_stats FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_goals
CREATE POLICY "Users can view their own daily goals"
    ON daily_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily goals"
    ON daily_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily goals"
    ON daily_goals FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for xp_transactions
CREATE POLICY "Users can view their own XP transactions"
    ON xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions"
    ON xp_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable the service role to bypass RLS
ALTER TABLE user_stats FORCE ROW LEVEL SECURITY;
ALTER TABLE user_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE user_achievements FORCE ROW LEVEL SECURITY;
ALTER TABLE daily_goals FORCE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_progress TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_goals TO authenticated;
GRANT SELECT, INSERT ON xp_transactions TO authenticated;
