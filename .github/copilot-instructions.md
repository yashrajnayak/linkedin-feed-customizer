# LinkedIn Feed Customizer - AI Agent Instructions

## Project Overview
A Chrome Extension (Manifest V3) that hides LinkedIn feed posts containing user-specified keywords. **Key focus**: performance and robustness on LinkedIn's dynamic feed.

## Architecture

### Component Interaction
```
popup.html/css/js (450px popup UI)
    ↓ (chrome.storage.local)
manifest.json (permissions, host_permissions)
    ↓ (chrome.runtime.onMessage)
content.js (runs on linkedin.com/*, scans posts with MutationObserver)
```

### Data Flow
1. **Popup → Storage**: Keywords saved to `chrome.storage.local` with `isEnabled` flag
2. **Content Script → Storage**: Increments `hiddenCount` on each hidden post
3. **Popup ↔ Content Script**: Messages for keyword updates trigger immediate filtering

## Critical Patterns & Conventions

### 1. Post Hiding Logic (content.js)
**Multiple fallback selectors** (robustness for LinkedIn's dynamic structure):
```javascript
const postSelectors = [
  'div[data-id*="activity"]',      // LinkedIn's primary post container
  'div[class*="update-components-feed"]',
  '.feed-item',
  'article'
];
```
- Use `shouldHidePost()` to avoid re-processing marked posts (`data-hidden-by-feed-customizer` attribute)
- Always lowercase keyword + textContent comparisons (case-insensitive matching)

### 2. Performance Optimizations
- **MutationObserver debouncing**: 100ms timeout in `observeNewPosts()` (prevents lag during scrolling)
- **Event delegation**: Single listener on `#keywordsList` for all keyword removals (popup.js)
- **Lazy re-initialization**: Observer reconnects every 5 minutes to adapt to LinkedIn structure changes
- **Selective processing**: Skip already-hidden posts via attribute check

### 3. Messaging Architecture
**From popup to content script** (apply changes):
```javascript
chrome.tabs.sendMessage(tabId, {
  action: 'updateKeywords',
  keywords: array
}, (response) => sendResponse({ hiddenCount }));
```
- Always queries active tab URL first (must contain 'linkedin.com')
- Handles `chrome.runtime.lastError` for inactive tabs/unavailable script

### 4. Storage Keys & Schema
```javascript
{
  keywords: string[],        // Lowercase, deduplicated, max 50 items
  isEnabled: boolean,        // Default: true
  hiddenCount: number,       // Session metric (resets on page load)
  exportDate: string         // ISO timestamp (export metadata only)
}
```

### 5. UI Patterns
- **Toast notifications** (not alerts) for user feedback with 3-second fade
- **HTML escaping**: `escapeHtml()` for dynamic keyword display (XSS prevention)
- **Dark mode support**: Uses `@media (prefers-color-scheme: dark)` in popup.css
- **Keyboard shortcut**: Alt+Shift+L (Windows/Linux), Cmd+Shift+L (macOS) in manifest.json

## Developer Workflows

### Testing Content Script Changes
1. Modify `content.js` (post hiding logic)
2. Run `chrome://extensions/` → Remove extension
3. Load unpacked extension again
4. Hard refresh LinkedIn page
5. Open DevTools → test with console: `chrome.storage.local.get(console.log)`

### Testing Popup Changes
1. Modify popup.js/html/css
2. Click extension icon to reload popup automatically (or restart at `chrome://extensions/`)
3. No LinkedIn page reload needed

### Testing Storage/Messaging
- Use content script's `chrome.runtime.onMessage.addListener` with action types: `updateKeywords`, `toggleEnabled`, `getStats`
- Each message handler must call `sendResponse()` before async operations or use return true

### Icon Generation
```bash
python3 generate_icons.py
```
Generates 16, 32, 48, 128px icons in `icons/` directory with LinkedIn blue gradient

## Integration Points

### Extension Permissions (manifest.json)
- `storage` - Read/write keywords (never sent externally)
- `scripting` - Inject content.js on LinkedIn
- `activeTab` - Access current tab for messaging
- `host_permissions` - `https://www.linkedin.com/*`

### External Dependencies
**None** - Vanilla JavaScript, no npm packages

### LinkedIn Implementation Details
- Posts detected via multiple selectors (avoid single-selector brittleness)
- `feed-item` and `article` tags are most reliable
- `data-id*="activity"` captures sponsored/native posts
- Class names like `update-components-feed` change unexpectedly (why re-init every 5 min)

## Code Quality Standards

### JSDoc Requirements
All functions must have JSDoc with parameter types and return types:
```javascript
/**
 * Brief description
 * @param {type} name - Description
 * @returns {type} - Description
 */
```

### Error Handling
- Wrap message handlers in try-catch (content.js line 139+)
- Log to console for debugging; show toasts for user-facing errors
- Always handle `chrome.runtime.lastError` after async storage/messaging calls

### Naming Conventions
- Variables: `camelCase` (currentKeywords, hiddenCount)
- CSS classes: `kebab-case` (.btn-add, .toggle-slider)
- Data attributes: `kebab-case` (data-hidden-by-feed-customizer, data-keyword)
- Functions: `camelCase` with verbs (hidePost, shouldHidePost)

## Common Tasks & Examples

### Adding a New Feature
1. If it modifies keywords: update `content.js` post hiding + `popup.js` storage logic
2. If it's UI: Add HTML to `popup.html`, CSS to `popup.css`, handlers to `popup.js`
3. Update `manifest.json` only if new permissions are needed
4. Test on LinkedIn inside popup context + content script context

### Debugging Post-Hiding Issues
1. Open LinkedIn DevTools → Content Script filtered view
2. Check `hiddenCount` in storage: `chrome.storage.local.get(console.log)`
3. Verify keywords are lowercase: `chrome.storage.local.get(['keywords'], console.log)`
4. Check post selectors match current LinkedIn HTML structure
5. Confirm feature flag `isEnabled === true`

### Export/Import Data
- Export: Creates JSON with `{ keywords, isEnabled, exportDate }`
- Import: Validates `Array.isArray(settings.keywords)` before applying
- Both trigger `applyChanges()` to immediately filter feed

## Limitations & Constraints
- **Keyword matching**: Simple substring (no regex, no wildcards) for performance
- **Max keywords**: 50 items per design (arbitrary but conservative)
- **Max keyword length**: 100 characters
- **Scope**: LinkedIn desktop only - mobile app not supported
- **No cloud sync**: Intentionally stored locally (privacy-first design)
- **No regex**: Would require escaping; complicates UX for non-technical users
