import { supabase } from '@/lib/supabase';

export const getUserStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // If no stats exist, create default stats
        const defaultStats = {
          id: user.id,
          total_xp: 0,
          current_streak: 0,
          longest_streak: 0,
          // lessons_completed: 0,
          // perfect_lessons: 0
        };

        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert([defaultStats])
          .select()
          .single();

        if (insertError) throw insertError;
        return newStats;
      }
      throw error;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
};

export const getDailyGoal = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: goal, error } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('goal_date', new Date().toISOString().split('T')[0])
      .single();

    if (error) throw error;
    return goal;
  } catch (error) {
    console.error('Error fetching daily goal:', error);
    return null;
  }
};

export const getAchievements = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get earned achievements
    const { data: earnedAchievements, error: earnedError } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements (
          id,
          name,
          description,
          category,
          icon_name,
          xp_reward,
          requirement_type,
          requirement_value
        )
      `)
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (earnedError) throw earnedError;

    // Get all achievements to show progress
    const { data: allAchievements, error: allError } = await supabase
      .from('achievements')
      .select('*')
      .order('requirement_value', { ascending: true });

    if (allError) throw allError;

    // Get user stats for progress calculation
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', user.id)
      .single();

    if (statsError) throw statsError;

    // Calculate progress for each achievement
    const achievementsWithProgress = allAchievements.map(achievement => {
      const earned = earnedAchievements?.find(ea => ea.achievement_id === achievement.id);
      let progress = 0;

      if (earned) {
        progress = 100;
      } else {
        // Calculate progress based on requirement type
        switch (achievement.requirement_type) {
          case 'lessons_completed':
            progress = Math.min(100, (userStats.lessons_completed / achievement.requirement_value) * 100);
            break;
          case 'perfect_scores':
            progress = Math.min(100, (userStats.perfect_lessons / achievement.requirement_value) * 100);
            break;
          case 'streak_days':
            progress = Math.min(100, (userStats.current_streak / achievement.requirement_value) * 100);
            break;
          case 'total_xp':
            progress = Math.min(100, (userStats.total_xp / achievement.requirement_value) * 100);
            break;
        }
      }

      return {
        ...achievement,
        progress: Math.round(progress),
        earned: !!earned,
        earned_at: earned?.earned_at
      };
    });

    return achievementsWithProgress;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return null;
  }
};

export const getXPHistory = async (limit = 10) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: transactions, error } = await supabase
      .from('xp_transactions')
      .select(`
        *,
        achievement:achievements (
          name,
          description,
          category,
          icon_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Format transactions for display
    return transactions.map(transaction => ({
      ...transaction,
      formattedMetadata: formatXPTransactionMetadata(transaction)
    }));
  } catch (error) {
    console.error('Error fetching XP history:', error);
    return null;
  }
};

// Helper function to format XP transaction metadata
const formatXPTransactionMetadata = (transaction: any) => {
  if (!transaction.metadata) return '';

  switch (transaction.source) {
    case 'lesson_completion':
      return `Completed lesson with ${transaction.metadata.score}% score`;
    case 'achievement':
      return transaction.metadata.description || transaction.achievement?.description || 'Achievement unlocked';
    default:
      return '';
  }
};

export interface LanguageProgress {
  language: string;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
}

export const getLanguageProgress = async (userId: string): Promise<LanguageProgress[]> => {
  const { data, error } = await supabase
    .rpc('calculate_language_progress', { 
      user_id_param: userId 
    });

  if (error) {
    console.error('Error getting language progress:', error);
    return [];
  }

  return data?.map((item: any) => ({
    language: item.language,
    completedLessons: item.completed_lessons,
    totalLessons: item.total_lessons,
    progressPercentage: item.progress_percentage
  })) || [];
};

export const updateLessonProgress = async (lessonId: string, score: number) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // First, update or insert the lesson progress
    const { error: progressError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        score: score,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (progressError) throw progressError;

    // Then update user stats and check achievements
    const { error: statsError } = await supabase
      .rpc('update_user_stats_and_achievements', {
        user_id_param: user.id,
        lesson_score: score
      });

    if (statsError) throw statsError;

    return true;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
};
