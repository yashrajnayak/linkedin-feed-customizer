/**
 * LinkedIn Feed Customizer - Content Script
 * Hides posts containing user-specified keywords
 */

console.log('[LinkedIn Feed Customizer] Content script loaded');

let currentKeywords = [];
let currentEnabled = true;
let observer = null;
let hiddenCount = 0;

// FIXED: Correct LinkedIn post selectors (2026 structure)
const POST_SELECTORS = [
  'div.feed-shared-update-v2',                    // Main post wrapper
  'div[data-id*="urn:li:activity"]',              // Posts with activity URN
  'li.feed-shared-update-v2__content-wrapper',    // Alternative wrapper
  'div[class*="feed-shared-update"]'              // Any feed update class
].join(', ');

/**
 * Initialize the extension
 */
function initializeExtension() {
  console.log('[LFC] Initializing extension...');

  chrome.storage.local.get(['keywords', 'isEnabled', 'hiddenCount'], (data) => {
    if (chrome.runtime.lastError) {
      console.error('[LFC] Storage error:', chrome.runtime.lastError);
      return;
    }

    currentEnabled = data.isEnabled !== false; // Default to true
    currentKeywords = data.keywords || [];
    hiddenCount = data.hiddenCount || 0;

    console.log('[LFC] Settings loaded:', {
      enabled: currentEnabled,
      keywords: currentKeywords,
      hiddenCount
    });

    // Wait for feed to load, then process and observe
    waitForFeedContainer().then(() => {
      console.log('[LFC] Feed container found, starting...');

      // Process existing posts
      if (currentEnabled && currentKeywords.length > 0) {
        hidePosts(currentKeywords);
      }

      // Set up observer for new posts
      observeNewPosts(currentKeywords);

      // Delayed processing for lazy-loaded posts
      setTimeout(() => {
        if (currentEnabled && currentKeywords.length > 0) {
          hidePosts(currentKeywords);
        }
      }, 1000);
    });
  });

  // Reinitialize observer periodically
  setInterval(() => {
    console.log('[LFC] Periodic reinitialization...');
    if (currentKeywords.length > 0) {
      if (observer) observer.disconnect();
      observeNewPosts(currentKeywords);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Wait for feed container to appear (handles SPA navigation)
 */
function waitForFeedContainer() {
  return new Promise((resolve) => {
    const checkContainer = () => {
      const container = document.querySelector('main.scaffold-layout__main, main[role="main"]');
      if (container) {
        console.log('[LFC] Feed container found:', container);
        resolve(container);
      } else {
        console.log('[LFC] Waiting for feed container...');
        setTimeout(checkContainer, 500);
      }
    };
    checkContainer();
  });
}

/**
 * Hide posts matching keywords
 */
function hidePosts(keywords) {
  if (!keywords || keywords.length === 0) {
    console.log('[LFC] No keywords to filter');
    return;
  }

  console.log('[LFC] Scanning for posts with selectors:', POST_SELECTORS);

  const posts = document.querySelectorAll(POST_SELECTORS);
  console.log(`[LFC] Found ${posts.length} posts to check`);

  let newlyHidden = 0;

  posts.forEach(post => {
    if (shouldHidePost(post, keywords)) {
      hidePost(post);
      newlyHidden++;
    }
  });

  if (newlyHidden > 0) {
    console.log(`[LFC] Hidden ${newlyHidden} posts in this scan`);
  }
}

/**
 * Check if post should be hidden
 */
function shouldHidePost(post, keywords) {
  // Skip if already processed
  if (post.getAttribute('data-hidden-by-feed-customizer') === 'true') {
    return false;
  }

  // Get post text content
  const textContent = post.textContent?.toLowerCase() || '';

  // Check if any keyword matches
  return keywords.some(keyword => {
    if (!keyword.trim()) return false;
    return textContent.includes(keyword.toLowerCase());
  });
}

/**
 * Hide a single post
 */
function hidePost(post) {
  // Skip if already hidden
  if (post.getAttribute('data-hidden-by-feed-customizer') === 'true') {
    return;
  }

  console.log('[LFC] Hiding post:', post);

  // Mark as hidden
  post.setAttribute('data-hidden-by-feed-customizer', 'true');

  // Hide the post
  post.style.display = 'none';

  // Increment counter
  hiddenCount++;
  chrome.storage.local.set({ hiddenCount }, () => {
    if (!chrome.runtime.lastError) {
      console.log(`[LFC] Total hidden: ${hiddenCount}`);
    }
  });
}

/**
 * FIXED: Observe DOM for new posts with proper infinite scroll support
 */
function observeNewPosts(keywords) {
  console.log('[LFC] Setting up MutationObserver...');

  // FIXED: Find the correct feed container
  const feedContainer = document.querySelector('main.scaffold-layout__main')
    || document.querySelector('main[role="main"]')
    || document.querySelector('div.scaffold-layout__content')
    || document.body;

  if (!feedContainer) {
    console.warn('[LFC] Feed container not found, retrying...');
    setTimeout(() => observeNewPosts(keywords), 1000);
    return;
  }

  console.log('[LFC] Observing container:', feedContainer.className);

  // Create observer with debouncing
  let debounceTimeout;
  const postsToCheck = new Set();

  observer = new MutationObserver((mutations) => {
    // Collect all unique posts that might have changed
    mutations.forEach(mutation => {
      // Check added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;

        // 1. Is the node itself a post?
        if (node.matches && node.matches(POST_SELECTORS)) {
          postsToCheck.add(node);
        }
        // 2. Does it contain posts?
        else if (node.querySelectorAll) {
          const childPosts = node.querySelectorAll(POST_SELECTORS);
          childPosts.forEach(post => postsToCheck.add(post));
        }

        // 3. Is it *inside* a post? (Hydration case)
        const parentPost = findParentPost(node);
        if (parentPost) {
          postsToCheck.add(parentPost);
        }
      });

      // Check target node (attributes/characterData changes if we were watching them, 
      // or childList changes where the target itself is the post)
      if (mutation.type === 'childList') {
        const parentPost = findParentPost(mutation.target);
        if (parentPost) postsToCheck.add(parentPost);
      }
    });

    // Debounce the actual processing
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (!currentEnabled || currentKeywords.length === 0 || postsToCheck.size === 0) {
        return;
      }

      console.log(`[LFC] Processing ${postsToCheck.size} potentially changed posts`);

      let newlyHidden = 0;
      postsToCheck.forEach(post => {
        // Re-check visibility (in case it was hidden but should be shown, or vice versa)
        // But mainly we care about hiding what should be hidden
        if (post.isConnected && shouldHidePost(post, currentKeywords)) {
          hidePost(post);
          newlyHidden++;
        }
      });

      if (newlyHidden > 0) {
        console.log(`[LFC] Hidden ${newlyHidden} additional posts`);
      }

      postsToCheck.clear();

    }, 100); // 100ms debounce
  });

  // FIXED: Observe with correct options
  observer.observe(feedContainer, {
    childList: true,      // Watch for added/removed nodes
    subtree: true,        // Watch entire subtree (critical for infinite scroll!)
    attributes: false,    // Don't need attribute changes
    characterData: true   // Watch text changes (critical for hydration where text appears later)
  });

  console.log('[LFC] Observer started successfully');
}

/**
 * Helper to find if a node is inside a post
 */
function findParentPost(node) {
  if (!node || !node.closest) return null;

  // POST_SELECTORS is a comma-separated string, we need to split it for closest() 
  // or just use one common class if possible. 
  // However, .closest() takes a selector string just like querySelector.
  // We can reuse POST_SELECTORS directly.
  return node.closest(POST_SELECTORS);
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[LFC] Message received:', request);

  try {
    if (request.action === 'updateKeywords') {
      currentKeywords = request.keywords || [];

      console.log('[LFC] Keywords updated:', currentKeywords);

      // Reset all posts
      document.querySelectorAll('[data-hidden-by-feed-customizer="true"]').forEach(post => {
        post.removeAttribute('data-hidden-by-feed-customizer');
        post.style.display = '';
      });

      // Reset counter
      hiddenCount = 0;
      chrome.storage.local.set({ hiddenCount: 0 });

      // Restart observer
      if (observer) observer.disconnect();
      observeNewPosts(currentKeywords);

      // Reprocess all posts
      if (currentEnabled && currentKeywords.length > 0) {
        hidePosts(currentKeywords);
      }

      sendResponse({ status: 'Keywords updated', hiddenCount });
    }
    else if (request.action === 'toggleEnabled') {
      currentEnabled = request.enabled;

      console.log('[LFC] Filter toggled:', currentEnabled);

      if (!currentEnabled) {
        // Show all hidden posts
        document.querySelectorAll('[data-hidden-by-feed-customizer="true"]').forEach(post => {
          post.style.display = '';
        });
      } else {
        // Restart observer and reprocess
        if (observer) observer.disconnect();
        observeNewPosts(currentKeywords);
        hidePosts(currentKeywords);
      }

      sendResponse({ status: 'Toggle updated', hiddenCount });
    }
    else if (request.action === 'getStats') {
      sendResponse({ hiddenCount, keywordCount: currentKeywords.length });
    }
  } catch (error) {
    console.error('[LFC] Error handling message:', error);
    sendResponse({ error: error.message });
  }

  return true; // Keep message channel open
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

console.log('[LFC] Content script setup complete');
