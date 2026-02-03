# LinkedIn Feed Customizer

A lightweight Chrome extension that automatically hides LinkedIn feed posts containing user-specified keywords. Designed to be privacy-first, performant, and unobtrusive.

## Highlights

- ✨ **Automatic Keyword Filtering** — Posts matching your keywords are hidden automatically (no manual "Apply" click required).
- 🔄 **Works with Infinite Scroll** — New posts loaded while scrolling are checked and hidden in real time.
- 🧩 **Minimal Popup UI** — Compact, modern popup (no scrollbars) to add/remove keywords quickly.
- 📊 **Session Statistics** — See how many posts were hidden during the current session.
- 💾 **Local Storage** — Keywords are stored in Chrome's local storage (no cloud sync by default).
- 📥 **Export / Import** — Backup and restore keywords via JSON.
- 🌓 **Dark Mode** — Matches system theme.
- 🔒 **Privacy First** — All processing happens locally; nothing is sent to external servers.

## Installation

1. Download this repository and extract zip to folder.

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top right)

4. Click "Load unpacked"

5. Select the `linkedin-feed-customizer` folder

## Usage

### Adding & Managing Keywords

1. **Open the popup**: Click the extension icon (or use the keyboard shortcut). The popup is intentionally minimal and compact.

2. **Add keywords**:
   - Type one or more comma-separated keywords into the input (e.g., "crypto, spam") and press Enter or click Add.
   - Each keyword is normalized (lowercased) and deduplicated.
   - Limits: 100 characters per keyword, up to 50 keywords.

3. **Manage keywords**:
   - Keywords appear as compact chips/tags in the popup. Click the × on a chip to remove it — removals apply immediately.
   - There is no "Clear All" button in the minimal UI; remove individual keywords or import a fresh list if needed.

### How changes are applied

- Filters are applied automatically whenever you add/remove keywords or toggle the filter on/off. There's no need for an "Apply" button.
- The content script uses a debounced MutationObserver to hide posts visible on load and any newly loaded posts during scrolling.

### Backup & Restore

6. **Export Settings**:
   - Click "Export" to download your keywords as a JSON file
   - Great for backing up your settings or sharing with others

7. **Import Settings**:
   - Click "Import" to load a previously saved JSON file
   - Useful for restoring settings on a new device or browser

### View Statistics

8. **Statistics Display**:
   - See how many posts have been hidden from your feed
   - Updated automatically as the extension filters posts

## Examples of Keywords

Here are some common keywords people filter:

- **Content Type**: promoting, hiring, congratulations, promoted, reposted
- **Topics**: crypto, nft, blockchain, meme, cryptocurrency
- **Industry**: recruitment, agency, freelance, consultant
- **Spam Indicators**: click here, link in bio, free money, limited time
- **Unwanted Posts**: job posting, ad, advertisement, celebration

**Tips**: 
- Keywords are case-insensitive ("Crypto" and "crypto" both match the same posts)
- Use specific keywords for better results
- Avoid very common words that might hide legitimate posts

## How It Works

1. **Content Script** - Automatically runs when you visit LinkedIn
2. **Keyword Scanning** - Scans all visible posts for your keywords (case-insensitive)
3. **Post Hiding** - Matching posts are immediately hidden from view
4. **Infinite Scroll** - New posts loaded via infinite scroll are automatically checked and hidden
5. **Observer** - Uses MutationObserver to detect new posts (optimized with debouncing)
6. **Reinitalization** - Checks for LinkedIn structure changes every 5 minutes to ensure reliability

**Technical**: All filtering happens locally in your browser. Keywords and settings are stored in Chrome's local storage and never sent to external servers.

## Technical Details

### File Structure
```
linkedin-feed-customizer/
├── manifest.json        # Extension configuration and permissions
├── content.js           # Content script - hides posts and observes feed
├── popup.js             # Popup UI logic - keyword management + messaging
├── popup.html           # Popup interface markup (minimal modern UI)
├── popup.css            # Popup styling (minimal, dark mode supported)
├── icons/               # Extension icon assets
├── generate_icons.py    # Python script to regenerate icons
└── README.md            # This file
```

### Manifest Version
- Chrome Extension Manifest V3 (latest security standard)

### Permissions Used
- `storage` - Save keywords to local storage (never sent to servers)
- `scripting` - Inject content script on LinkedIn pages
- `activeTab` - Access current tab information for messaging

### Performance Optimizations
- **Debounced Observer** - MutationObserver fires max every 100ms (prevents lag during scrolling)
- **Single Event Listener** - Uses event delegation for all keyword buttons (prevents memory leaks)
- **Selective Hiding** - Checks if post already hidden to avoid reprocessing
- **Lazy Storage Reads** - Loads keywords once, updates via messaging only when needed
- **Observer Reinitialization** - Checks every 5 minutes for LinkedIn DOM structure changes

### Keyboard Shortcuts
- **Windows/Linux**: `Alt + Shift + L` - Opens extension popup
- **Mac**: `Cmd + Shift + L` - Opens extension popup

### Storage & Data
- **Storage Engine**: Chrome's local storage (chrome-extension://)
- **Data Stored**: Keyword array, hidden post counter, version metadata
- **Storage Limit**: 10MB for extension (user keywords typically <100KB)
- **Cloud Sync**: Intentionally disabled for privacy
- **Expiration**: Data persists until manually cleared

## Browser Compatibility

- Chrome/Chromium: ✅ Full support
- Edge: ✅ Full support (Chromium-based)
- Opera: ✅ Full support (Chromium-based)
- Firefox: ⚠️ Requires adaptation (WebExtensions API compatible but not tested)

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy

This extension:
- ✅ Stores all data locally in your browser
- ✅ Does NOT send data to external servers
- ✅ Does NOT track your activities
- ✅ Does NOT collect personal information
- ✅ Respects Chrome's privacy policies

### Security Policy
- All data stored locally in your browser
- No external API calls or tracking
- No personal information collection
- Code is open-source for transparency
- Report security issues directly to maintainers

### Response Time & Support
- Issues: Typically addressed within 48 hours
- PRs: Reviewed within 1 week
- Feature requests: Assessed for roadmap alignment
- No guaranteed SLA (maintained by volunteers)

## FAQ

**Q: Will this extension slow down LinkedIn?**
A: No, the extension uses debounced filtering (max 100ms check intervals) and is optimized for performance. Most users notice no impact.

**Q: Can the extension see my private messages or profile?**
A: No, the extension only reads publicly visible feed content using allowed permissions (storage, scripting, activeTab).

**Q: Do I need to restart my browser for changes to take effect?**
A: No. Changes apply automatically when you add/remove keywords or toggle the filter; no restart or manual "Apply" is required.

**Q: What happens if LinkedIn changes their HTML structure?**
A: The extension uses multiple fallback selectors and reinitializes every 5 minutes. We monitor for changes and push updates.

**Q: Can I use regular expressions or wildcards for keywords?**
A: Currently no, simple text matching is used for simplicity and performance. You can use partial words (e.g., "job" for "job posting").

**Q: Are my keywords synced across devices?**
A: Not by default - data is stored locally. You can use Export/Import to backup or transfer keywords to another device.

**Q: Is this extension affiliated with LinkedIn?**
A: No, this is an independent open-source third-party extension respecting LinkedIn's Terms of Service.

**Q: What happens to the hidden post count when I refresh the page?**
A: The counter tracks posts hidden during the current session and may reset on page reloads. Keywords remain saved in local storage.

**Q: Can I temporarily disable filtering without removing my keywords?**
A: Yes, use the "Enable Filter" toggle in the popup to turn filtering on/off while keeping your keywords saved.

**Q: Does this extension work on LinkedIn mobile app?**
A: No, this extension only works on desktop browser version. Mobile apps have separate architecture.

## Credits & Acknowledgments

### Development
- Created and maintained by [Yashraj Nayak](https://github.com/yashrajnayak)
- Built as a productivity tool for LinkedIn users

### Tools & Technologies
- Chrome Extension API (Manifest V3)
- JavaScript (ES2021+ standards)
- Chrome Storage & Messaging APIs
- Python + Pillow (icon generation)

### Community
- Thanks to all users who report bugs and request features
- Contributions welcome - see [Contributing](#contributing) section

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for full details.

### Disclaimer
This extension is not affiliated with, endorsed by, or connected to LinkedIn. LinkedIn is a registered trademark of Microsoft Corporation. Use at your own risk and in compliance with LinkedIn's [Terms of Service](https://www.linkedin.com/legal/user-agreement).

---

If you find this extension helpful, please ⭐ this repo and consider sharing it with others!
