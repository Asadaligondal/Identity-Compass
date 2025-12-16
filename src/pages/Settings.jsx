import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileJson, CheckCircle, AlertCircle, Database, Sparkles, Wand2, Tag } from 'lucide-react';

import { 
  categorizeTitlesInBatches, 
  getCategoryStats 
} from '../services/titleCategorizationService';
import { saveCategorizedVideos } from '../services/categorizedVideoService';
import { 
  categorizeTagsInBatches, 
  getCategorizationStats 
} from '../services/aiCategorizationService';
import { 
  getUnassignedTags, 
  updateTagCategories,
  getUserTagMappings,
  saveMultipleTagMappings 
} from '../services/tagMappingService';
import { getTagAnalytics } from '../services/dailyLogService';
import { getAllUniqueTagsFromConnections } from '../services/tagConnectionService';

export default function Settings() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [categorizing, setCategorizing] = useState(false);
  const [categorizationStatus, setCategorizationStatus] = useState(null);
  const [categorizationMessage, setCategorizationMessage] = useState('');
  const [categorizationProgress, setCategorizationProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  // Parse Google Takeout Watch History JSON
  const parseGoogleTakeout = (data) => {
    try {
      // Google Takeout Watch History typically has structure like:
      // [{ "title": "Video Title", "time": "2023-01-01T12:00:00Z", ... }, ...]
      // or { "videos": [{ "title": "...", ... }] }
      
      let videos = [];
      
      // Handle different possible structures
      if (Array.isArray(data)) {
        videos = data;
      } else if (data.videos && Array.isArray(data.videos)) {
        videos = data.videos;
      } else if (data.history && Array.isArray(data.history)) {
        videos = data.history;
      } else {
        throw new Error('Unrecognized JSON structure. Expected an array of videos.');
      }

      // Extract first 5 video titles
      const firstFive = videos.slice(0, 5).map((video, index) => {
        // Handle various possible field names
        const title = video.title || video.name || video.titleUrl || 'Unknown Title';
        const time = video.time || video.time_accessed || video.timestamp || video.date || 'Unknown Time';
        
        return { index: index + 1, title, time };
      });

      return { success: true, videos: firstFive, total: videos.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setUploadStatus('error');
      setStatusMessage('Please upload a .json file');
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setStatusMessage('');

    try {
      // Read file content
      const text = await file.text();
      const data = JSON.parse(text);

      // Parse Google Takeout format
      const result = parseGoogleTakeout(data);

      if (result.success) {
        console.log('✅ Successfully parsed Google Takeout file!');
        console.log(`📊 Total videos found: ${result.total}`);
        console.log('🎬 First 5 video titles:');
        console.log('─'.repeat(80));
        
        result.videos.forEach(({ index, title, time }) => {
          console.log(`${index}. ${title}`);
          console.log(`   ⏰ ${time}`);
          console.log('─'.repeat(80));
        });

        // NEW PIPELINE: AI Categorization FIRST!
        console.log('\n🤖 STARTING AI CATEGORIZATION...\n');
        
        // Get all videos from the parsed data
        let allVideos = [];
        if (Array.isArray(data)) {
          allVideos = data;
        } else if (data.videos && Array.isArray(data.videos)) {
          allVideos = data.videos;
        } else if (data.history && Array.isArray(data.history)) {
          allVideos = data.history;
        }

        // Limit to first 50 videos for free tier testing
        const videosToProcess = allVideos.slice(0, 50);
        console.log(`📊 Processing ${videosToProcess.length} videos (limited for free tier)`);

        setProcessing(true);
        setStatusMessage('Categorizing videos with AI...');

        try {
          // STEP 1: AI categorizes each title
          const categorizedVideos = await categorizeTitlesInBatches(
            videosToProcess,
            20, // 20 titles per API call
            (progress) => {
              setProgress({ current: progress.videosProcessed, total: progress.totalVideos });
              setStatusMessage(`AI Categorizing: ${progress.videosProcessed}/${progress.totalVideos} videos`);
            }
          );

          console.log('✅ AI categorization complete!');
          
          // Get statistics
          const stats = getCategoryStats(categorizedVideos);
          console.log('📊 Category breakdown:', stats);

          // STEP 2: Save categorized videos to Firestore
          setStatusMessage('Saving categorized videos to database...');
          await saveCategorizedVideos(
            user.uid,
            categorizedVideos,
            (current, total) => {
              setProgress({ current, total });
              setStatusMessage(`Saving: ${current}/${total} videos`);
            }
          );

          // Success!
          const statsMessage = Object.entries(stats)
            .filter(([_, count]) => count > 0)
            .map(([cat, count]) => `${cat}: ${count}`)
            .join(' • ');

          setUploadStatus('success');
          setStatusMessage(
            `Successfully categorized and saved ${categorizedVideos.length} videos! ` +
            `${statsMessage} • Go to Mind Map to see your categorized galaxy!`
          );

        } catch (error) {
          console.error('❌ Processing error:', error);
          setUploadStatus('error');
          setStatusMessage(`Error: ${error.message}`);
        } finally {
          setProcessing(false);
        }
      } else {
        console.error('❌ Parse error:', result.error);
        setUploadStatus('error');
        setStatusMessage(`Parse error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ File read error:', error);
      setUploadStatus('error');
      setStatusMessage(`Error reading file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Trigger file input click
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Handle AI Auto-Categorization
  const handleAutoCategorize = async () => {
    if (!user) {
      setCategorizationStatus('error');
      setCategorizationMessage('Please log in to use this feature');
      return;
    }

    setCategorizing(true);
    setCategorizationStatus(null);
    setCategorizationMessage('');
    setCategorizationProgress({ current: 0, total: 0 });

    try {
      console.log('🤖 Starting AI categorization...');

      // OPTIMIZED: Single Firestore call to get existing mappings
      const allMappings = await getUserTagMappings(user.uid);
      const mappedTags = Object.keys(allMappings);
      console.log(`📊 Found ${mappedTags.length} existing tags`);

      if (mappedTags.length === 0) {
        setCategorizationStatus('error');
        setCategorizationMessage('No tags found. Please add daily logs or import YouTube history first.');
        return;
      }

      // Filter for unassigned tags
      const unassignedTags = mappedTags.filter(tag => {
        const category = allMappings[tag]?.category || 'Unassigned';
        return category === 'Unassigned';
      });

      console.log(`🔍 Found ${unassignedTags.length} unassigned tags`);

      if (unassignedTags.length === 0) {
        setCategorizationStatus('success');
        setCategorizationMessage('All tags are already categorized! 🎉');
        return;
      }

      // STEP 22: Limit to 20 tags to prevent overload
      const tagsToProcess = unassignedTags.slice(0, 20);
      console.log(`🚀 Processing ${tagsToProcess.length} unassigned tags (limited to 20 for stability)...`);

      // STEP 22: Minimize requests - 20 tags per batch = 5 requests for 100 tags
      const categorization = await categorizeTagsInBatches(
        tagsToProcess,
        20, // Batch size: 20 tags per call = 5 total requests for 100 tags
        (progress) => {
          setCategorizationProgress({
            current: progress.tagsProcessed,
            total: progress.totalTags
          });
        }
      );

      console.log('✅ AI categorization complete:', categorization);

      // Update Firestore with new categories
      await updateTagCategories(user.uid, categorization);
      console.log('✅ Firestore updated with new categories');

      // Get statistics
      const stats = getCategorizationStats(categorization);
      console.log('📊 Categorization stats:', stats);

      const statsMessage = Object.entries(stats)
        .filter(([_, count]) => count > 0)
        .map(([category, count]) => `${DIMENSION_CONFIG[category].emoji} ${category}: ${count}`)
        .join(' • ');

      setCategorizationStatus('success');
      setCategorizationMessage(`Successfully categorized ${tagsToProcess.length} tags! ${statsMessage}`);

    } catch (error) {
      console.error('❌ AI categorization error:', error);
      setCategorizationStatus('error');
      setCategorizationMessage(error.message || 'Failed to categorize tags. Please check your Gemini API key.');
    } finally {
      setCategorizing(false);
    }
  };

  // Handle removing noise tag (like "watched")
  const handleRemoveNoiseTag = async () => {
    if (!window.confirm('Remove "watched" node from all connections? This will clean up your graph.')) {
      return;
    }

    try {
      setCategorizationStatus(null);
      const result = await removeTagFromConnections('watched');
      setCategorizationStatus('success');
      setCategorizationMessage(`Removed ${result.deleted} connections with "watched" tag. Refresh your Mind Map to see changes!`);
    } catch (error) {
      console.error('Error removing tag:', error);
      setCategorizationStatus('error');
      setCategorizationMessage('Failed to remove tag. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent mb-2">
          Settings
        </h1>
        <p className="text-neon-blue/60">
          Configure your Identity Compass and import data
        </p>
      </div>

      {/* Data Import Section */}
      <div className="bg-cyber-grey border border-neon-purple/30 rounded-lg p-6 mb-6 shadow-xl shadow-neon-purple/10">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="text-neon-purple" size={24} />
          <h2 className="text-2xl font-semibold text-cyber-text">Data Import & Keyword Extraction</h2>
        </div>

        <p className="text-cyber-muted mb-2">
          Upload your Google Takeout Watch History (.json file) to automatically extract topics and tags.
        </p>
        
        <div className="mb-6 p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Tag className="text-neon-blue flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="text-neon-blue font-semibold mb-1">Smart Keyword Extraction</p>
              <p className="text-cyber-muted text-xs">
                Our NLP algorithm automatically converts video titles like <span className="text-neon-green">"Introduction to React Hooks"</span> into tags: <span className="text-neon-purple">#React</span>, <span className="text-neon-purple">#Hooks</span>
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Button */}
        <div className="flex flex-col items-center gap-4 py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <FileJson className="text-neon-blue" size={64} />

          <button
            onClick={handleClick}
            disabled={uploading || processing}
            className="px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-3"
          >
            <Upload size={24} />
            <span>Upload YouTube History (.json)</span>
          </button>

          <p className="text-cyber-muted text-sm text-center max-w-md">
            Upload your Google Takeout watch history file to automatically categorize your videos
          </p>

          {(uploading || processing) && (
            <div className="flex flex-col items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                <Database className="text-neon-purple animate-pulse" size={24} />
                <span className="text-neon-purple font-semibold">
                  {uploading ? 'Reading file...' : 'Processing videos...'}
                </span>
              </div>
              {progress.total > 0 && (
                <div className="w-full max-w-md">
                  <div className="flex justify-between text-xs text-cyber-muted mb-1">
                    <span>{progress.current} / {progress.total} videos</span>
                    <span>{Math.round(progress.current / progress.total * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-cyber-dark rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-green-400 font-semibold">Success!</p>
              <p className="text-green-400/80 text-sm">{statusMessage}</p>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-400/80 text-sm">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-neon-blue/5 border border-neon-blue/20 rounded-lg">
          <h4 className="text-sm font-semibold text-neon-blue mb-2">How to get your Google Takeout:</h4>
          <ol className="text-xs text-cyber-muted space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">takeout.google.com</a></li>
            <li>Select "YouTube and YouTube Music"</li>
            <li>Click "All YouTube data included" and deselect all except "history"</li>
            <li>Choose JSON format and download</li>
            <li>Extract the ZIP and upload the watch-history.json file here</li>
          </ol>
        </div>
      </div>

      {/* AI Auto-Categorization */}
      <div className="bg-cyber-grey border border-neon-purple/30 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-neon-purple" size={28} />
          <div>
            <h2 className="text-xl font-semibold text-cyber-text">AI Auto-Categorization</h2>
            <p className="text-cyber-muted text-sm">
              Use Gemini AI to automatically categorize your tags into life dimensions
            </p>
          </div>
        </div>

        {/* Categorize Button */}
        <div className="flex justify-center py-4">
          <button
            onClick={handleAutoCategorize}
            disabled={categorizing}
            className="px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-3"
          >
            {categorizing ? (
              <>
                <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                <span>Categorizing with AI...</span>
              </>
            ) : (
              <>
                <Wand2 size={24} />
                <span>Categorize Videos with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {categorizing && categorizationProgress.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-cyber-muted mb-2">
              <span>{categorizationProgress.current} / {categorizationProgress.total} tags</span>
              <span>{Math.round((categorizationProgress.current / categorizationProgress.total) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-cyber-dark rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-300"
                style={{ width: `${(categorizationProgress.current / categorizationProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {categorizationStatus === 'success' && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-green-400 font-semibold">Success!</p>
              <p className="text-green-400/80 text-sm">{categorizationMessage}</p>
            </div>
          </div>
        )}

        {categorizationStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-400/80 text-sm">{categorizationMessage}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-4 bg-neon-purple/5 border border-neon-purple/20 rounded-lg">
          <h4 className="text-sm font-semibold text-neon-purple mb-2">How it works:</h4>
          <ol className="text-xs text-cyber-muted space-y-1 list-decimal list-inside">
            <li>AI analyzes all your unassigned tags</li>
            <li>Each tag is categorized into one of 6 life dimensions</li>
            <li>Your Mind Map will transform into a multi-colored galaxy</li>
            <li>See at a glance which areas of life you're focused on</li>
          </ol>
          <p className="text-xs text-yellow-400/80 mt-2">
            ⚠️ Requires Gemini API key in .env file (VITE_GEMINI_API_KEY)
          </p>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-cyber-grey border border-gray-800/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-cyber-text mb-2">Account Settings</h2>
        <p className="text-cyber-muted text-sm">
          Additional settings coming soon...
        </p>
      </div>
    </div>
  );
}
