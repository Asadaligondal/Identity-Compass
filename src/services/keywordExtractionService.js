import keyword_extractor from 'keyword-extractor';

/**
 * Custom stop words specific to YouTube video titles
 * These are common words that don't add meaningful context
 */
const YOUTUBE_STOP_WORDS = [
  'video', 'tutorial', 'guide', 'introduction', 'intro', 'part',
  'episode', 'ep', 'full', 'complete', 'course', 'lesson',
  'how', 'what', 'why', 'when', 'where', 'learn', 'learning',
  'explained', 'explanation', 'ultimate', 'best', 'top',
  'official', 'new', 'latest', 'review', 'reaction',
  'vs', 'versus', 'compilation', 'highlights', 'clip',
  'live', 'stream', 'vlog', 'daily', 'weekly', 'monthly',
  'year', 'years', 'day', 'days', 'hour', 'hours', 'minute', 'minutes',
  '2019', '2020', '2021', '2022', '2023', '2024', '2025', // Common year mentions
];

/**
 * Extract keywords from a single video title
 * @param {string} title - Video title
 * @returns {string[]} - Array of extracted keywords (tags)
 */
export const extractKeywordsFromTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return [];
  }

  try {
    // Extract keywords using keyword-extractor library
    const extraction_result = keyword_extractor.extract(title, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true, // Return lowercase
      remove_duplicates: true,
    });

    // Filter out YouTube-specific stop words
    const filtered = extraction_result.filter(keyword => 
      !YOUTUBE_STOP_WORDS.includes(keyword.toLowerCase()) &&
      keyword.length > 2 // Remove very short words
    );

    // Limit to top 3-5 most meaningful keywords
    // Prefer words that are capitalized in original title (likely proper nouns)
    const titleWords = title.split(/\s+/);
    const scoredKeywords = filtered.map(keyword => {
      const originalWord = titleWords.find(w => 
        w.toLowerCase().replace(/[^a-z0-9]/g, '') === keyword.toLowerCase()
      );
      
      // Score: +2 if capitalized (likely a proper noun/topic), +1 for length
      const isCapitalized = originalWord && originalWord[0] === originalWord[0].toUpperCase();
      const score = (isCapitalized ? 2 : 0) + keyword.length;
      
      return { keyword, score };
    });

    // Sort by score and take top 5
    const topKeywords = scoredKeywords
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.keyword);

    return topKeywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return [];
  }
};

/**
 * Extract keywords from multiple video titles
 * @param {Array<{title: string, time?: string}>} videos - Array of video objects
 * @returns {Array<{title: string, tags: string[], time?: string}>} - Videos with extracted tags
 */
export const extractKeywordsFromVideos = (videos) => {
  if (!Array.isArray(videos)) {
    return [];
  }

  return videos.map(video => {
    const title = video.title || video.name || '';
    const tags = extractKeywordsFromTitle(title);
    
    return {
      title,
      tags,
      time: video.time || video.time_accessed || video.timestamp || video.date,
      originalVideo: video, // Keep original data
    };
  });
};

/**
 * Get tag frequency from extracted keywords
 * @param {Array<{tags: string[]}>} videosWithTags - Videos with extracted tags
 * @returns {Object} - Tag frequency map { tag: count }
 */
export const getTagFrequency = (videosWithTags) => {
  const frequency = {};
  
  videosWithTags.forEach(video => {
    if (Array.isArray(video.tags)) {
      video.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        frequency[normalizedTag] = (frequency[normalizedTag] || 0) + 1;
      });
    }
  });

  return frequency;
};

/**
 * Get top N most common tags
 * @param {Object} tagFrequency - Tag frequency map
 * @param {number} limit - Number of top tags to return
 * @returns {Array<{tag: string, count: number}>} - Sorted array of top tags
 */
export const getTopTags = (tagFrequency, limit = 20) => {
  return Object.entries(tagFrequency)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Debug: Log sample extractions
 * @param {Array<{title: string, tags: string[]}>} videosWithTags - Videos with tags
 * @param {number} sampleSize - Number of samples to show
 */
export const debugKeywordExtraction = (videosWithTags, sampleSize = 10) => {
  console.log('\n🔍 KEYWORD EXTRACTION DEBUG');
  console.log('═'.repeat(80));
  
  const samples = videosWithTags.slice(0, sampleSize);
  
  samples.forEach((video, index) => {
    console.log(`\n${index + 1}. Title: "${video.title}"`);
    console.log(`   Tags: ${video.tags.map(tag => `#${tag}`).join(', ')}`);
    console.log('─'.repeat(80));
  });

  const frequency = getTagFrequency(videosWithTags);
  const topTags = getTopTags(frequency, 10);
  
  console.log('\n📊 TOP 10 MOST COMMON TAGS:');
  console.log('═'.repeat(80));
  topTags.forEach(({ tag, count }, index) => {
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`${index + 1}. #${tag.padEnd(20)} ${count.toString().padStart(4)} ${bar}`);
  });
  console.log('═'.repeat(80));
};
