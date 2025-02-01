-- Function to check if tables exist
CREATE OR REPLACE FUNCTION check_tables_exist(table_names text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb = '{}'::jsonb;
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY table_names
    LOOP
        result = result || jsonb_build_object(
            tbl,
            EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = tbl
            )
        );
    END LOOP;
    RETURN result;
END;
$$;

-- Function to list triggers
CREATE OR REPLACE FUNCTION list_triggers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(jsonb_build_object(
        'trigger_name', trigger_name,
        'event_manipulation', event_manipulation,
        'event_object_table', event_object_table,
        'action_statement', action_statement
    ))
    INTO result
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    RETURN result;
END;
$$;

-- Check tables
SELECT check_tables_exist(ARRAY['user_progress', 'xp_transactions', 'user_stats', 'daily_goals', 'level_config']);

-- List triggers
SELECT list_triggers();

-- Check for any rows in user_progress
SELECT * FROM user_progress LIMIT 5;

-- Check for any rows in xp_transactions
SELECT * FROM xp_transactions LIMIT 5;

-- Check for any rows in user_stats
SELECT * FROM user_stats LIMIT 5;

-- Check for any rows in daily_goals
SELECT * FROM daily_goals LIMIT 5;

-- Check for any rows in level_config
SELECT * FROM level_config LIMIT 5;

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'user_progress';

-- Check trigger function
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.provolatile,
    p.proleakproof,
    p.prosrc as source_code
FROM pg_proc p
WHERE p.proname = 'award_lesson_xp';

-- Check user_progress permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'user_progress';

-- Check if there are any recent user_progress updates
SELECT *
FROM user_progress
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 5;

-- Check if there are any recent xp_transactions
SELECT *
FROM xp_transactions
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any recent user_stats updates
SELECT *
FROM user_stats
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 5;

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_progress', 'user_stats', 'xp_transactions', 'daily_goals');

-- Enable logging for trigger debugging
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_min_messages = 'debug1';
