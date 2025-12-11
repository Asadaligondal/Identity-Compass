// Life Dimensions - Core categories for AI tag organization
export const DIMENSIONS = {
  CAREER: 'Career',
  SPIRITUAL: 'Spiritual',
  HEALTH: 'Health',
  SOCIAL: 'Social',
  INTELLECTUAL: 'Intellectual',
  ENTERTAINMENT: 'Entertainment',
  UNASSIGNED: 'Unassigned'
};

// Legacy support
export const LIFE_DIMENSIONS = {
  CAREER: 'Career',
  SPIRITUAL: 'Spiritual',
  PHYSICAL: 'Health', // Map old Physical to new Health
  SOCIAL: 'Social',
};

// Array format for easy iteration
export const LIFE_DIMENSIONS_LIST = [
  DIMENSIONS.CAREER,
  DIMENSIONS.SPIRITUAL,
  DIMENSIONS.HEALTH,
  DIMENSIONS.SOCIAL,
  DIMENSIONS.INTELLECTUAL,
  DIMENSIONS.ENTERTAINMENT,
];

// Dimension configuration with colors and descriptions for AI categorization
export const DIMENSION_CONFIG = {
  [DIMENSIONS.CAREER]: {
    name: 'Career/Wealth',
    color: '#00D4FF', // Neon Blue
    emoji: '💼',
    description: 'Coding, Finance, Business, Work',
    keywords: ['coding', 'finance', 'business', 'work', 'career', 'money', 'startup', 'tech', 'programming', 'job', 'entrepreneur'],
    gravityX: -400, // Top Left
    gravityY: -400
  },
  [DIMENSIONS.SPIRITUAL]: {
    name: 'Spiritual/Mind',
    color: '#B026FF', // Neon Purple
    emoji: '🧘',
    description: 'Meditation, Philosophy, Religion, Mindfulness',
    keywords: ['meditation', 'philosophy', 'religion', 'spiritual', 'mindfulness', 'consciousness', 'faith', 'prayer', 'reflection'],
    gravityX: 400, // Top Right
    gravityY: -400
  },
  [DIMENSIONS.HEALTH]: {
    name: 'Health/Body',
    color: '#39FF14', // Neon Green
    emoji: '💪',
    description: 'Gym, Diet, Sleep, Fitness',
    keywords: ['gym', 'diet', 'sleep', 'fitness', 'health', 'exercise', 'nutrition', 'workout', 'yoga', 'running', 'sports'],
    gravityX: -400, // Bottom Left
    gravityY: 400
  },
  [DIMENSIONS.SOCIAL]: {
    name: 'Social/Relationships',
    color: '#FF10F0', // Neon Pink
    emoji: '👥',
    description: 'Friends, Family, Dates, Community',
    keywords: ['friends', 'family', 'dating', 'social', 'relationships', 'community', 'people', 'networking', 'event'],
    gravityX: 400, // Bottom Right
    gravityY: 400
  },
  [DIMENSIONS.INTELLECTUAL]: {
    name: 'Intellectual/Learning',
    color: '#FFD700', // Gold/Yellow
    emoji: '📚',
    description: 'Books, History, Science, Education',
    keywords: ['books', 'history', 'science', 'learning', 'education', 'study', 'knowledge', 'research', 'reading', 'documentary'],
    gravityX: 0, // Top Center
    gravityY: -500
  },
  [DIMENSIONS.ENTERTAINMENT]: {
    name: 'Entertainment/Noise',
    color: '#808080', // Gray
    emoji: '🎮',
    description: 'Movies, Games, Memes, Fun',
    keywords: ['movies', 'games', 'memes', 'entertainment', 'fun', 'youtube', 'video', 'comedy', 'music', 'anime', 'series'],
    gravityX: 0, // Center (Neutral)
    gravityY: 0
  },
  [DIMENSIONS.UNASSIGNED]: {
    name: 'Unassigned',
    color: '#666666', // Dark Gray
    emoji: '❓',
    description: 'Uncategorized tags',
    keywords: [],
    gravityX: 0,
    gravityY: 0
  }
};

// Predefined tags mapped to dimensions (legacy support)
export const TAG_DIMENSION_MAP = {
  // Career
  'work': DIMENSIONS.CAREER,
  'project': DIMENSIONS.CAREER,
  'meeting': DIMENSIONS.CAREER,
  'skill': DIMENSIONS.CAREER,
  'coding': DIMENSIONS.CAREER,
  'business': DIMENSIONS.CAREER,
  'programming': DIMENSIONS.CAREER,
  
  // Spiritual
  'meditation': DIMENSIONS.SPIRITUAL,
  'prayer': DIMENSIONS.SPIRITUAL,
  'reflection': DIMENSIONS.SPIRITUAL,
  'journaling': DIMENSIONS.SPIRITUAL,
  'gratitude': DIMENSIONS.SPIRITUAL,
  'mindfulness': DIMENSIONS.SPIRITUAL,
  'philosophy': DIMENSIONS.SPIRITUAL,
  
  // Health (was Physical)
  'exercise': DIMENSIONS.HEALTH,
  'gym': DIMENSIONS.HEALTH,
  'running': DIMENSIONS.HEALTH,
  'yoga': DIMENSIONS.HEALTH,
  'health': DIMENSIONS.HEALTH,
  'sleep': DIMENSIONS.HEALTH,
  'nutrition': DIMENSIONS.HEALTH,
  'sports': DIMENSIONS.HEALTH,
  
  // Social
  'family': DIMENSIONS.SOCIAL,
  'friends': DIMENSIONS.SOCIAL,
  'community': DIMENSIONS.SOCIAL,
  'relationship': DIMENSIONS.SOCIAL,
  'networking': DIMENSIONS.SOCIAL,
  'social': DIMENSIONS.SOCIAL,
  'event': DIMENSIONS.SOCIAL,
  
  // Intellectual
  'learning': DIMENSIONS.INTELLECTUAL,
  'reading': DIMENSIONS.INTELLECTUAL,
  'books': DIMENSIONS.INTELLECTUAL,
  'education': DIMENSIONS.INTELLECTUAL,
  'science': DIMENSIONS.INTELLECTUAL,
  'history': DIMENSIONS.INTELLECTUAL,
};

// Get dimension config by name
export const getDimensionConfig = (dimension) => {
  return DIMENSION_CONFIG[dimension] || DIMENSION_CONFIG[DIMENSIONS.UNASSIGNED];
};

// Get all dimension names for API prompt (exclude UNASSIGNED)
export const getDimensionNames = () => {
  return Object.keys(DIMENSION_CONFIG).filter(d => d !== DIMENSIONS.UNASSIGNED);
};

// Get dimension color
export const getDimensionColor = (dimension) => {
  const config = getDimensionConfig(dimension);
  return config.color;
};

// Helper function to get dimension from tag (legacy support)
export const getDimensionFromTag = (tag) => {
  const normalizedTag = tag.toLowerCase().trim();
  return TAG_DIMENSION_MAP[normalizedTag] || DIMENSIONS.UNASSIGNED;
};

// Helper function to calculate dimension scores from tags
export const calculateDimensionScores = (tags) => {
  const scores = {
    [DIMENSIONS.CAREER]: 0,
    [DIMENSIONS.SPIRITUAL]: 0,
    [DIMENSIONS.HEALTH]: 0,
    [DIMENSIONS.SOCIAL]: 0,
    [DIMENSIONS.INTELLECTUAL]: 0,
    [DIMENSIONS.ENTERTAINMENT]: 0,
  };

  tags.forEach(tag => {
    const dimension = getDimensionFromTag(tag);
    if (dimension && dimension !== DIMENSIONS.UNASSIGNED) {
      scores[dimension]++;
    }
  });

  return scores;
};
