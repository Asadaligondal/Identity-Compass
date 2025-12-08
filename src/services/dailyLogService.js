import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { recordTagConnections } from './tagConnectionService';

const COLLECTION_NAME = 'daily_logs';

/**
 * Daily Log Schema:
 * {
 *   userId: string,
 *   date: Timestamp,
 *   text_entry: string,
 *   tags: string[],
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

// Create a new daily log
export const createDailyLog = async (userId, logData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      date: logData.date || Timestamp.now(),
      text_entry: logData.text_entry || '',
      tags: logData.tags || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    // Record tag co-occurrences if there are multiple tags
    if (logData.tags && logData.tags.length >= 2) {
      try {
        await recordTagConnections(logData.tags);
      } catch (connError) {
        // Don't fail the log creation if connection recording fails
        console.error('Warning: Failed to record tag connections:', connError);
      }
    }
    
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating daily log:', error);
    throw error;
  }
};

// Get all logs for a user
export const getUserLogs = async (userId, limit = 30) => {
  try {
    // Simplified query without orderBy to avoid index requirement
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Sort in memory instead of in query
    logs.sort((a, b) => {
      const dateA = a.date?.toDate?.() || new Date(0);
      const dateB = b.date?.toDate?.() || new Date(0);
      return dateB - dateA; // desc order
    });
    
    return logs.slice(0, limit);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    throw error;
  }
};

// Get logs for a specific date range
export const getLogsByDateRange = async (userId, startDate, endDate) => {
  try {
    // Simplified query - fetch all user logs and filter in memory
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const logDate = data.date?.toDate?.() || new Date(0);
      
      // Filter by date range in memory
      if (logDate >= startDate && logDate <= endDate) {
        logs.push({
          id: doc.id,
          ...data,
        });
      }
    });
    
    // Sort in memory
    logs.sort((a, b) => {
      const dateA = a.date?.toDate?.() || new Date(0);
      const dateB = b.date?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    return logs;
  } catch (error) {
    console.error('Error fetching logs by date range:', error);
    throw error;
  }
};

// Update a daily log
export const updateDailyLog = async (logId, updates) => {
  try {
    const logRef = doc(db, COLLECTION_NAME, logId);
    await updateDoc(logRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    // Record tag co-occurrences if tags were updated and there are multiple tags
    if (updates.tags && updates.tags.length >= 2) {
      try {
        await recordTagConnections(updates.tags);
      } catch (connError) {
        // Don't fail the update if connection recording fails
        console.error('Warning: Failed to record tag connections:', connError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating daily log:', error);
    throw error;
  }
};

// Delete a daily log
export const deleteDailyLog = async (logId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, logId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting daily log:', error);
    throw error;
  }
};

// Get aggregated tag data for trajectory analysis
export const getTagAnalytics = async (userId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log('📅 Fetching logs from:', startDate.toLocaleDateString(), 'to', new Date().toLocaleDateString());
    
    const logs = await getLogsByDateRange(userId, startDate, new Date());
    
    console.log(`📦 Found ${logs.length} logs in database`);
    console.log('📋 Raw logs data:', logs);
    
    // Aggregate all tags
    const tagFrequency = {};
    
    logs.forEach((log, index) => {
      console.log(`Log ${index + 1}:`, {
        date: log.date?.toDate?.()?.toLocaleDateString() || 'No date',
        tags: log.tags,
        text: log.text_entry?.substring(0, 50) + '...'
      });
      
      if (log.tags && Array.isArray(log.tags)) {
        log.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          tagFrequency[normalizedTag] = (tagFrequency[normalizedTag] || 0) + 1;
          console.log(`  ✓ Counted tag: ${normalizedTag} (total: ${tagFrequency[normalizedTag]})`);
        });
      }
    });
    
    console.log('🏷️ Final tag frequencies:', tagFrequency);
    
    return {
      totalLogs: logs.length,
      tagFrequency,
      dateRange: { start: startDate, end: new Date() },
    };
  } catch (error) {
    console.error('Error getting tag analytics:', error);
    throw error;
  }
};
