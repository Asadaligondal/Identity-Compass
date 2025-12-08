/**
 * Tag Type Constants
 * Used to categorize tags as different types of entities
 */

export const TAG_TYPES = {
  CONCEPT: 'Concept',
  BOOK: 'Book',
  PERSON: 'Person',
  PROJECT: 'Project',
};

export const TAG_TYPES_LIST = Object.values(TAG_TYPES);

/**
 * Visual configuration for each tag type
 */
export const TAG_TYPE_CONFIG = {
  [TAG_TYPES.CONCEPT]: {
    shape: 'circle',
    color: '#00D4FF', // Neon blue (default)
    description: 'General concepts, activities, or feelings',
  },
  [TAG_TYPES.BOOK]: {
    shape: 'square',
    color: '#FFD700', // Gold
    description: 'Books, articles, or written resources',
  },
  [TAG_TYPES.PERSON]: {
    shape: 'triangle',
    color: '#FF00FF', // Magenta
    description: 'People, authors, or mentors',
  },
  [TAG_TYPES.PROJECT]: {
    shape: 'diamond',
    color: '#39FF14', // Neon green
    description: 'Projects, goals, or ongoing work',
  },
};

/**
 * Get tag type configuration
 * @param {string} type - Tag type
 * @returns {Object} Configuration object
 */
export const getTagTypeConfig = (type) => {
  return TAG_TYPE_CONFIG[type] || TAG_TYPE_CONFIG[TAG_TYPES.CONCEPT];
};
