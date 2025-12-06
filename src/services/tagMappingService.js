import { 
  collection, 
  doc,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION_NAME = 'tag_mappings';

/**
 * Tag Mapping Schema:
 * {
 *   userId: string,
 *   mappings: {
 *     [tagName]: dimension
 *   },
 *   updatedAt: Timestamp
 * }
 */

// Get user's tag mappings
export const getUserTagMappings = async (userId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().mappings || {};
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching tag mappings:', error);
    throw error;
  }
};

// Save or update tag mapping
export const saveTagMapping = async (userId, tag, dimension) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    const normalizedTag = tag.toLowerCase().trim();
    
    if (docSnap.exists()) {
      // Update existing mappings
      const currentMappings = docSnap.data().mappings || {};
      currentMappings[normalizedTag] = dimension;
      
      await updateDoc(docRef, {
        mappings: currentMappings,
        updatedAt: new Date(),
      });
    } else {
      // Create new document
      await setDoc(docRef, {
        userId,
        mappings: { [normalizedTag]: dimension },
        updatedAt: new Date(),
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving tag mapping:', error);
    throw error;
  }
};

// Save multiple tag mappings at once
export const saveMultipleTagMappings = async (userId, mappings) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    // Normalize all tag keys
    const normalizedMappings = {};
    Object.keys(mappings).forEach(tag => {
      const normalizedTag = tag.toLowerCase().trim();
      normalizedMappings[normalizedTag] = mappings[tag];
    });
    
    if (docSnap.exists()) {
      const currentMappings = docSnap.data().mappings || {};
      const updatedMappings = { ...currentMappings, ...normalizedMappings };
      
      await updateDoc(docRef, {
        mappings: updatedMappings,
        updatedAt: new Date(),
      });
    } else {
      await setDoc(docRef, {
        userId,
        mappings: normalizedMappings,
        updatedAt: new Date(),
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving multiple tag mappings:', error);
    throw error;
  }
};
