# Tag Connection Service - Step 8 Implementation

## Overview
This module tracks co-occurrences between tags to build a network graph for future visualization.

## Database Structure

### Collection: `tag_connections`

Each document represents a unique tag pair with the following schema:

```javascript
{
  id: "code_coffee",           // Alphabetically sorted pair
  source: "code",               // First tag (alphabetically)
  target: "coffee",             // Second tag (alphabetically)
  weight: 5,                    // Number of co-occurrences
  createdAt: Timestamp,         // First occurrence
  lastUpdated: Timestamp        // Most recent occurrence
}
```

## How It Works

### 1. Tag Pair Extraction
When you save a log with tags like `#Code`, `#Coffee`, `#Stress`, the system generates all unique pairs:
- Code <-> Coffee
- Code <-> Stress  
- Coffee <-> Stress

### 2. Normalization
- Tags are converted to lowercase
- Whitespace is trimmed
- Pairs are alphabetically sorted (ensures `Code_Coffee` === `Coffee_Code`)

### 3. Weight Tracking
- **New Connection**: Created with weight = 1
- **Existing Connection**: Weight incremented by 1
- Stronger weights indicate tags that frequently appear together

### 4. Batch Operations
Uses Firestore batch writes for efficiency (up to 500 operations per batch).

## Integration

### Automatic Recording
Tag connections are automatically recorded when:
- Creating a new daily log with 2+ tags
- Updating an existing log with 2+ tags

### Error Handling
Connection recording failures won't prevent log saves (wrapped in try-catch).

## API Functions

### `recordTagConnections(tags)`
Main function called by `createDailyLog()` and `updateDailyLog()`.

**Example:**
```javascript
await recordTagConnections(['Code', 'Coffee', 'Stress']);
// Creates/updates 3 connections with weight increments
```

### `getTagConnections(tag)`
Get all connections for a specific tag, sorted by weight.

**Example:**
```javascript
const connections = await getTagConnections('code');
// Returns: [
//   { tag: 'coffee', weight: 10 },
//   { tag: 'stress', weight: 5 }
// ]
```

### `getAllTagConnections(minWeight)`
Get entire network (for visualization).

**Example:**
```javascript
const network = await getAllTagConnections(2);
// Returns all connections with weight >= 2
```

### `debugTagConnections()`
Console visualization of the network.

**Output:**
```
🔗 TAG CONNECTION NETWORK DEBUG
================================
Total Connections: 15

1. code <-> coffee
   Weight: 10 ██████████
   Last Updated: 12/8/2025

2. code <-> stress
   Weight: 5 █████
   Last Updated: 12/7/2025

📊 NETWORK STATISTICS
===================
Unique Tags: 8
Total Connections: 15
Average Weight: 3.47
Strongest Connection: code <-> coffee (10)
```

## Testing

### In the Dashboard:
1. Create logs with multiple tags (e.g., #Code #Coffee)
2. Click the **🔗 Connections** button  
3. Open browser console to see the network debug output

### Expected Behavior:
- Repeated tag combinations increase weight
- Single-tag logs don't create connections
- Connections are bidirectional (normalized to one document)

## Future Use Cases (Step 9+)
This data will power:
- Force-directed network graphs
- Tag recommendation systems ("You often use #Coffee when you tag #Code")
- Pattern discovery (which tags cluster together)
- Strongest associations visualization

## Performance Notes
- Connections are written asynchronously (non-blocking)
- Batch operations minimize Firestore writes
- In-memory filtering avoids complex Firestore queries
- No indexes required (uses document IDs for lookup)
