// Content script that runs on LinkedIn feed pages
// This script hides posts containing specified keywords

let currentKeywords = [];
let currentEnabled = true;
let observer = null;
let hiddenCount = 0;

// Initialize on page load
initializeExtension();

/**
 * Initialize the extension
 */
function initializeExtension() {
  chrome.storage.local.get(['keywords', 'isEnabled', 'hiddenCount'], (data) => {
    if (chrome.runtime.lastError) {
      console.error('Storage error:', chrome.runtime.lastError);
      return;
    }

    currentEnabled = data.isEnabled !== false;
    currentKeywords = data.keywords || [];
    hiddenCount = data.hiddenCount || 0;

    // Set up observer to watch for new posts as they load
    observeNewPosts(currentKeywords);

    // Hide existing posts immediately
    if (currentEnabled && currentKeywords.length > 0) {
      hidePosts(currentKeywords);
    }

    // Also call hidePosts after delays to catch posts that are still loading
    setTimeout(() => {
      if (currentEnabled && currentKeywords.length > 0) {
        hidePosts(currentKeywords);
      }
    }, 500);

    setTimeout(() => {
      if (currentEnabled && currentKeywords.length > 0) {
        hidePosts(currentKeywords);
      }
    }, 2000);
  });

  // Periodically reinitialize observer (every 5 minutes) in case LinkedIn structure changes
  setInterval(() => {
    if (currentKeywords.length > 0) {
      if (observer) {
        observer.disconnect();
      }
      observeNewPosts(currentKeywords);
    }
  }, 5 * 60 * 1000);
}

/**
 * Hide posts that contain any of the specified keywords
 * @param {string[]} keywords - Array of keywords to hide posts by
 */
function hidePosts(keywords) {
  if (!keywords || keywords.length === 0) return;

  // Find all post containers on LinkedIn feed
  const postSelectors = [
    'div[data-id*="activity"]',
    'div[class*="update-components-feed"]',
    '.feed-item',
    'div[class*="feed-item"]',
    'article',
  ];

  postSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((post) => {
      if (shouldHidePost(post, keywords)) {
        hidePost(post);
      }
    });
  });
}

/**
 * Check if a post should be hidden based on keywords
 * @param {HTMLElement} post - The post element
 * @param {string[]} keywords - Array of keywords
 * @returns {boolean} - True if post should be hidden
 */
function shouldHidePost(post, keywords) {
  // Skip if already hidden by this extension
  if (post.getAttribute('data-hidden-by-feed-customizer') === 'true') {
    return false;
  }

  // Get all text content from the post
  const textContent = post.textContent.toLowerCase();

  // Check if any keyword matches
  return keywords.some((keyword) => {
    if (!keyword.trim()) return false;
    return textContent.includes(keyword.toLowerCase());
  });
}

/**
 * Hide a post element
 * @param {HTMLElement} post - The post element to hide
 */
function hidePost(post) {
  // Skip if already hidden
  if (post.getAttribute('data-hidden-by-feed-customizer') === 'true') {
    return;
  }

  // Mark the post as hidden
  post.setAttribute('data-hidden-by-feed-customizer', 'true');

  // Hide the post
  post.style.display = 'none';

  // Increment counter and save
  hiddenCount++;
  chrome.storage.local.set({ hiddenCount });
}

/**
 * Observe DOM changes to hide new posts added via infinite scroll
 * @param {string[]} keywords - Array of keywords
 */
function observeNewPosts(keywords) {
  // Debounce mutations to avoid excessive processing
  let debounceTimeout;

  observer = new MutationObserver((mutations) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      // Use currentKeywords to always get the latest keywords
      if (currentKeywords.length === 0 || !currentEnabled) {
        return;
      }

      mutations.forEach((mutation) => {
        // Check if new nodes were added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            if (shouldHidePost(node, currentKeywords)) {
              hidePost(node);
            }

            // Check children of added node
            try {
              const childPosts = node.querySelectorAll(
                'div[data-id*="activity"], div[class*="update-components-feed"], .feed-item, article'
              );
              childPosts.forEach((post) => {
                if (shouldHidePost(post, currentKeywords)) {
                  hidePost(post);
                }
              });
            } catch (error) {
              console.error('Error querying child posts:', error);
            }
          }
        });
      });
    }, 100); // 100ms debounce
  });

  // Start observing the feed container
  const feedContainer = document.querySelector(
    'main, [role="main"], [class*="feed"]'
  );

  if (feedContainer) {
    observer.observe(feedContainer, {
      childList: true,
      subtree: true,
    });
  } else {
    // If no appropriate container found, log warning
    console.warn('LinkedIn Feed Customizer: Could not find feed container');
  }
}

// Listen for messages from popup to update keywords
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'updateKeywords') {
      currentKeywords = request.keywords || [];
      
      // Ensure observer is set up for new posts
      if (observer) {
        observer.disconnect();
      }
      observeNewPosts(currentKeywords);
      
      // Hide posts immediately
      if (currentEnabled && currentKeywords.length > 0) {
        hidePosts(currentKeywords);
      }
      
      sendResponse({ status: 'Keywords updated', hiddenCount });
    } else if (request.action === 'toggleEnabled') {
      currentEnabled = request.enabled;
      
      // Set up or tear down observer based on enabled state
      if (request.enabled && currentKeywords.length > 0) {
        if (observer) {
          observer.disconnect();
        }
        observeNewPosts(currentKeywords);
        hidePosts(currentKeywords);
      } else if (!request.enabled && observer) {
        observer.disconnect();
      }
      
      sendResponse({ status: 'Toggle updated', hiddenCount });
    } else if (request.action === 'getStats') {
      sendResponse({ hiddenCount, keywordCount: currentKeywords.length });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
});
