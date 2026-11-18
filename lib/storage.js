/**
 * Persistent Storage Engine for yabutech47@gmail.com Mail Agent
 * Stores actual live email threads, parsed CSV contact audiences, and sent campaigns.
 * Strictly avoids fake demo data.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const INITIAL_STATE_FILE = path.join(__dirname, '..', 'config', 'initial-state.json');
const LOCAL_STORE_FILE = path.join(__dirname, '..', 'data', 'store.json');

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
    mode: 'suggest_first'
  },
  threads: [],
  contacts: [],
  campaigns: [],
  sentMessages: []
};

function getSeedState() {
  try {
    if (fs.existsSync(INITIAL_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(INITIAL_STATE_FILE, 'utf8'));
    }
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading seed state:', e.message);
  }
  return defaultState;
}

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.threads) && parsed.threads.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load store:', err.message);
  }

  const seed = getSeedState();
  saveState(seed);
  return seed;
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
