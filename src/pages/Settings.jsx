import { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle, AlertCircle, Tag } from 'lucide-react';
import { 
  extractKeywordsFromVideos, 
  debugKeywordExtraction,
  getTagFrequency,
  getTopTags 
} from '../services/keywordExtractionService';

export default function Settings() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
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

        // STEP 13: Extract keywords from ALL videos
        console.log('\n🚀 STARTING KEYWORD EXTRACTION...\n');
        
        // Get all videos from the parsed data
        let allVideos = [];
        if (Array.isArray(data)) {
          allVideos = data;
        } else if (data.videos && Array.isArray(data.videos)) {
          allVideos = data.videos;
        } else if (data.history && Array.isArray(data.history)) {
          allVideos = data.history;
        }

        // Extract keywords from all videos
        const videosWithTags = extractKeywordsFromVideos(allVideos);
        
        // Debug: Show first 10 videos with extracted tags
        debugKeywordExtraction(videosWithTags, 10);

        // Calculate tag statistics
        const tagFrequency = getTagFrequency(videosWithTags);
        const topTags = getTopTags(tagFrequency, 20);
        
        console.log('\n💡 EXTRACTION SUMMARY:');
        console.log(`   Total videos processed: ${videosWithTags.length}`);
        console.log(`   Unique tags extracted: ${Object.keys(tagFrequency).length}`);
        console.log(`   Most common tag: #${topTags[0]?.tag} (${topTags[0]?.count} occurrences)`);

        setUploadStatus('success');
        setStatusMessage(`Successfully processed ${result.total} videos and extracted ${Object.keys(tagFrequency).length} unique tags! Check console for details.`);
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

        {/* File Upload Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${dragActive 
              ? 'border-neon-purple bg-neon-purple/10' 
              : 'border-neon-blue/30 bg-cyber-dark hover:border-neon-blue hover:bg-neon-blue/5'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <FileJson 
            className={`mx-auto mb-4 ${dragActive ? 'text-neon-purple' : 'text-neon-blue'}`} 
            size={64} 
          />

          <h3 className="text-xl font-semibold text-cyber-text mb-2">
            {dragActive ? 'Drop your file here' : 'Upload Google Takeout JSON'}
          </h3>

          <p className="text-cyber-muted mb-4">
            Drag and drop your .json file here, or click to browse
          </p>

          {uploading && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 border-3 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
              <span className="text-neon-blue">Processing file...</span>
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

      {/* Other Settings (Placeholder) */}
      <div className="bg-cyber-grey border border-gray-800/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-cyber-text mb-2">Account Settings</h2>
        <p className="text-cyber-muted text-sm">
          Additional settings coming soon...
        </p>
      </div>
    </div>
  );
}
