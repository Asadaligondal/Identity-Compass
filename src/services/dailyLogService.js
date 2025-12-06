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
    
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating daily log:', error);
    throw error;
  }
};

// Get all logs for a user
export const getUserLogs = async (userId, limit = 30) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return logs;
  } catch (error) {
    console.error('Error fetching user logs:', error);
    throw error;
  }
};

// Get logs for a specific date range
export const getLogsByDateRange = async (userId, startDate, endDate) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
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
    
    const logs = await getLogsByDateRange(userId, startDate, new Date());
    
    // Aggregate all tags
    const tagFrequency = {};
    
    logs.forEach(log => {
      if (log.tags && Array.isArray(log.tags)) {
        log.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          tagFrequency[normalizedTag] = (tagFrequency[normalizedTag] || 0) + 1;
        });
      }
    });
    
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
