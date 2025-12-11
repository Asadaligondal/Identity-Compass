import { db } from '../firebase/config';
import { collection, doc, writeBatch, Timestamp, setDoc, getDocs } from 'firebase/firestore';

/**
 * Save categorized videos to Firestore
 * Stores each video with its title and category
 */

const COLLECTION_NAME = 'categorized_videos';

/**
 * Save categorized videos in batches
 * @param {string} userId - User ID
 * @param {Array} categorizedVideos - Videos with categories
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, saved: number}>}
 */
export const saveCategorizedVideos = async (userId, categorizedVideos, onProgress = null) => {
  const BATCH_SIZE = 500; // Firestore limit
  let savedCount = 0;

  try {
    console.log(`💾 Saving ${categorizedVideos.length} categorized videos...`);

    for (let i = 0; i < categorizedVideos.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const videoBatch = categorizedVideos.slice(i, i + BATCH_SIZE);

      videoBatch.forEach((video, idx) => {
        const globalIndex = i + idx;
        const videoId = `${userId}_${globalIndex}`;
        const docRef = doc(db, COLLECTION_NAME, videoId);

        batch.set(docRef, {
          userId,
          title: video.title,
          category: video.category,
          time: video.time || video.time_accessed || null,
          watchedAt: video.time ? Timestamp.fromDate(new Date(video.time)) : Timestamp.now(),
          source: 'youtube_takeout',
          createdAt: Timestamp.now(),
          index: globalIndex
        }, { merge: true });
      });

      await batch.commit();
      savedCount += videoBatch.length;

      if (onProgress) {
        onProgress(savedCount, categorizedVideos.length);
      }

      console.log(`✅ Saved batch ${Math.floor(i / BATCH_SIZE) + 1} (${savedCount}/${categorizedVideos.length})`);
    }

    console.log(`✅ Successfully saved ${savedCount} categorized videos`);
    return { success: true, saved: savedCount };

  } catch (error) {
    console.error('Error saving categorized videos:', error);
    throw error;
  }
};

/**
 * Get all categorized videos for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of categorized videos
 */
export const getCategorizedVideos = async (userId) => {
  try {
    const videosRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(videosRef);
    
    const videos = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        videos.push({
          id: doc.id,
          title: data.title,
          category: data.category,
          time: data.watchedAt?.toDate?.() || null
        });
      }
    });

    return videos.sort((a, b) => (b.time || 0) - (a.time || 0));
  } catch (error) {
    console.error('Error fetching categorized videos:', error);
    throw error;
  }
};

/**
 * Build graph nodes from categorized videos
 * Groups videos by category and creates category nodes
 * @param {Array} categorizedVideos - Videos with categories
 * @returns {Object} - {nodes: [], links: []}
 */
export const buildGraphFromCategories = (categorizedVideos) => {
  const nodes = [];
  const links = [];
  const categoryCount = {};

  // Count videos per category
  categorizedVideos.forEach(video => {
    const cat = video.category || 'Entertainment';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Create category nodes (main nodes)
  Object.entries(categoryCount).forEach(([category, count]) => {
    nodes.push({
      id: category.toLowerCase(),
      name: category,
      category: category,
      val: count * 10, // Size based on video count
      frequency: count,
      type: 'Category',
      isMainNode: true
    });
  });

  // Create individual video nodes for ALL videos
  categorizedVideos.forEach((video, idx) => {
    const cat = video.category || 'Entertainment';
    const nodeId = `video_${idx}`;
    
    // Create video node
    nodes.push({
      id: nodeId,
      name: video.title.substring(0, 50), // Show more of title
      fullTitle: video.title,
      category: cat,
      val: 2, // Smaller than category nodes
      type: 'Video',
      isMainNode: false
    });

    // Link video to its category
    links.push({
      source: nodeId,
      target: cat.toLowerCase(),
      weight: 1,
      value: 1
    });
  });

  return { nodes, links };
};
