// Popup script - handles user interactions in the extension popup

const keywordInput = document.getElementById('keywordInput');
const addBtn = document.getElementById('addBtn');
const keywordsList = document.getElementById('keywordsList');
const toggleEnabled = document.getElementById('toggleEnabled');
const statsDiv = document.getElementById('stats');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

let keywords = [];

// Load keywords from storage when popup opens
document.addEventListener('DOMContentLoaded', loadKeywords);

/**
 * Load keywords from Chrome storage
 */
function loadKeywords() {
  chrome.storage.local.get(['keywords', 'isEnabled', 'hiddenCount'], (data) => {
    if (chrome.runtime.lastError) {
      showNotification('Failed to load settings', 'error');
      return;
    }
    keywords = data.keywords || [];
    toggleEnabled.checked = data.isEnabled !== false;
    updateStats(data.hiddenCount || 0);
    renderKeywords();
  });
}

/**
 * Update statistics display
 */
function updateStats(hiddenCount) {
  if (statsDiv) {
    statsDiv.innerHTML = `
      <div class="stat-icon">🔒</div>
      <div class="stat-content">
        <div class="stat-number">${hiddenCount}</div>
        <div class="stat-label">Posts Hidden</div>
      </div>
    `;
  }
}

/**
 * Show notification toast instead of alert
 */
function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f06960' : type === 'warning' ? '#ff9800' : '#0a66c2'};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Save keywords to Chrome storage
 */
function saveKeywords() {
  chrome.storage.local.set({
    keywords: keywords,
    isEnabled: toggleEnabled.checked,
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Storage error:', chrome.runtime.lastError);
    }
  });
}

/**
 * Add a keyword to the list
 */
function addKeyword() {
  const input = keywordInput.value.trim().toLowerCase(); // Normalize to lowercase

  if (!input) {
    showNotification('Please enter a keyword', 'warning');
    keywordInput.focus();
    return;
  }

  if (input.length > 100) {
    showNotification('Keyword too long (max 100 characters)', 'error');
    return;
  }

  if (keywords.length >= 50) {
    showNotification('Maximum 50 keywords reached', 'warning');
    return;
  }

  // Handle comma-separated keywords
  const newKeywords = input
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !keywords.includes(k)); // Dedupe

  if (newKeywords.length === 0) {
    showNotification('Keyword already exists', 'info');
    return;
  }

  keywords.push(...newKeywords);
  keywordInput.value = '';
  renderKeywords();
  saveKeywords();
  applyChanges();
  keywordInput.focus();
}

/**
 * Remove a keyword from the list
 * @param {string} keyword - The keyword to remove
 */
function removeKeyword(keyword) {
  keywords = keywords.filter((k) => k !== keyword);
  saveKeywords();
  renderKeywords();
  applyChanges(); // Auto-apply immediately
}
function renderKeywords() {
  if (keywords.length === 0) {
    keywordsList.innerHTML = '<p class="empty-state">Add keywords to start</p>';
    return;
  }

  keywordsList.innerHTML = keywords
    .map(
      (keyword) =>
        `
    <div class="keyword-item">
      <span class="keyword-text">${escapeHtml(keyword)}</span>
      <button class="btn-remove" data-keyword="${escapeHtml(keyword)}" title="Remove">×</button>
    </div>
  `
    )
    .join('');

  // Use event delegation instead of adding listeners to each button
  keywordsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
      const keyword = e.target.getAttribute('data-keyword');
      removeKeyword(keyword);
    }
  });
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Apply changes and send message to content script
 */
function applyChanges() {
  saveKeywords();

  // Get the active tab and send message to refresh
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;

    if (tabs[0].url && tabs[0].url.includes('linkedin.com')) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'updateKeywords',
          keywords: keywords,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Message error:', chrome.runtime.lastError);
            showNotification('Could not apply filter - refresh LinkedIn page', 'warning');
            return;
          }

          if (response && response.hiddenCount !== undefined) {
            updateStats(response.hiddenCount);
          }
        }
      );
    }
  });
}

/**
 * Export keywords to a JSON file
 */
function exportSettings() {
  const settings = {
    keywords,
    isEnabled: toggleEnabled.checked,
    exportDate: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(settings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lfc-settings-${new Date().getTime()}.json`;
  link.click();
  URL.revokeObjectURL(url);

  showNotification('Settings exported', 'info');
}

/**
 * Import keywords from a JSON file
 */
function importSettings(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const settings = JSON.parse(e.target.result);
      if (!Array.isArray(settings.keywords)) {
        throw new Error('Invalid settings file format');
      }

      keywords = settings.keywords || [];
      chrome.storage.local.set({
        keywords,
        isEnabled: settings.isEnabled !== false,
      }, () => {
        renderKeywords();
        toggleEnabled.checked = settings.isEnabled !== false;
        applyChanges();
        showNotification('Settings imported successfully', 'info');
      });
    } catch (error) {
      showNotification('Failed to import settings: ' + error.message, 'error');
    }
  };

  reader.readAsText(file);
  importFileInput.value = ''; // Reset input
}

/**
 * Handle toggle switch
 */
function handleToggle() {
  saveKeywords();
  applyChanges();
}

// Event listeners
addBtn.addEventListener('click', addKeyword);
toggleEnabled.addEventListener('change', handleToggle);
if (exportBtn) exportBtn.addEventListener('click', exportSettings);
if (importBtn) importBtn.addEventListener('click', () => importFileInput.click());
if (importFileInput) {
  importFileInput.addEventListener('change', (e) => {
    importSettings(e.target.files[0]);
  });
}

// Allow adding keyword with Enter key
keywordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addKeyword();
  }
});

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
