import { getDimensionNames } from '../constants/dimensions';

/**
 * AI Categorization Service
 * Uses Gemini API to automatically categorize tags into life dimensions
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Categorize tags using Gemini AI
 * @param {string[]} tags - Array of tag names to categorize
 * @returns {Promise<Object>} - Object mapping tag names to categories
 */
export const categorizeTags = async (tags) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file');
  }

  if (!tags || tags.length === 0) {
    return {};
  }

  const dimensionNames = getDimensionNames();
  const prompt = `You are an AI assistant helping to categorize personal knowledge tags into life dimensions.

Here is a list of tags extracted from a user's activity:
${tags.map((tag, i) => `${i + 1}. ${tag}`).join('\n')}

Please categorize each tag into exactly ONE of these categories:
- Career: Coding, Finance, Business, Work, Professional Development
- Spiritual: Meditation, Philosophy, Religion, Mindfulness, Personal Growth
- Health: Gym, Diet, Sleep, Fitness, Exercise, Wellness
- Social: Friends, Family, Dates, Community, Relationships
- Intellectual: Books, History, Science, Education, Learning, Research
- Entertainment: Movies, Games, Memes, Fun, Leisure, Hobbies

Rules:
1. Return ONLY a valid JSON object mapping each tag to its category
2. Use the exact category names listed above (case-sensitive)
3. If unsure, use "Entertainment" as the default
4. Do not include any explanation or additional text
5. The JSON keys should be the exact tag names from the input list

Example format:
{
  "react": "Career",
  "meditation": "Spiritual",
  "gym": "Health"
}

Return the JSON now:`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2, // Low temperature for more consistent categorization
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const categorization = JSON.parse(jsonText);
    
    console.log('🤖 Raw AI response:', categorization);
    
    // Validate and normalize the response
    const validatedCategories = {};
    const validDimensions = new Set(dimensionNames);
    
    Object.keys(categorization).forEach(tag => {
      const category = categorization[tag];
      const normalizedTag = tag.toLowerCase().trim(); // Normalize tag to lowercase
      
      if (validDimensions.has(category)) {
        validatedCategories[normalizedTag] = category;
        console.log(`✅ Mapped: "${normalizedTag}" → ${category}`);
      } else {
        // Default to Entertainment if invalid category
        console.warn(`Invalid category "${category}" for tag "${tag}", defaulting to Entertainment`);
        validatedCategories[normalizedTag] = 'Entertainment';
      }
    });
    
    console.log('📦 Final validated categories:', validatedCategories);

    return validatedCategories;
  } catch (error) {
    console.error('Error categorizing tags with AI:', error);
    throw error;
  }
};

/**
 * Categorize tags in batches to avoid API limits
 * @param {string[]} tags - Array of all tags to categorize
 * @param {number} batchSize - Number of tags per batch (default 50)
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Complete categorization mapping
 */
export const categorizeTagsInBatches = async (tags, batchSize = 3, onProgress = null) => {
  const batches = [];
  for (let i = 0; i < tags.length; i += batchSize) {
    batches.push(tags.slice(i, i + batchSize));
  }

  let allCategories = {};
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: batches.length,
        tagsProcessed: i * batchSize + batch.length,
        totalTags: tags.length
      });
    }

    const batchCategories = await categorizeTags(batch);
    allCategories = { ...allCategories, ...batchCategories };

    // Add delay between batches to respect API rate limits
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for free tier
    }
  }

  return allCategories;
};

/**
 * Get categorization statistics
 * @param {Object} categorization - Tag to category mapping
 * @returns {Object} - Statistics by category
 */
export const getCategorizationStats = (categorization) => {
  const stats = {
    Career: 0,
    Spiritual: 0,
    Health: 0,
    Social: 0,
    Intellectual: 0,
    Entertainment: 0
  };

  Object.values(categorization).forEach(category => {
    if (stats[category] !== undefined) {
      stats[category]++;
    }
  });

  return stats;
};
