import { db } from '../firebase/config';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { recordTagConnections } from './tagConnectionService';

/**
 * Process YouTube history in batches to avoid browser crashes
 * @param {string} userId - User ID
 * @param {Array} videosWithTags - Videos with extracted tags
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<{success: boolean, processed: number, errors: number}>}
 */
export const processYouTubeHistory = async (userId, videosWithTags, onProgress = null) => {
  const BATCH_SIZE = 50; // Process 50 videos at a time
  const totalVideos = videosWithTags.length;
  let processedCount = 0;
  let errorCount = 0;

  console.log(`\n🚀 PROCESSING ${totalVideos} VIDEOS IN BATCHES OF ${BATCH_SIZE}`);
  console.log('═'.repeat(80));

  try {
    // Split videos into batches
    for (let i = 0; i < totalVideos; i += BATCH_SIZE) {
      const batch = videosWithTags.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalVideos / BATCH_SIZE);

      console.log(`\n📦 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} videos)...`);

      try {
        // Process tag connections for this batch
        await processBatchConnections(batch);
        
        // Optional: Save individual video history records
        await saveBatchHistory(userId, batch);

        processedCount += batch.length;

        if (onProgress) {
          onProgress(processedCount, totalVideos);
        }

        console.log(`✅ Batch ${batchNumber} complete (${processedCount}/${totalVideos})`);

        // Small delay between batches to avoid overwhelming Firestore
        if (i + BATCH_SIZE < totalVideos) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${batchNumber}:`, error);
        errorCount += batch.length;
      }
    }

    console.log('\n═'.repeat(80));
    console.log('🎉 PROCESSING COMPLETE!');
    console.log(`✅ Successfully processed: ${processedCount} videos`);
    console.log(`❌ Errors: ${errorCount} videos`);

    return {
      success: errorCount === 0,
      processed: processedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('Fatal error processing YouTube history:', error);
    return {
      success: false,
      processed: processedCount,
      errors: totalVideos - processedCount,
    };
  }
};

/**
 * Process tag connections for a batch of videos
 * @param {Array} batch - Batch of videos with tags
 * @returns {Promise<void>}
 */
const processBatchConnections = async (batch) => {
  // Process each video's tag connections
  const connectionPromises = batch
    .filter(video => video.tags && video.tags.length >= 2)
    .map(video => recordTagConnections(video.tags));

  await Promise.all(connectionPromises);
};

/**
 * Save batch of video history to Firestore (optional - for later analysis)
 * @param {string} userId - User ID
 * @param {Array} batch - Batch of videos
 * @returns {Promise<void>}
 */
const saveBatchHistory = async (userId, batch) => {
  if (batch.length === 0) return;

  const historyBatch = writeBatch(db);
  const historyCollection = collection(db, 'youtube_history');

  batch.forEach((video) => {
    // Create unique ID based on title and time (to avoid duplicates)
    const videoId = `${userId}_${Date.parse(video.time || new Date())}`;
    const docRef = doc(historyCollection, videoId);

    historyBatch.set(docRef, {
      userId,
      title: video.title,
      tags: video.tags,
      watchedAt: video.time ? Timestamp.fromDate(new Date(video.time)) : Timestamp.now(),
      source: 'youtube_takeout',
      createdAt: Timestamp.now(),
    }, { merge: true }); // merge to avoid overwriting if already exists
  });

  await historyBatch.commit();
};

/**
 * Get aggregated statistics after processing
 * @param {Array} videosWithTags - All processed videos
 * @returns {Object} - Statistics object
 */
export const getProcessingStats = (videosWithTags) => {
  const tagFrequency = {};
  const connectionCount = {};
  let totalConnections = 0;

  videosWithTags.forEach(video => {
    if (!video.tags || video.tags.length === 0) return;

    // Count tag frequencies
    video.tags.forEach(tag => {
      const normalizedTag = tag.toLowerCase();
      tagFrequency[normalizedTag] = (tagFrequency[normalizedTag] || 0) + 1;
    });

    // Count connections (pairs)
    const numConnections = (video.tags.length * (video.tags.length - 1)) / 2;
    totalConnections += numConnections;
  });

  const uniqueTags = Object.keys(tagFrequency).length;
  const topTags = Object.entries(tagFrequency)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalVideos: videosWithTags.length,
    uniqueTags,
    totalConnections,
    topTags,
    tagFrequency,
  };
};

/**
 * Debug: Display processing results
 * @param {Object} stats - Processing statistics
 */
export const debugProcessingResults = (stats) => {
  console.log('\n📊 PROCESSING STATISTICS');
  console.log('═'.repeat(80));
  console.log(`Total Videos: ${stats.totalVideos}`);
  console.log(`Unique Tags: ${stats.uniqueTags}`);
  console.log(`Total Connections: ${stats.totalConnections}`);
  console.log('\n🏆 TOP 10 TAGS:');
  console.log('─'.repeat(80));
  
  stats.topTags.forEach(({ tag, count }, index) => {
    const bar = '█'.repeat(Math.min(Math.floor(count / 10), 50));
    console.log(`${(index + 1).toString().padStart(2)}. #${tag.padEnd(20)} ${count.toString().padStart(5)} ${bar}`);
  });
  
  console.log('═'.repeat(80));
};
