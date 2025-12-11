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
 *     [tagName]: {
 *       dimension: string,
 *       type: string (Concept, Book, Person, Project),
 *       category: string (Career, Spiritual, Health, Social, Intellectual, Entertainment, Unassigned)
 *     }
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

// Save or update tag mapping (legacy - supports both old and new format)
export const saveTagMapping = async (userId, tag, dimensionOrConfig) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    const normalizedTag = tag.toLowerCase().trim();
    
    // Support both old (string) and new (object) format
    const mappingValue = typeof dimensionOrConfig === 'string' 
      ? { dimension: dimensionOrConfig, type: 'Concept' }
      : dimensionOrConfig;
    
    if (docSnap.exists()) {
      // Update existing mappings
      const currentMappings = docSnap.data().mappings || {};
      currentMappings[normalizedTag] = mappingValue;
      
      await updateDoc(docRef, {
        mappings: currentMappings,
        updatedAt: new Date(),
      });
    } else {
      // Create new document
      await setDoc(docRef, {
        userId,
        mappings: { [normalizedTag]: mappingValue },
        updatedAt: new Date(),
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving tag mapping:', error);
    throw error;
  }
};

// Save tag with dimension and type
export const saveTagWithType = async (userId, tag, dimension, type = 'Concept') => {
  return saveTagMapping(userId, tag, { dimension, type });
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

// Get all unassigned tags (for AI categorization)
export const getUnassignedTags = async (userId) => {
  try {
    const mappings = await getUserTagMappings(userId);
    const unassigned = [];
    
    Object.keys(mappings).forEach(tag => {
      const mapping = mappings[tag];
      const category = mapping.category || 'Unassigned';
      if (category === 'Unassigned') {
        unassigned.push(tag);
      }
    });
    
    return unassigned;
  } catch (error) {
    console.error('Error fetching unassigned tags:', error);
    throw error;
  }
};

// Update tag categories (for AI categorization)
export const updateTagCategories = async (userId, categoryMap) => {
  try {
    console.log('💾 Updating tag categories:', categoryMap);
    
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn('No tag mappings found for user');
      return { success: false, message: 'No tag mappings found' };
    }
    
    const currentMappings = docSnap.data().mappings || {};
    console.log('📋 Current mappings before update:', Object.keys(currentMappings).length, 'tags');
    
    const updatedMappings = { ...currentMappings };
    
    // Update categories for each tag
    Object.keys(categoryMap).forEach(tag => {
      const normalizedTag = tag.toLowerCase().trim();
      const category = categoryMap[tag];
      
      if (updatedMappings[normalizedTag]) {
        console.log(`✏️ Updating existing tag "${normalizedTag}" with category: ${category}`);
        updatedMappings[normalizedTag] = {
          ...updatedMappings[normalizedTag],
          category: category
        };
      } else {
        console.log(`➕ Creating new tag "${normalizedTag}" with category: ${category}`);
        // Create new mapping if tag doesn't exist
        updatedMappings[normalizedTag] = {
          dimension: 'Unknown',
          type: 'Concept',
          category: category
        };
      }
    });
    
    await updateDoc(docRef, {
      mappings: updatedMappings,
      updatedAt: new Date(),
    });
    
    console.log('✅ Successfully updated Firestore with new categories');
    
    return { success: true, updatedCount: Object.keys(categoryMap).length };
  } catch (error) {
    console.error('Error updating tag categories:', error);
    throw error;
  }
};

