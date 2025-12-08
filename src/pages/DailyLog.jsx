import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createDailyLog } from '../services/dailyLogService';
import { getUserTagMappings, saveTagWithType } from '../services/tagMappingService';
import { LIFE_DIMENSIONS_LIST, TAG_DIMENSION_MAP, getDimensionFromTag } from '../constants/dimensions';
import { TAG_TYPES_LIST } from '../constants/tagTypes';
import { Save, Tag as TagIcon, Hash, CheckCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function DailyLog() {
  const { user } = useAuth();
  const [textEntry, setTextEntry] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [tagMappings, setTagMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load user's saved tag mappings
  useEffect(() => {
    const loadTagMappings = async () => {
      if (user) {
        try {
          const mappings = await getUserTagMappings(user.uid);
          setTagMappings(mappings);
        } catch (err) {
          console.error('Error loading tag mappings:', err);
          // Continue without mappings - not critical
          setTagMappings({});
        }
      }
    };
    loadTagMappings();
  }, [user]);

  // Extract hashtags from text
  const extractHashtags = (text) => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    if (matches) {
      const uniqueTags = [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
      setTags(uniqueTags.map(tag => {
        const mapping = tagMappings[tag];
        return {
          name: tag,
          dimension: mapping?.dimension || getDimensionFromTag(tag) || '',
          type: mapping?.type || 'Concept',
        };
      }));
    } else {
      setTags([]);
    }
  };

  // Handle text change and auto-extract tags
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTextEntry(newText);
    extractHashtags(newText);
  };

  // Add tag manually
  const handleAddTag = () => {
    if (currentTag.trim()) {
      const normalizedTag = currentTag.toLowerCase().trim().replace('#', '');
      if (!tags.find(t => t.name === normalizedTag)) {
        const mapping = tagMappings[normalizedTag];
        setTags([...tags, {
          name: normalizedTag,
          dimension: mapping?.dimension || getDimensionFromTag(normalizedTag) || '',
          type: mapping?.type || 'Concept',
        }]);
      }
      setCurrentTag('');
    }
  };

  // Update tag dimension
  const handleDimensionChange = async (tagName, dimension) => {
    const tag = tags.find(t => t.name === tagName);
    const type = tag?.type || 'Concept';
    
    // Update local state immediately for responsiveness
    setTags(tags.map(t => 
      t.name === tagName ? { ...t, dimension } : t
    ));
    
    // Update local mapping
    setTagMappings({ ...tagMappings, [tagName]: { dimension, type } });
    
    // Save to Firebase in background (non-blocking)
    try {
      await saveTagWithType(user.uid, tagName, dimension, type);
    } catch (err) {
      console.error('Error saving tag mapping:', err);
      // Don't show error to user - mapping is saved locally
    }
  };

  // Update tag type
  const handleTypeChange = async (tagName, type) => {
    const tag = tags.find(t => t.name === tagName);
    const dimension = tag?.dimension || '';
    
    // Update local state immediately for responsiveness
    setTags(tags.map(t => 
      t.name === tagName ? { ...t, type } : t
    ));
    
    // Update local mapping
    setTagMappings({ ...tagMappings, [tagName]: { dimension, type } });
    
    // Save to Firebase in background (non-blocking)
    try {
      await saveTagWithType(user.uid, tagName, dimension, type);
    } catch (err) {
      console.error('Error saving tag mapping:', err);
      // Don't show error to user - mapping is saved locally
    }
  };

  // Remove tag
  const handleRemoveTag = (tagName) => {
    setTags(tags.filter(tag => tag.name !== tagName));
  };

  // Save daily log
  const handleSave = async () => {
    if (!textEntry.trim()) {
      setError('Please write something before saving.');
      return;
    }

    // Check if all tags have dimensions assigned
    const unassignedTags = tags.filter(tag => !tag.dimension);
    if (unassignedTags.length > 0) {
      setError('Please assign a dimension to all tags before saving.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Add timeout to prevent infinite hanging
      const savePromise = createDailyLog(user.uid, {
        date: Timestamp.now(),
        text_entry: textEntry,
        tags: tags.map(tag => tag.name),
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);

      setSuccess(true);
      setTextEntry('');
      setTags([]);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving log:', err);
      
      if (err.message === 'Request timeout') {
        setError('Save is taking too long. Check your internet connection and ensure Firestore is enabled in Firebase Console.');
      } else if (err.code === 'permission-denied') {
        setError('Permission denied. Please check Firestore security rules.');
      } else if (err.code === 'unavailable') {
        setError('Firestore unavailable. Please enable Firestore Database in Firebase Console.');
      } else {
        setError(`Failed to save: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent mb-2">
          Daily Log
        </h1>
        <p className="text-neon-blue/60">
          Reflect on your day and track your trajectory
        </p>
      </div>

      {/* Today's Reflection */}
      <div className="bg-cyber-grey border border-neon-blue/30 rounded-lg p-6 mb-6 shadow-xl shadow-neon-blue/10">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="text-neon-blue" size={20} />
          <h2 className="text-xl font-semibold text-cyber-text">Today's Reflection</h2>
        </div>
        
        <textarea
          value={textEntry}
          onChange={handleTextChange}
          placeholder="What did you do today? Use #hashtags to tag activities (e.g., #coding, #meditation, #gym)..."
          className="w-full h-48 px-4 py-3 bg-cyber-dark border border-neon-purple/30 rounded-lg text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/20 transition-all resize-none"
        />

        <div className="mt-3 text-xs text-cyber-muted">
          Tip: Type # followed by a word to create tags, or add them manually below
        </div>
      </div>

      {/* Manual Tag Input */}
      <div className="bg-cyber-grey border border-neon-purple/30 rounded-lg p-6 mb-6 shadow-xl shadow-neon-purple/10">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="text-neon-purple" size={20} />
          <h2 className="text-xl font-semibold text-cyber-text">Add Tags</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Type a tag (e.g., coding)"
            className="flex-1 px-4 py-2 bg-cyber-dark border border-neon-purple/30 rounded-lg text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/20 transition-all"
          />
          <button
            onClick={handleAddTag}
            className="px-6 py-2 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-purple/50 transition-all"
          >
            Add
          </button>
        </div>
      </div>

      {/* Tags with Dimension Assignment */}
      {tags.length > 0 && (
        <div className="bg-cyber-grey border border-neon-green/30 rounded-lg p-6 mb-6 shadow-xl shadow-neon-green/10">
          <div className="flex items-center gap-2 mb-4">
            <TagIcon className="text-neon-green" size={20} />
            <h2 className="text-xl font-semibold text-cyber-text">Categorize Your Tags</h2>
          </div>

          <div className="space-y-3">
            {tags.map((tag) => (
              <div 
                key={tag.name} 
                className="flex items-center gap-3 p-3 bg-cyber-dark border border-neon-green/20 rounded-lg hover:border-neon-green/40 transition-all"
              >
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-neon-green font-mono">#{tag.name}</span>
                </div>
                
                <select
                  value={tag.type || 'Concept'}
                  onChange={(e) => handleTypeChange(tag.name, e.target.value)}
                  className="px-3 py-2 bg-cyber-grey border border-yellow-500/30 rounded-lg text-cyber-text focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all text-sm"
                  title="Tag Type"
                >
                  {TAG_TYPES_LIST.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                
                <select
                  value={tag.dimension}
                  onChange={(e) => handleDimensionChange(tag.name, e.target.value)}
                  className="px-4 py-2 bg-cyber-grey border border-neon-blue/30 rounded-lg text-cyber-text focus:outline-none focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20 transition-all"
                >
                  <option value="">Select Dimension</option>
                  {LIFE_DIMENSIONS_LIST.map(dimension => (
                    <option key={dimension} value={dimension}>
                      {dimension}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleRemoveTag(tag.name)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
          <CheckCircle className="text-green-400" size={20} />
          <p className="text-green-400">Log saved successfully!</p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading || !textEntry.trim()}
        className="w-full py-4 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green text-white font-bold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Save size={20} />
        {loading ? 'Saving...' : 'Save Daily Log'}
      </button>
    </div>
  );
}
