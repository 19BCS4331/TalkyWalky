import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oieoxgngqydvjzbyfrav.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZW94Z25ncXlkdmp6YnlmcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzEyMzgsImV4cCI6MjA1MzgwNzIzOH0.Nelk8fjA9Yh5gbli3MDSI9L0Jaz4Z15qepWFvr8AOCE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking tables...\n');

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
        .rpc('check_tables_exist', {
            table_names: ['user_progress', 'xp_transactions', 'user_stats', 'daily_goals', 'level_config']
        });

    if (tablesError) {
        console.log('Error checking tables:', tablesError);
        
        // Create the function if it doesn't exist
        await supabase.rpc('create_check_tables_function');
        
        // Try again
        const { data: retryTables, error: retryError } = await supabase
            .rpc('check_tables_exist', {
                table_names: ['user_progress', 'xp_transactions', 'user_stats', 'daily_goals', 'level_config']
            });
            
        if (retryError) {
            console.log('Error checking tables (retry):', retryError);
            return;
        }
        console.log('Tables exist:', retryTables);
    } else {
        console.log('Tables exist:', tables);
    }

    // Check user_progress
    const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .limit(5);
    
    console.log('\nLatest user_progress entries:');
    if (progressError) {
        console.log('Error:', progressError);
    } else {
        console.log(progress);
    }

    // Check xp_transactions
    const { data: xp, error: xpError } = await supabase
        .from('xp_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log('\nLatest XP transactions:');
    if (xpError) {
        console.log('Error:', xpError);
    } else {
        console.log(xp);
    }

    // Check user_stats
    const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .limit(5);
    
    console.log('\nUser stats:');
    if (statsError) {
        console.log('Error:', statsError);
    } else {
        console.log(stats);
    }

    // Check daily_goals
    const { data: goals, error: goalsError } = await supabase
        .from('daily_goals')
        .select('*')
        .order('goal_date', { ascending: false })
        .limit(5);
    
    console.log('\nLatest daily goals:');
    if (goalsError) {
        console.log('Error:', goalsError);
    } else {
        console.log(goals);
    }

    // Check triggers
    const { data: triggers, error: triggersError } = await supabase
        .rpc('list_triggers');
    
    console.log('\nTriggers:');
    if (triggersError) {
        console.log('Error:', triggersError);
        
        // Create the function if it doesn't exist
        await supabase.rpc('create_list_triggers_function');
        
        // Try again
        const { data: retryTriggers, error: retryError } = await supabase
            .rpc('list_triggers');
            
        if (retryError) {
            console.log('Error listing triggers (retry):', retryError);
        } else {
            console.log(retryTriggers);
        }
    } else {
        console.log(triggers);
    }
}

// Create helper functions in the database
async function createHelperFunctions() {
    // Function to check if tables exist
    await supabase.rpc('execute_sql', {
        sql: `
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
        `
    });

    // Function to list triggers
    await supabase.rpc('execute_sql', {
        sql: `
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
        `
    });
}

async function main() {
    await createHelperFunctions();
    await checkTables();
}

main().catch(console.error);
