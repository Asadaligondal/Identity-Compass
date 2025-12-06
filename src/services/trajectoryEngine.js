import { calculateDimensionScores } from '../constants/dimensions';
import { getTagAnalytics } from './dailyLogService';

/**
 * Trajectory Engine - Analyzes user data to determine life direction
 */

// Calculate dimension percentages from tag analytics
export const calculateTrajectory = async (userId, days = 30) => {
  try {
    const analytics = await getTagAnalytics(userId, days);
    
    if (analytics.totalLogs === 0) {
      return {
        hasData: false,
        message: 'No data available. Start logging to see your trajectory.',
      };
    }
    
    // Get all tags from frequency map
    const allTags = Object.keys(analytics.tagFrequency);
    
    // Calculate dimension scores
    const dimensionScores = calculateDimensionScores(allTags);
    
    // Calculate weighted scores (frequency * occurrence)
    const weightedScores = {};
    Object.keys(dimensionScores).forEach(dimension => {
      weightedScores[dimension] = 0;
    });
    
    allTags.forEach(tag => {
      const scores = calculateDimensionScores([tag]);
      Object.keys(scores).forEach(dimension => {
        if (scores[dimension] > 0) {
          weightedScores[dimension] += analytics.tagFrequency[tag];
        }
      });
    });
    
    // Calculate total for percentages
    const total = Object.values(weightedScores).reduce((sum, val) => sum + val, 0);
    
    // Convert to percentages
    const percentages = {};
    Object.keys(weightedScores).forEach(dimension => {
      percentages[dimension] = total > 0 
        ? Math.round((weightedScores[dimension] / total) * 100) 
        : 0;
    });
    
    // Identify dominant dimension
    const dominant = Object.keys(percentages).reduce((a, b) => 
      percentages[a] > percentages[b] ? a : b
    );
    
    return {
      hasData: true,
      totalLogs: analytics.totalLogs,
      dateRange: analytics.dateRange,
      dimensionScores: weightedScores,
      percentages,
      dominantDimension: dominant,
      trajectory: generateTrajectoryInsight(percentages, dominant),
    };
  } catch (error) {
    console.error('Error calculating trajectory:', error);
    throw error;
  }
};

// Generate insight message based on trajectory
const generateTrajectoryInsight = (percentages, dominant) => {
  const score = percentages[dominant];
  
  if (score > 50) {
    return `You're heavily focused on ${dominant}. Consider balancing other dimensions.`;
  } else if (score > 30) {
    return `${dominant} is your primary focus. You're building momentum here.`;
  } else {
    return `Your energy is well-distributed across dimensions. You're balanced.`;
  }
};

// Get trajectory trend (comparing different time periods)
export const getTrajectoryTrend = async (userId) => {
  try {
    const last7Days = await calculateTrajectory(userId, 7);
    const last30Days = await calculateTrajectory(userId, 30);
    
    if (!last7Days.hasData || !last30Days.hasData) {
      return {
        hasTrend: false,
        message: 'Not enough data to calculate trends.',
      };
    }
    
    // Calculate changes
    const changes = {};
    Object.keys(last7Days.percentages).forEach(dimension => {
      const change = last7Days.percentages[dimension] - last30Days.percentages[dimension];
      changes[dimension] = {
        value: change,
        direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      };
    });
    
    return {
      hasTrend: true,
      last7Days: last7Days.percentages,
      last30Days: last30Days.percentages,
      changes,
      currentFocus: last7Days.dominantDimension,
      previousFocus: last30Days.dominantDimension,
    };
  } catch (error) {
    console.error('Error calculating trajectory trend:', error);
    throw error;
  }
};
