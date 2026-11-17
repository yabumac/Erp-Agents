/**
 * Persistent Storage Engine for yabutech47@gmail.com Mail Agent
 * Stores actual live email threads, parsed CSV contact audiences, and sent campaigns.
 * Strictly avoids fake demo data.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const defaultState = {
  account: {
    email: 'yabutech47@gmail.com',
    name: 'Yabsera',
    role: 'Tech Lead',
    status: 'connected',
    provider: 'Gmail API'
  },
  autoReply: {
    enabled: true,
    tone: 'professional',
    mode: 'suggest_first' // 'suggest_first' (ready to edit) or 'instant_auto'
  },
  threads: [],       // Actual incoming email threads
  contacts: [],      // Imported contacts from CSV uploads
  campaigns: [],     // Real bulk campaigns sent
  sentMessages: []   // Outbound sent log
};

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to load store, initializing default:', err.message);
  }
  saveState(defaultState);
  return defaultState;
}

function saveState(state) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save store:', err.message);
  }
}

module.exports = {
  loadState,
  saveState
};
