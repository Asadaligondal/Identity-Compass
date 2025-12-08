import { db } from '../firebase/config';
import { collection, doc, getDoc, setDoc, getDocs, increment, writeBatch } from 'firebase/firestore';

const COLLECTION_NAME = 'tag_connections';

/**
 * Generate a unique ID for a tag pair (alphabetically sorted to ensure consistency)
 * @param {string} tag1 - First tag
 * @param {string} tag2 - Second tag
 * @returns {string} - Unique connection ID (e.g., "Code_Coffee")
 */
const generateConnectionId = (tag1, tag2) => {
  const normalized1 = tag1.toLowerCase().trim();
  const normalized2 = tag2.toLowerCase().trim();
  
  // Sort alphabetically to ensure Code_Coffee === Coffee_Code
  const [first, second] = [normalized1, normalized2].sort();
  return `${first}_${second}`;
};

/**
 * Extract all unique tag pairs from an array of tags
 * @param {string[]} tags - Array of tags
 * @returns {Array<{source: string, target: string, id: string}>} - Array of tag pairs
 */
const extractTagPairs = (tags) => {
  const pairs = [];
  const normalizedTags = tags.map(tag => tag.toLowerCase().trim());
  
  // Generate all unique pairs
  for (let i = 0; i < normalizedTags.length; i++) {
    for (let j = i + 1; j < normalizedTags.length; j++) {
      const tag1 = normalizedTags[i];
      const tag2 = normalizedTags[j];
      
      if (tag1 !== tag2) {
        const id = generateConnectionId(tag1, tag2);
        const [source, target] = [tag1, tag2].sort();
        
        pairs.push({ id, source, target });
      }
    }
  }
  
  return pairs;
};

/**
 * Record tag co-occurrences in Firestore
 * @param {string[]} tags - Array of tags from a daily log
 * @returns {Promise<void>}
 */
export const recordTagConnections = async (tags) => {
  if (!tags || tags.length < 2) {
    // Need at least 2 tags to create connections
    return;
  }
  
  try {
    const pairs = extractTagPairs(tags);
    
    if (pairs.length === 0) {
      return;
    }
    
    // Use batch writes for efficiency (up to 500 operations per batch)
    const batch = writeBatch(db);
    
    for (const pair of pairs) {
      const connectionRef = doc(db, COLLECTION_NAME, pair.id);
      
      // Check if connection already exists
      const connectionSnap = await getDoc(connectionRef);
      
      if (connectionSnap.exists()) {
        // Increment weight if connection exists
        batch.update(connectionRef, {
          weight: increment(1),
          lastUpdated: new Date(),
        });
      } else {
        // Create new connection
        batch.set(connectionRef, {
          source: pair.source,
          target: pair.target,
          weight: 1,
          createdAt: new Date(),
          lastUpdated: new Date(),
        });
      }
    }
    
    // Commit all changes in a single batch
    await batch.commit();
    
    console.log(`✅ Recorded ${pairs.length} tag connection(s):`, pairs.map(p => `${p.source} <-> ${p.target}`));
  } catch (error) {
    console.error('❌ Error recording tag connections:', error);
    throw error;
  }
};

/**
 * Get all connections for a specific tag
 * @param {string} tag - The tag to find connections for
 * @returns {Promise<Array>} - Array of connected tags with weights
 */
export const getTagConnections = async (tag) => {
  try {
    const normalizedTag = tag.toLowerCase().trim();
    const connectionsRef = collection(db, COLLECTION_NAME);
    
    // Fetch all connections (we'll filter in memory to avoid index requirements)
    const querySnapshot = await getDocs(connectionsRef);
    const connections = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Check if this tag is either source or target
      if (data.source === normalizedTag || data.target === normalizedTag) {
        const connectedTag = data.source === normalizedTag ? data.target : data.source;
        
        connections.push({
          tag: connectedTag,
          weight: data.weight,
          lastUpdated: data.lastUpdated?.toDate?.() || null,
        });
      }
    });
    
    // Sort by weight (strongest connections first)
    connections.sort((a, b) => b.weight - a.weight);
    
    return connections;
  } catch (error) {
    console.error('Error fetching tag connections:', error);
    throw error;
  }
};

/**
 * Get all tag connections in the system (for network visualization)
 * @param {number} minWeight - Minimum weight threshold (default: 1)
 * @returns {Promise<Array>} - Array of all connections
 */
export const getAllTagConnections = async (minWeight = 1) => {
  try {
    const connectionsRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(connectionsRef);
    const connections = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      if (data.weight >= minWeight) {
        connections.push({
          id: doc.id,
          source: data.source,
          target: data.target,
          weight: data.weight,
          createdAt: data.createdAt?.toDate?.() || null,
          lastUpdated: data.lastUpdated?.toDate?.() || null,
        });
      }
    });
    
    // Sort by weight (strongest connections first)
    connections.sort((a, b) => b.weight - a.weight);
    
    return connections;
  } catch (error) {
    console.error('Error fetching all tag connections:', error);
    throw error;
  }
};

/**
 * Debug function to log all connections
 */
export const debugTagConnections = async () => {
  try {
    const connections = await getAllTagConnections();
    
    console.log('\n🔗 TAG CONNECTION NETWORK DEBUG');
    console.log('================================');
    console.log(`Total Connections: ${connections.length}\n`);
    
    if (connections.length === 0) {
      console.log('No connections found. Create logs with multiple tags to build the network.');
      return;
    }
    
    connections.forEach((conn, index) => {
      const bar = '█'.repeat(Math.min(conn.weight, 20));
      console.log(`${index + 1}. ${conn.source} <-> ${conn.target}`);
      console.log(`   Weight: ${conn.weight} ${bar}`);
      console.log(`   Last Updated: ${conn.lastUpdated?.toLocaleDateString() || 'N/A'}`);
      console.log('');
    });
    
    // Calculate network statistics
    const uniqueTags = new Set();
    connections.forEach(conn => {
      uniqueTags.add(conn.source);
      uniqueTags.add(conn.target);
    });
    
    console.log('📊 NETWORK STATISTICS');
    console.log('===================');
    console.log(`Unique Tags: ${uniqueTags.size}`);
    console.log(`Total Connections: ${connections.length}`);
    console.log(`Average Weight: ${(connections.reduce((sum, c) => sum + c.weight, 0) / connections.length).toFixed(2)}`);
    console.log(`Strongest Connection: ${connections[0].source} <-> ${connections[0].target} (${connections[0].weight})`);
    
  } catch (error) {
    console.error('Error debugging connections:', error);
  }
};
