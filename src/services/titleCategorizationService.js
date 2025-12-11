import { getDimensionNames } from '../constants/dimensions';

/**
 * Title Categorization Service
 * Categorizes YouTube video titles directly into life dimensions using AI
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Categorize video titles using Gemini AI
 * @param {Array<{title: string, time: string}>} videos - Array of video objects
 * @returns {Promise<Array>} - Videos with categories added
 */
export const categorizeTitles = async (videos) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file');
  }

  if (!videos || videos.length === 0) {
    return [];
  }

  const dimensionNames = getDimensionNames();
  
  // Create a numbered list of titles
  const titlesList = videos.map((v, i) => `${i + 1}. ${v.title || v.name || 'Unknown'}`).join('\n');
  
  const prompt = `You are an AI assistant categorizing YouTube video titles into life dimensions.

Here are ${videos.length} video titles:
${titlesList}

Categorize each title into exactly ONE of these categories:
- Career: Coding, Finance, Business, Work, Professional Development, Tech, Programming
- Spiritual: Meditation, Philosophy, Religion, Mindfulness, Personal Growth, Wisdom
- Health: Gym, Diet, Sleep, Fitness, Exercise, Wellness, Sports
- Social: Friends, Family, Dates, Community, Relationships, Networking
- Intellectual: Books, History, Science, Education, Learning, Research, Documentaries
- Entertainment: Movies, Games, Memes, Fun, Leisure, Hobbies, Music, Comedy

Return ONLY a JSON array where each element has: {index: number, category: string}
Index should match the number in the list above (1-${videos.length}).

Example format:
[
  {"index": 1, "category": "Career"},
  {"index": 2, "category": "Entertainment"},
  {"index": 3, "category": "Intellectual"}
]

Return the JSON array now:`;

  try {
    console.log(`🤖 Categorizing ${videos.length} titles with AI...`);
    
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
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
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

    // Extract JSON from response
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const categorization = JSON.parse(jsonText);
    console.log('🤖 AI categorization response:', categorization);
    
    // Validate and apply categories to videos
    const validDimensions = new Set(dimensionNames);
    const categorizedVideos = videos.map((video, i) => {
      const aiResult = categorization.find(c => c.index === i + 1);
      let category = aiResult?.category || 'Entertainment';
      
      // Validate category
      if (!validDimensions.has(category)) {
        console.warn(`Invalid category "${category}" for video ${i + 1}, defaulting to Entertainment`);
        category = 'Entertainment';
      }
      
      return {
        ...video,
        category: category,
        title: video.title || video.name || 'Unknown'
      };
    });

    console.log('✅ Successfully categorized titles');
    return categorizedVideos;
    
  } catch (error) {
    console.error('Error categorizing titles with AI:', error);
    throw error;
  }
};

/**
 * Categorize titles in batches to avoid token limits
 * @param {Array} videos - All videos to categorize
 * @param {number} batchSize - Number of titles per batch
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Array>} - All categorized videos
 */
export const categorizeTitlesInBatches = async (videos, batchSize = 20, onProgress = null) => {
  const batches = [];
  for (let i = 0; i < videos.length; i += batchSize) {
    batches.push(videos.slice(i, i + batchSize));
  }

  let allCategorized = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: batches.length,
        videosProcessed: i * batchSize + batch.length,
        totalVideos: videos.length
      });
    }

    const categorizedBatch = await categorizeTitles(batch);
    allCategorized = [...allCategorized, ...categorizedBatch];

    // Delay between batches for free tier
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return allCategorized;
};

/**
 * Get category statistics
 * @param {Array} categorizedVideos - Videos with categories
 * @returns {Object} - Statistics by category
 */
export const getCategoryStats = (categorizedVideos) => {
  const stats = {
    Career: 0,
    Spiritual: 0,
    Health: 0,
    Social: 0,
    Intellectual: 0,
    Entertainment: 0
  };

  categorizedVideos.forEach(video => {
    const cat = video.category || 'Entertainment';
    if (stats[cat] !== undefined) {
      stats[cat]++;
    }
  });

  return stats;
};
