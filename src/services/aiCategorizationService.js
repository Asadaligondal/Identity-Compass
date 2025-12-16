import { getDimensionNames } from '../constants/dimensions';

/**
 * AI Categorization Service - STEP 22 OPTIMIZED
 * Uses Gemini API to automatically categorize tags into life dimensions
 * Optimized for maximum throughput on Free Tier (15 requests/minute)
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Sleep utility for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Categorize tags using Gemini AI with robust error handling
 * @param {string[]} tags - Array of tag names to categorize (up to 50)
 * @param {number} retryCount - Internal retry counter
 * @returns {Promise<Object>} - Object mapping tag names to categories
 */
export const categorizeTags = async (tags, retryCount = 0) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file');
  }

  if (!tags || tags.length === 0) {
    return {};
  }

  const dimensionNames = getDimensionNames();
  const prompt = `Classify these ${tags.length} tags into [Career, Spiritual, Health, Social, Intellectual, Entertainment]. Return a JSON list.

Tags to classify:
${tags.map((tag, i) => `${i + 1}. ${tag}`).join('\n')}

Category Definitions:
- Career: Coding, Finance, Business, Work, Professional Development
- Spiritual: Meditation, Philosophy, Religion, Mindfulness, Personal Growth
- Health: Gym, Diet, Sleep, Fitness, Exercise, Wellness
- Social: Friends, Family, Dates, Community, Relationships
- Intellectual: Books, History, Science, Education, Learning, Research
- Entertainment: Movies, Games, Memes, Fun, Leisure, Hobbies

Rules:
1. Return ONLY valid JSON: {"tag": "Category", ...}
2. Use exact category names (case-sensitive)
3. Default to "Entertainment" if unsure
4. Map all ${tags.length} tags

JSON:`;

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
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096, // Increased for larger batches
        }
      })
    });

    // STEP 22: Robust 429 error handling
    if (response.status === 429) {
      if (retryCount < 3) {
        console.warn(`⏳ Rate limit hit (429). Waiting 20 seconds before retry ${retryCount + 1}/3...`);
        await sleep(20000); // Wait 20 seconds
        return categorizeTags(tags, retryCount + 1); // Retry
      } else {
        throw new Error('Rate limit exceeded after 3 retries. Please wait a few minutes.');
      }
    }

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
 * STEP 22: Categorize tags in batches - GEMINI 2.5 FLASH FREE TIER
 * Official Free Tier Limits:
 *   - RPM: ~10 requests/minute
 *   - TPM: 250,000 tokens/minute
 *   - RPD: ~250 requests/day
 * 
 * Conservative Settings (Anti-Overload):
 *   - Batch Size: 20 tags per call (minimize total requests)
 *   - Rate Limit: 7-second delay → ~8.5 RPM (safe margin)
 *   - 100 tags = 5 requests only (35 seconds total)
 * 
 * @param {string[]} tags - Array of all tags to categorize
 * @param {number} batchSize - Number of tags per batch (default 20)
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Complete categorization mapping
 */
export const categorizeTagsInBatches = async (tags, batchSize = 20, onProgress = null) => {
  const batches = [];
  for (let i = 0; i < tags.length; i += batchSize) {
    batches.push(tags.slice(i, i + batchSize));
  }

  console.log(`🚀 Processing ${tags.length} tags in ${batches.length} batches of ${batchSize}`);
  let allCategories = {};
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;
    
    console.log(`📦 Batch ${batchNum}/${batches.length}: Processing ${batch.length} tags...`);
    
    if (onProgress) {
      onProgress({
        current: batchNum,
        total: batches.length,
        tagsProcessed: i * batchSize + batch.length,
        totalTags: tags.length
      });
    }

    // Categorize batch (with automatic retry on 429)
    const batchCategories = await categorizeTags(batch);
    allCategories = { ...allCategories, ...batchCategories };
    
    console.log(`✅ Batch ${batchNum} complete: ${Object.keys(batchCategories).length} tags categorized`);

    // STEP 22: Mandatory 7-second delay (Gemini 2.5 Flash Free: 10 RPM limit)
    // 7s delay = ~8.5 requests/min (safe margin under 10 RPM)
    // Daily limit: 250 requests/day
    if (i < batches.length - 1) {
      console.log(`⏳ Waiting 7 seconds before next batch (Free Tier: 10 RPM, safe at ~8.5 RPM)...`);
      await sleep(7000);
    }
  }

  console.log(`🎉 All batches complete! Total categorized: ${Object.keys(allCategories).length} tags`);
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
