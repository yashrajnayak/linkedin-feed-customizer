# LinkedIn Feed Customizer - AI Agent Instructions

## Project Overview
A Chrome Extension (Manifest V3) that hides LinkedIn feed posts containing user-specified keywords. **Key focus**: robust filtering on LinkedIn's asynchronously-loaded, dynamic feed.

## Architecture

### Component Interaction
```
popup.html/css/js (minimal popup UI)
    ↓ (chrome.storage.local)
manifest.json (MV3 permissions, host_permissions)
    ↓ (chrome.runtime.onMessage)
content.js (runs on linkedin.com/*, 3-pronged post hiding + MutationObserver)
```

### Data Flow
1. **Popup → Storage**: Keywords saved to `chrome.storage.local` with `isEnabled` flag (lowercase, deduplicated)
2. **Content Script → Storage**: Increments `hiddenCount` on each match
3. **Popup ↔ Content Script**: Messages trigger keyword updates or toggle enable/disable

## Critical Patterns & Conventions

### 1. Post Hiding Strategy (content.js)
**Three-pronged approach** to handle LinkedIn's asynchronous post loading:

1. **Immediate hiding** on `initializeExtension()` - catches already-loaded posts
2. **Delayed hiding** (500ms, 2000ms timeouts) - catches posts still rendering during page load
3. **MutationObserver** - detects new posts during infinite scroll via debounced callback (100ms)

**Implementation**:
- Use multiple fallback selectors for robustness (LinkedIn structure changes frequently):
  ```javascript
  ['div[data-id*="activity"]', 'div[class*="update-components-feed"]', '.feed-item', 'article']
  ```
- Always check `shouldHidePost()` to avoid reprocessing posts already marked with `data-hidden-by-feed-customizer` attribute
- **Always lowercase** both keywords and textContent: `textContent.toLowerCase().includes(keyword.toLowerCase())`

### 2. Performance Optimizations
- **MutationObserver debouncing**: 100ms timeout (prevents lag during scrolling)
- **Event delegation**: Single listener on `#keywordsList` handles all keyword removals
- **Observer re-initialization**: Every 5 minutes to adapt to LinkedIn DOM changes
- **Lazy storage reads**: Load keywords once; update via messaging only

### 3. Messaging Architecture
All content script message handlers return responses via `sendResponse()`:
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateKeywords') { 
    // Re-init observer, hide posts, return hiddenCount
  }
  sendResponse({ status: '...', hiddenCount });
});
```
**Message actions**:
- `updateKeywords` - Popup sends new keywords; trigger `hidePosts()` + re-init observer
- `toggleEnabled` - Control enable/disable without removing keywords  
- `getStats` - Retrieve current hiddenCount and keywordCount

**Critical**: Always check active tab URL includes `linkedin.com` before messaging

### 4. Storage Schema
```javascript
{
  keywords: string[],        // Lowercase, deduplicated, max 50 items, max 100 chars each
  isEnabled: boolean,        // Default: true
  hiddenCount: number,       // Session counter (resets on page reload)
  exportDate: string         // ISO timestamp (export metadata only)
}
```

### 5. UI Patterns
- **Toast notifications**: 3-second fade (not alerts); use `showNotification(msg, type)`
- **HTML escaping**: Use `escapeHtml()` for any dynamic keyword display (XSS prevention)
- **Dark mode**: Built into CSS via `@media (prefers-color-scheme: dark)`
- **Comma-separated input**: Popup supports "crypto, spam" → stored as ["crypto", "spam"]
- **Event delegation**: Click handler on `#keywordsList` for all remove buttons (data-keyword attribute)

## Developer Workflows

### Testing Content Script Changes
1. Modify `content.js` post hiding logic
2. `chrome://extensions/` → Remove + reload unpacked extension
3. Hard refresh LinkedIn page to re-execute `content_scripts`
4. Monitor hiddenCount: `chrome.storage.local.get(['hiddenCount'], console.log)`
5. Test post hiding at different timing stages: immediate, after 500ms, after 2000ms, during scroll

### Testing Popup Changes  
1. Modify popup.js/html/css
2. Click extension icon to reload popup (changes apply instantly)
3. No LinkedIn page reload needed
4. Test keyboard input: Tab order, Enter key, comma-separated parsing

### Testing Storage/Messaging
- Use `chrome.runtime.onMessage.addListener` to test each action handler
- Each handler must call `sendResponse()` before returning
- Verify message handlers handle `chrome.runtime.lastError` for inactive tabs

### Icon Generation
```bash
python3 generate_icons.py
```
Generates 16, 32, 48, 128px icons in `icons/` directory (LinkedIn blue gradient)

## Integration Points

### Extension Permissions (manifest.json)
- `storage` - Read/write keywords and state (never sent externally)
- `scripting` - Inject content.js on LinkedIn
- `activeTab` - Query current tab for messaging
- `host_permissions` - `https://www.linkedin.com/*`

### Keyboard Shortcuts (manifest.json)
- **Windows/Linux**: `Alt + Shift + L` - Opens extension popup
- **macOS**: `Cmd + Shift + L` - Opens extension popup

### External Dependencies
**None** - Vanilla JavaScript, no npm packages, no build step

### LinkedIn Structure Details
- Posts detected via multiple selectors (avoid single-selector brittleness)
- Class names change unexpectedly → observer re-initializes every 5 minutes
- Use `[data-id*="activity"]` for sponsored/native posts
- `article` and `.feed-item` are most reliable fallbacks
- Content script runs at `document_end` to catch page-loaded posts

## Code Quality Standards

### JSDoc Conventions
All functions must have JSDoc with parameter types and return types:
```javascript
/**
 * Brief description
 * @param {type} name - Description
 * @returns {type} - Description
 */
```

### Error Handling
- Wrap message handlers in try-catch blocks
- Use `console.error()` for debugging; show toasts via `showNotification()` for user-facing errors
- Always check `chrome.runtime.lastError` after async storage/messaging calls
- Gracefully degrade if LinkedIn structure unrecognizable (warn in console, continue)

### Naming Conventions
- Variables: `camelCase` (currentKeywords, hiddenCount, debounceTimeout)
- CSS classes: `kebab-case` (.btn-add, .toggle-slider, .keyword-item)
- Data attributes: `kebab-case` (data-hidden-by-feed-customizer, data-keyword)
- Functions: `camelCase` with verbs (hidePost, shouldHidePost, observeNewPosts)

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
