import { calculateDimensionScores, getDimensionFromTag } from '../constants/dimensions';
import { getTagAnalytics } from './dailyLogService';
import { getUserTagMappings } from './tagMappingService';

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
    
    // Load user's custom tag mappings
    const userMappings = await getUserTagMappings(userId);
    
    // Get all tags from frequency map
    const allTags = Object.keys(analytics.tagFrequency);
    
    // Calculate weighted scores using user mappings
    const weightedScores = {
      Career: 0,
      Spiritual: 0,
      Physical: 0,
      Social: 0,
    };
    
    allTags.forEach(tag => {
      const frequency = analytics.tagFrequency[tag];
      
      // Check user's custom mapping first, then fall back to predefined
      const dimension = userMappings[tag] || getDimensionFromTag(tag);
      
      if (dimension && weightedScores.hasOwnProperty(dimension)) {
        weightedScores[dimension] += frequency;
      }
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

// DEBUG: Calculate and log trajectory scores to console
export const debugTrajectoryScores = async (userId, days = 30) => {
  console.group(`🎯 TRAJECTORY CALCULATION (Last ${days} days)`);
  
  try {
    // Fetch analytics
    const analytics = await getTagAnalytics(userId, days);
    
    console.log('📊 Raw Data:', {
      totalLogs: analytics.totalLogs,
      dateRange: {
        start: analytics.dateRange.start.toLocaleDateString(),
        end: analytics.dateRange.end.toLocaleDateString(),
      },
      tagFrequency: analytics.tagFrequency,
    });
    
    if (analytics.totalLogs === 0) {
      console.warn('⚠️ No logs found in this period');
      console.groupEnd();
      return null;
    }
    
    // Get all tags
    const allTags = Object.keys(analytics.tagFrequency);
    console.log('🏷️ All Tags Found:', allTags);
    
    // Load user's custom tag mappings
    const userMappings = await getUserTagMappings(userId);
    console.log('🗺️ User Tag Mappings:', userMappings);
    
    // Calculate dimension scores with detailed breakdown
    const dimensionBreakdown = {};
    const weightedScores = {
      Career: 0,
      Spiritual: 0,
      Physical: 0,
      Social: 0,
    };
    
    allTags.forEach(tag => {
      const frequency = analytics.tagFrequency[tag];
      
      // Check user's custom mapping first, then fall back to predefined
      const dimension = userMappings[tag] || getDimensionFromTag(tag);
      
      console.log(`🏷️ Tag "${tag}" (${frequency}x) → ${dimension || 'NOT MAPPED'}`);
      
      if (dimension && weightedScores.hasOwnProperty(dimension)) {
        weightedScores[dimension] += frequency;
        
        if (!dimensionBreakdown[dimension]) {
          dimensionBreakdown[dimension] = [];
        }
        dimensionBreakdown[dimension].push({
          tag,
          frequency,
          contribution: frequency,
          source: userMappings[tag] ? 'User Custom' : 'Predefined',
        });
      } else if (!dimension) {
        console.warn(`⚠️ Tag "${tag}" has no dimension mapping!`);
      }
    });
    
    console.log('📈 Dimension Scores (Raw Points):', weightedScores);
    console.log('🔍 Detailed Breakdown by Dimension:', dimensionBreakdown);
    
    // Calculate percentages
    const total = Object.values(weightedScores).reduce((sum, val) => sum + val, 0);
    const percentages = {};
    
    Object.keys(weightedScores).forEach(dimension => {
      percentages[dimension] = total > 0 
        ? Math.round((weightedScores[dimension] / total) * 100) 
        : 0;
    });
    
    console.log('📊 Dimension Percentages:', percentages);
    
    // Identify dominant dimension
    const dominant = Object.keys(percentages).reduce((a, b) => 
      percentages[a] > percentages[b] ? a : b
    );
    
    console.log('🎯 Dominant Dimension:', dominant, `(${percentages[dominant]}%)`);
    
    // Create visual bar chart in console
    console.log('\n📊 Visual Distribution:');
    Object.keys(weightedScores).forEach(dimension => {
      const percentage = percentages[dimension];
      const bar = '█'.repeat(Math.round(percentage / 2));
      console.log(`${dimension.padEnd(12)} ${bar} ${percentage}%`);
    });
    
    console.groupEnd();
    
    return {
      totalLogs: analytics.totalLogs,
      weightedScores,
      percentages,
      dominant,
      breakdown: dimensionBreakdown,
    };
    
  } catch (error) {
    console.error('❌ Error calculating trajectory:', error);
    console.groupEnd();
    throw error;
  }
};
