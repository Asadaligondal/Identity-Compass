import { DIMENSION_CONFIG } from '../constants/dimensions';

/**
 * Analytics Engine
 * Calculate category trends over time from categorized videos
 */

/**
 * Calculate category trends from categorized videos
 * @param {Array} categorizedVideos - Videos with categories and timestamps
 * @returns {Array} - Monthly trend data for charts
 */
export const calculateCategoryTrends = (categorizedVideos) => {
  if (!categorizedVideos || categorizedVideos.length === 0) {
    return [];
  }

  // Group videos by month
  const monthlyData = {};

  categorizedVideos.forEach(video => {
    if (!video.time) return;

    const date = new Date(video.time);
    const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        name: monthKey,
        date: date,
        Career: 0,
        Spiritual: 0,
        Health: 0,
        Social: 0,
        Intellectual: 0,
        Entertainment: 0
      };
    }

    // Add +1 to category score for this month
    const category = video.category || 'Entertainment';
    monthlyData[monthKey][category] += 1;
  });

  // Convert to array and sort by date
  const trendsArray = Object.values(monthlyData).sort((a, b) => a.date - b.date);

  console.log('📊 Calculated trends:', trendsArray);
  return trendsArray;
};

/**
 * Calculate total scores for all categories (for pie chart)
 * @param {Array} categorizedVideos - Videos with categories
 * @returns {Array} - Category totals for pie chart
 */
export const calculateCategoryTotals = (categorizedVideos) => {
  const totals = {
    Career: 0,
    Spiritual: 0,
    Health: 0,
    Social: 0,
    Intellectual: 0,
    Entertainment: 0
  };

  categorizedVideos.forEach(video => {
    const category = video.category || 'Entertainment';
    totals[category] += 1;
  });

  // Convert to array format for pie chart
  const pieData = Object.entries(totals)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => ({
      name: category,
      value: value,
      color: DIMENSION_CONFIG[category]?.color || '#808080'
    }));

  return pieData;
};

/**
 * Determine dominant archetype based on highest category
 * @param {Array} pieData - Category totals
 * @returns {string} - Archetype name
 */
export const getDominantArchetype = (pieData) => {
  if (!pieData || pieData.length === 0) return 'Explorer';

  const archetypes = {
    Career: 'Builder',
    Spiritual: 'Seeker',
    Health: 'Warrior',
    Social: 'Connector',
    Intellectual: 'Scholar',
    Entertainment: 'Dreamer'
  };

  const dominant = pieData.reduce((max, item) => 
    item.value > max.value ? item : max
  , pieData[0]);

  return archetypes[dominant.name] || 'Explorer';
};

/**
 * Calculate summary statistics
 * @param {Array} categorizedVideos - Videos with categories
 * @returns {Object} - Summary stats
 */
export const calculateSummaryStats = (categorizedVideos) => {
  const totals = calculateCategoryTotals(categorizedVideos);
  const totalVideos = categorizedVideos.length;
  
  const topCategory = totals.reduce((max, item) => 
    item.value > max.value ? item : max
  , totals[0] || { name: 'None', value: 0 });

  return {
    totalVideos,
    topCategory: topCategory.name,
    topCategoryCount: topCategory.value,
    topCategoryPercentage: Math.round((topCategory.value / totalVideos) * 100)
  };
};
