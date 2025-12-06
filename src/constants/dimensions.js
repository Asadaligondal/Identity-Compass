// Life Dimensions - Core identity categories
export const LIFE_DIMENSIONS = {
  CAREER: 'Career',
  SPIRITUAL: 'Spiritual',
  PHYSICAL: 'Physical',
  SOCIAL: 'Social',
};

// Array format for easy iteration
export const LIFE_DIMENSIONS_LIST = [
  LIFE_DIMENSIONS.CAREER,
  LIFE_DIMENSIONS.SPIRITUAL,
  LIFE_DIMENSIONS.PHYSICAL,
  LIFE_DIMENSIONS.SOCIAL,
];

// Predefined tags mapped to dimensions
export const TAG_DIMENSION_MAP = {
  // Career
  'work': LIFE_DIMENSIONS.CAREER,
  'project': LIFE_DIMENSIONS.CAREER,
  'meeting': LIFE_DIMENSIONS.CAREER,
  'learning': LIFE_DIMENSIONS.CAREER,
  'skill': LIFE_DIMENSIONS.CAREER,
  'coding': LIFE_DIMENSIONS.CAREER,
  'business': LIFE_DIMENSIONS.CAREER,
  
  // Spiritual
  'meditation': LIFE_DIMENSIONS.SPIRITUAL,
  'prayer': LIFE_DIMENSIONS.SPIRITUAL,
  'reflection': LIFE_DIMENSIONS.SPIRITUAL,
  'journaling': LIFE_DIMENSIONS.SPIRITUAL,
  'gratitude': LIFE_DIMENSIONS.SPIRITUAL,
  'reading': LIFE_DIMENSIONS.SPIRITUAL,
  'mindfulness': LIFE_DIMENSIONS.SPIRITUAL,
  
  // Physical
  'exercise': LIFE_DIMENSIONS.PHYSICAL,
  'gym': LIFE_DIMENSIONS.PHYSICAL,
  'running': LIFE_DIMENSIONS.PHYSICAL,
  'yoga': LIFE_DIMENSIONS.PHYSICAL,
  'health': LIFE_DIMENSIONS.PHYSICAL,
  'sleep': LIFE_DIMENSIONS.PHYSICAL,
  'nutrition': LIFE_DIMENSIONS.PHYSICAL,
  'sports': LIFE_DIMENSIONS.PHYSICAL,
  
  // Social
  'family': LIFE_DIMENSIONS.SOCIAL,
  'friends': LIFE_DIMENSIONS.SOCIAL,
  'community': LIFE_DIMENSIONS.SOCIAL,
  'relationship': LIFE_DIMENSIONS.SOCIAL,
  'networking': LIFE_DIMENSIONS.SOCIAL,
  'social': LIFE_DIMENSIONS.SOCIAL,
  'event': LIFE_DIMENSIONS.SOCIAL,
};

// Helper function to get dimension from tag
export const getDimensionFromTag = (tag) => {
  const normalizedTag = tag.toLowerCase().trim();
  return TAG_DIMENSION_MAP[normalizedTag] || null;
};

// Helper function to calculate dimension scores from tags
export const calculateDimensionScores = (tags) => {
  const scores = {
    [LIFE_DIMENSIONS.CAREER]: 0,
    [LIFE_DIMENSIONS.SPIRITUAL]: 0,
    [LIFE_DIMENSIONS.PHYSICAL]: 0,
    [LIFE_DIMENSIONS.SOCIAL]: 0,
  };

  tags.forEach(tag => {
    const dimension = getDimensionFromTag(tag);
    if (dimension) {
      scores[dimension]++;
    }
  });

  return scores;
};
