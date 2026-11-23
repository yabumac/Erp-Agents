/**
 * Unified Persistent Database Layer for EdTechHub Agent Platform
 * 
 * Storage Hierarchy:
 * 1. PostgreSQL (Neon, Vercel Postgres, Supabase, etc.) via DATABASE_URL or POSTGRES_URL
 * 2. In-Memory & Local JSON Store (data/voice_store.json locally, /tmp/voice_store.json on Vercel)
 * 
 * Manages:
 * - Contact Lists & Ethiopian Phone Numbers (+251...)
 * - Pre-recorded Voice Messages & Audio Assets
 * - Bulk & Single Voice Campaigns
 * - Real-time Call Progression & Outcome Tracking
 * - Unanswered / Missed Call Retries
 * - Activity Feed & Executive Dashboard Metrics
 * - Spreadsheet / CSV Export
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let Pool = null;
try {
  ({ Pool } = require('pg'));
} catch (e) {
  Pool = null;
}

const cleanEnv = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, '') : '');

function getPostgresUrl() {
  return (
    cleanEnv(process.env.DATABASE_URL) ||
    cleanEnv(process.env.POSTGRES_URL) ||
    cleanEnv(process.env.POSTGRES_PRISMA_URL) ||
    ''
  );
}

const LOCAL_DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(LOCAL_DATA_DIR, 'voice_store.json');
const AUDIO_DIR = path.join(LOCAL_DATA_DIR, 'voice_audio');

let pgPool = null;
let pgSchemaReady = false;
let pgInitPromise = null;
let lastDbError = null;

function getPool() {
  const connStr = getPostgresUrl();
  if (!connStr || !Pool) return null;
  if (!pgPool) {
    const isLocal = /localhost|127\.0\.0\.1/i.test(connStr) && !/sslmode=require/i.test(connStr);
    try {
      pgPool = new Pool({
        connectionString: connStr,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 8000
      });
      pgPool.on('error', (err) => {
        lastDbError = err.message;
        console.error('Postgres pool error:', err.message);
      });
    } catch (err) {
      console.error('Error creating PG pool:', err.message);
      pgPool = null;
    }
  }
  return pgPool;
}

async function ensurePgSchema() {
  if (pgSchemaReady) return true;
  if (pgInitPromise) return pgInitPromise;

  const pool = getPool();
  if (!pool) return false;

  pgInitPromise = (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS voice_contact_lists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS voice_contacts (
          id TEXT PRIMARY KEY,
          list_id TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          normalized_phone TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'Trainee',
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS voice_recordings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Course Reminder',
          description TEXT NOT NULL DEFAULT '',
          mime_type TEXT NOT NULL DEFAULT 'audio/mp3',
          audio_url TEXT NOT NULL DEFAULT '',
          audio_base64 TEXT NOT NULL DEFAULT '',
          duration_sec INTEGER NOT NULL DEFAULT 25,
          file_name TEXT NOT NULL DEFAULT '',
          size_bytes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS voice_campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          mode TEXT NOT NULL DEFAULT 'bulk',
          list_id TEXT NOT NULL DEFAULT '',
          list_name TEXT NOT NULL DEFAULT '',
          recording_id TEXT NOT NULL DEFAULT '',
          recording_title TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'completed',
          total_targets INTEGER NOT NULL DEFAULT 0,
          answered_count INTEGER NOT NULL DEFAULT 0,
          busy_count INTEGER NOT NULL DEFAULT 0,
          unanswered_count INTEGER NOT NULL DEFAULT 0,
          completed_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS voice_call_logs (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL DEFAULT '',
          contact_id TEXT NOT NULL DEFAULT '',
          contact_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          normalized_phone TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT '',
          list_name TEXT NOT NULL DEFAULT '',
          recording_id TEXT NOT NULL DEFAULT '',
          recording_title TEXT NOT NULL DEFAULT '',
          mode TEXT NOT NULL DEFAULT 'bulk',
          status TEXT NOT NULL DEFAULT 'completed',
          attempt INTEGER NOT NULL DEFAULT 1,
          duration_sec INTEGER NOT NULL DEFAULT 0,
          provider TEXT NOT NULL DEFAULT 'system_voice_engine',
          provider_call_id TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS activity_feed (
          id TEXT PRIMARY KEY,
          agent TEXT NOT NULL,
          event_type TEXT NOT NULL,
          title TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'info',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      pgSchemaReady = true;
      lastDbError = null;
      return true;
    } catch (err) {
      lastDbError = err.message;
      pgInitPromise = null;
      console.error('Database schema init error:', err.message);
      return false;
    }
  })();

  return pgInitPromise;
}

// Phone normalizer for Ethiopian and International mobile numbers
function normalizeEthiopianPhone(raw) {
  if (!raw) return '';
  let cleaned = String(raw).trim().replace(/[^\d+]/g, '');

  // Handle local Ethiopian formats (09..., 07..., 9..., 7...)
  if (/^09\d{8}$/.test(cleaned)) {
    return '+251' + cleaned.substring(1);
  }
  if (/^07\d{8}$/.test(cleaned)) {
    return '+251' + cleaned.substring(1);
  }
  if (/^9\d{8}$/.test(cleaned)) {
    return '+251' + cleaned;
  }
  if (/^7\d{8}$/.test(cleaned)) {
    return '+251' + cleaned;
  }
  if (/^251\d{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  if (/^\+251\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // International formats
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    return '+' + cleaned;
  }
  return cleaned;
}

// Initial Seed Data (Ethiopian Contacts, Recorded Audio Messages, Recent Activities)
function getInitialSeedData() {
  const seedLists = [
    {
      id: 'list-eth-cohort-1',
      name: 'Addis Ababa Trainees (Cohort 1)',
      description: 'Active students enrolled in Full Stack Cloud & AI Specialization',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'list-eth-faculty',
      name: 'Regional Educational Partners',
      description: 'Department heads and regional education coordinators across Ethiopia',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ];

  const seedContacts = [
    {
      id: 'c-100',
      listId: 'list-eth-cohort-1',
      name: 'Yabsera (Tech Lead)',
      phone: '+251711705055',
      normalizedPhone: '+251711705055',
      role: 'Tech Lead / Verified Caller',
      notes: 'Primary Verified Dispatch Mobile',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c-101',
      listId: 'list-eth-cohort-1',
      name: 'Abebe Kebede',
      phone: '+251911223344',
      normalizedPhone: '+251911223344',
      role: 'Software Trainee',
      notes: 'Addis Ababa Bole Campus',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'c-102',
      listId: 'list-eth-cohort-1',
      name: 'Bethlehem Tadesse',
      phone: '+251912345678',
      normalizedPhone: '+251912345678',
      role: 'Data Science Student',
      notes: 'AAiT Tech Hub',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'c-103',
      listId: 'list-eth-cohort-1',
      name: 'Dawit Haile',
      phone: '+251920556677',
      normalizedPhone: '+251920556677',
      role: 'Cloud Engineering Fellow',
      notes: 'Hawassa Branch',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'c-104',
      listId: 'list-eth-cohort-1',
      name: 'Meron Girma',
      phone: '+251930778899',
      normalizedPhone: '+251930778899',
      role: 'Trainee',
      notes: 'Addis Ababa 4 Kilo',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'c-105',
      listId: 'list-eth-cohort-1',
      name: 'Yohannes Bekele',
      phone: '+251944112233',
      normalizedPhone: '+251944112233',
      role: 'AI Ethics Trainee',
      notes: 'Adama Campus',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'c-106',
      listId: 'list-eth-faculty',
      name: 'Dr. Tesfaye Alemu',
      phone: '+251911889900',
      normalizedPhone: '+251911889900',
      role: 'Academic Director',
      notes: 'Addis Ababa University',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'c-107',
      listId: 'list-eth-faculty',
      name: 'Sara Mengistu',
      phone: '+251912998877',
      normalizedPhone: '+251912998877',
      role: 'Curriculum Head',
      notes: 'Ministry of Innovation & Tech',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ];

  const seedRecordings = [
    {
      id: 'rec-course-complete',
      title: 'Course Completion & Project Submission Reminder',
      category: 'Course Reminder',
      description: 'Voice message reminding trainees to complete modular coursework before Friday 5:00 PM.',
      mimeType: 'audio/wav',
      audioUrl: '/audio/voice_reminder_course.wav',
      audioBase64: '',
      durationSec: 28,
      fileName: 'voice_reminder_course.wav',
      sizeBytes: 32044,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'rec-training-alert',
      title: 'Practical Hands-on Workshop Announcement',
      category: 'Training Alert',
      description: 'Invitation to weekend in-person hackathon and cloud architecture lab session.',
      mimeType: 'audio/wav',
      audioUrl: '/audio/voice_training_alert.wav',
      audioBase64: '',
      durationSec: 34,
      fileName: 'voice_training_alert.wav',
      sizeBytes: 40044,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      id: 'rec-exam-prep',
      title: 'Certification Exam Portal Verification Notice',
      category: 'Exam Notice',
      description: 'Guidance on verifying student ID credentials prior to the certification window.',
      mimeType: 'audio/wav',
      audioUrl: '/audio/voice_exam_notice.wav',
      audioBase64: '',
      durationSec: 21,
      fileName: 'voice_exam_notice.wav',
      sizeBytes: 32044,
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
    }
  ];

  const seedCampaigns = [
    {
      id: 'camp-v101',
      name: 'Cohort 1 Coursework Completion Reminder',
      mode: 'bulk',
      listId: 'list-eth-cohort-1',
      listName: 'Addis Ababa Trainees (Cohort 1)',
      recordingId: 'rec-course-complete',
      recordingTitle: 'Course Completion & Project Submission Reminder',
      status: 'completed',
      totalTargets: 5,
      answeredCount: 4,
      busyCount: 0,
      unansweredCount: 1,
      completedCount: 4,
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 17).toISOString()
    }
  ];

  const seedCallLogs = [
    {
      id: 'call-001',
      campaignId: 'camp-v101',
      contactId: 'c-101',
      contactName: 'Abebe Kebede',
      phone: '+251911223344',
      normalizedPhone: '+251911223344',
      role: 'Software Trainee',
      listName: 'Addis Ababa Trainees (Cohort 1)',
      recordingId: 'rec-course-complete',
      recordingTitle: 'Course Completion & Project Submission Reminder',
      mode: 'bulk',
      status: 'completed',
      attempt: 1,
      durationSec: 28,
      provider: 'system_voice_engine',
      providerCallId: 'sim-call-901',
      notes: 'Listened to complete voice message. Call disconnected automatically upon audio completion.',
      calledAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      id: 'call-002',
      campaignId: 'camp-v101',
      contactId: 'c-102',
      contactName: 'Bethlehem Tadesse',
      phone: '+251912345678',
      normalizedPhone: '+251912345678',
      role: 'Data Science Student',
      listName: 'Addis Ababa Trainees (Cohort 1)',
      recordingId: 'rec-course-complete',
      recordingTitle: 'Course Completion & Project Submission Reminder',
      mode: 'bulk',
      status: 'completed',
      attempt: 1,
      durationSec: 28,
      provider: 'system_voice_engine',
      providerCallId: 'sim-call-902',
      notes: 'Listened to complete voice message. Call disconnected automatically upon audio completion.',
      calledAt: new Date(Date.now() - 3600000 * 18 + 12000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18 + 12000).toISOString()
    },
    {
      id: 'call-003',
      campaignId: 'camp-v101',
      contactId: 'c-103',
      contactName: 'Dawit Haile',
      phone: '+251920556677',
      normalizedPhone: '+251920556677',
      role: 'Cloud Engineering Fellow',
      listName: 'Addis Ababa Trainees (Cohort 1)',
      recordingId: 'rec-course-complete',
      recordingTitle: 'Course Completion & Project Submission Reminder',
      mode: 'bulk',
      status: 'unanswered',
      attempt: 1,
      durationSec: 0,
      provider: 'system_voice_engine',
      providerCallId: 'sim-call-903',
      notes: 'No answer after ringing. Flagged for automatic recall.',
      calledAt: new Date(Date.now() - 3600000 * 18 + 25000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18 + 25000).toISOString()
    },
    {
      id: 'call-004',
      campaignId: 'camp-v101',
      contactId: 'c-104',
      contactName: 'Meron Girma',
      phone: '+251930778899',
      normalizedPhone: '+251930778899',
      role: 'Trainee',
      listName: 'Addis Ababa Trainees (Cohort 1)',
      recordingId: 'rec-course-complete',
      recordingTitle: 'Course Completion & Project Submission Reminder',
      mode: 'bulk',
      status: 'completed',
      attempt: 1,
      durationSec: 28,
      provider: 'system_voice_engine',
      providerCallId: 'sim-call-904',
      notes: 'Listened to complete voice message. Call disconnected automatically upon audio completion.',
      calledAt: new Date(Date.now() - 3600000 * 18 + 38000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18 + 38000).toISOString()
    },
    {
      id: 'call-005',
      campaignId: 'camp-v101',
      contactId: 'c-105',
      contactName: 'Yohannes Bekele',
      phone: '+251944112233',
      normalizedPhone: '+251944112233',
      role: 'AI Ethics Trainee',
      listName: 'Addis Ababa Trainees (Cohort 1)',
      recordingId: 'rec-course-complete',
      recordingTitle: 'Course Completion & Project Submission Reminder',
      mode: 'bulk',
      status: 'completed',
      attempt: 1,
      durationSec: 28,
      provider: 'system_voice_engine',
      providerCallId: 'sim-call-905',
      notes: 'Listened to complete voice message. Call disconnected automatically upon audio completion.',
      calledAt: new Date(Date.now() - 3600000 * 18 + 50000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18 + 50000).toISOString()
    }
  ];

  const seedActivityFeed = [
    {
      id: 'act-101',
      agent: 'Voice Agent',
      eventType: 'campaign_dispatched',
      title: 'Bulk Voice Campaign Dispatched',
      detail: 'Broadcasted "Course Completion & Project Submission Reminder" to Addis Ababa Trainees (Cohort 1).',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      id: 'act-102',
      agent: 'Email Agent',
      eventType: 'inbox_synced',
      title: 'Live Gmail Messages Synchronized',
      detail: 'Retrieved 30 incoming messages for yabutech47@gmail.com with zero errors.',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'act-103',
      agent: 'Voice Agent',
      eventType: 'call_completed',
      title: 'Automated Voice Hangup',
      detail: 'Call with Abebe Kebede (+251911223344) completed. Audio finished and session closed cleanly.',
      status: 'info',
      createdAt: new Date(Date.now() - 3600000 * 17).toISOString()
    },
    {
      id: 'act-104',
      agent: 'Email Agent',
      eventType: 'ai_draft_generated',
      title: 'Automated Response Generated',
      detail: 'Drafted tailored corporate response for partner inquiry regarding academic syllabus.',
      status: 'info',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ];

  return {
    contactLists: seedLists,
    contacts: seedContacts,
    recordings: seedRecordings,
    campaigns: seedCampaigns,
    callLogs: seedCallLogs,
    activityFeed: seedActivityFeed
  };
}

// In-Memory Storage Cache backed by JSON File
let memoryStore = null;

function loadJsonStore() {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.contactLists) && parsed.contactLists.length > 0) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch (err) {
    console.warn('Notice loading voice store from disk:', err.message);
  }

  // Load Seed
  memoryStore = getInitialSeedData();
  saveJsonStore(memoryStore);
  return memoryStore;
}

function saveJsonStore(data) {
  memoryStore = data;
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write voice store:', err.message);
  }
}

// Public API Implementation with Postgres Sync & JSON Fallback
async function getDbStatus() {
  const connStr = getPostgresUrl();
  const pool = getPool();
  let pgConnected = false;
  if (connStr && pool) {
    try {
      await ensurePgSchema();
      const res = await pool.query('SELECT NOW() as now');
      pgConnected = Boolean(res && res.rows && res.rows.length);
    } catch (e) {
      pgConnected = false;
      lastDbError = e.message;
    }
  }

  return {
    provider: pgConnected ? 'PostgreSQL (Persistent Cloud)' : (process.env.VERCEL ? 'Vercel Serverless Memory' : 'Local File Store'),
    isPostgresConnected: pgConnected,
    hasPostgresConfig: Boolean(connStr),
    storageLocation: pgConnected ? 'Postgres Database' : STORE_FILE,
    lastError: lastDbError
  };
}

// Contact Lists
async function getContactLists() {
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      const res = await pool.query('SELECT * FROM voice_contact_lists ORDER BY created_at DESC');
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          createdAt: r.created_at
        }));
      }
    } catch (e) {
      console.warn('PG getContactLists fallback:', e.message);
    }
  }
  const store = loadJsonStore();
  return store.contactLists || [];
}

async function createContactList(name, description = '', initialContacts = []) {
  const id = 'list-' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const listObj = { id, name, description, createdAt: now };

  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        'INSERT INTO voice_contact_lists (id, name, description, created_at) VALUES ($1, $2, $3, $4)',
        [id, name, description, now]
      );
      for (const c of initialContacts) {
        const cId = 'c-' + crypto.randomBytes(4).toString('hex');
        const norm = normalizeEthiopianPhone(c.phone);
        await pool.query(
          'INSERT INTO voice_contacts (id, list_id, name, phone, normalized_phone, role, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [cId, id, c.name, c.phone, norm, c.role || 'Trainee', c.notes || '', now]
        );
      }
    } catch (e) {
      console.warn('PG createContactList fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  store.contactLists.unshift(listObj);

  const formattedContacts = initialContacts.map(c => ({
    id: 'c-' + crypto.randomBytes(4).toString('hex'),
    listId: id,
    name: c.name,
    phone: c.phone,
    normalizedPhone: normalizeEthiopianPhone(c.phone),
    role: c.role || 'Trainee',
    notes: c.notes || '',
    createdAt: now
  }));

  store.contacts.push(...formattedContacts);
  saveJsonStore(store);

  await addActivity({
    agent: 'Voice Agent',
    eventType: 'list_created',
    title: 'New Contact List Created',
    detail: `Created list "${name}" with ${initialContacts.length} contacts.`
  });

  return { list: listObj, contacts: formattedContacts };
}

// Contacts
async function getContacts(listId = null) {
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      let query = 'SELECT * FROM voice_contacts';
      const params = [];
      if (listId) {
        query += ' WHERE list_id = $1';
        params.push(listId);
      }
      query += ' ORDER BY created_at DESC';
      const res = await pool.query(query, params);
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          listId: r.list_id,
          name: r.name,
          phone: r.phone,
          normalizedPhone: r.normalized_phone,
          role: r.role,
          notes: r.notes,
          createdAt: r.created_at
        }));
      }
    } catch (e) {
      console.warn('PG getContacts fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  if (listId) {
    return store.contacts.filter(c => c.listId === listId);
  }
  return store.contacts || [];
}

async function addContact(contactData) {
  const id = 'c-' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const norm = normalizeEthiopianPhone(contactData.phone);
  const contact = {
    id,
    listId: contactData.listId,
    name: contactData.name,
    phone: contactData.phone,
    normalizedPhone: norm,
    role: contactData.role || 'Trainee',
    notes: contactData.notes || '',
    createdAt: now
  };

  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        'INSERT INTO voice_contacts (id, list_id, name, phone, normalized_phone, role, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, contact.listId, contact.name, contact.phone, norm, contact.role, contact.notes, now]
      );
    } catch (e) {
      console.warn('PG addContact fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  store.contacts.unshift(contact);
  saveJsonStore(store);
  return contact;
}

// Voice Recordings
async function getRecordings() {
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      const res = await pool.query('SELECT * FROM voice_recordings ORDER BY created_at DESC');
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          title: r.title,
          category: r.category,
          description: r.description,
          mimeType: r.mime_type,
          audioUrl: r.audio_url,
          audioBase64: r.audio_base64,
          durationSec: r.duration_sec,
          fileName: r.file_name,
          sizeBytes: r.size_bytes,
          createdAt: r.created_at
        }));
      }
    } catch (e) {
      console.warn('PG getRecordings fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  return store.recordings || [];
}

async function addRecording(recData) {
  const id = 'rec-' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const rec = {
    id,
    title: recData.title,
    category: recData.category || 'General Notice',
    description: recData.description || '',
    mimeType: recData.mimeType || 'audio/mp3',
    audioUrl: recData.audioUrl || `/api/voice/audio/${id}`,
    audioBase64: recData.audioBase64 || '',
    durationSec: Number(recData.durationSec) || 25,
    fileName: recData.fileName || `${id}.mp3`,
    sizeBytes: Number(recData.sizeBytes) || 0,
    createdAt: now
  };

  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        'INSERT INTO voice_recordings (id, title, category, description, mime_type, audio_url, audio_base64, duration_sec, file_name, size_bytes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [id, rec.title, rec.category, rec.description, rec.mimeType, rec.audioUrl, rec.audioBase64, rec.durationSec, rec.fileName, rec.sizeBytes, now]
      );
    } catch (e) {
      console.warn('PG addRecording fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  store.recordings.unshift(rec);
  saveJsonStore(store);

  await addActivity({
    agent: 'Voice Agent',
    eventType: 'recording_uploaded',
    title: 'Voice Recording Stored',
    detail: `Stored voice message "${rec.title}" (${rec.durationSec}s). Ready for bulk broadcast.`
  });

  return rec;
}

// Voice Campaigns
async function getCampaigns() {
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      const res = await pool.query('SELECT * FROM voice_campaigns ORDER BY created_at DESC');
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          name: r.name,
          mode: r.mode,
          listId: r.list_id,
          listName: r.list_name,
          recordingId: r.recording_id,
          recordingTitle: r.recording_title,
          status: r.status,
          totalTargets: r.total_targets,
          answeredCount: r.answered_count,
          busyCount: r.busy_count,
          unansweredCount: r.unanswered_count,
          completedCount: r.completed_count,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (e) {
      console.warn('PG getCampaigns fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  return store.campaigns || [];
}

async function createCampaign(campData) {
  const id = 'camp-' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const camp = {
    id,
    name: campData.name,
    mode: campData.mode || 'bulk',
    listId: campData.listId || '',
    listName: campData.listName || '',
    recordingId: campData.recordingId || '',
    recordingTitle: campData.recordingTitle || '',
    status: campData.status || 'in-progress',
    totalTargets: campData.totalTargets || 0,
    answeredCount: 0,
    busyCount: 0,
    unansweredCount: 0,
    completedCount: 0,
    createdAt: now,
    updatedAt: now
  };

  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        'INSERT INTO voice_campaigns (id, name, mode, list_id, list_name, recording_id, recording_title, status, total_targets, answered_count, busy_count, unanswered_count, completed_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
        [id, camp.name, camp.mode, camp.listId, camp.listName, camp.recordingId, camp.recordingTitle, camp.status, camp.totalTargets, 0, 0, 0, 0, now, now]
      );
    } catch (e) {
      console.warn('PG createCampaign fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  store.campaigns.unshift(camp);
  saveJsonStore(store);
  return camp;
}

async function updateCampaign(campaignId, updates) {
  const now = new Date().toISOString();
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        `UPDATE voice_campaigns SET 
          status = COALESCE($1, status),
          answered_count = COALESCE($2, answered_count),
          busy_count = COALESCE($3, busy_count),
          unanswered_count = COALESCE($4, unanswered_count),
          completed_count = COALESCE($5, completed_count),
          updated_at = $6
        WHERE id = $7`,
        [updates.status || null, updates.answeredCount || null, updates.busyCount || null, updates.unansweredCount || null, updates.completedCount || null, now, campaignId]
      );
    } catch (e) {
      console.warn('PG updateCampaign fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  const c = store.campaigns.find(item => item.id === campaignId);
  if (c) {
    Object.assign(c, updates, { updatedAt: now });
    saveJsonStore(store);
  }
}

// Call Logs
async function getCallLogs(campaignId = null) {
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      let query = 'SELECT * FROM voice_call_logs';
      const params = [];
      if (campaignId) {
        query += ' WHERE campaign_id = $1';
        params.push(campaignId);
      }
      query += ' ORDER BY called_at DESC LIMIT 200';
      const res = await pool.query(query, params);
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          campaignId: r.campaign_id,
          contactId: r.contact_id,
          contactName: r.contact_name,
          phone: r.phone,
          normalizedPhone: r.normalized_phone,
          role: r.role,
          listName: r.list_name,
          recordingId: r.recording_id,
          recordingTitle: r.recording_title,
          mode: r.mode,
          status: r.status,
          attempt: r.attempt,
          durationSec: r.duration_sec,
          provider: r.provider,
          providerCallId: r.provider_call_id,
          notes: r.notes,
          calledAt: r.called_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (e) {
      console.warn('PG getCallLogs fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  if (campaignId) {
    return (store.callLogs || []).filter(c => c.campaignId === campaignId);
  }
  return store.callLogs || [];
}

async function logCall(callData) {
  const id = 'call-' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const log = {
    id,
    callerId: callData.callerId || '+251711705055',
    campaignId: callData.campaignId || '',
    contactId: callData.contactId || '',
    contactName: callData.contactName || 'Direct Recipient',
    phone: callData.phone,
    normalizedPhone: normalizeEthiopianPhone(callData.phone),
    role: callData.role || 'Recipient',
    listName: callData.listName || 'Direct Call',
    recordingId: callData.recordingId || '',
    recordingTitle: callData.recordingTitle || '',
    mode: callData.mode || 'single',
    status: callData.status || 'completed',
    attempt: Number(callData.attempt) || 1,
    durationSec: Number(callData.durationSec) || 0,
    provider: callData.provider || 'system_voice_engine',
    providerCallId: callData.providerCallId || 'call-ref-' + Date.now(),
    notes: callData.notes || '',
    calledAt: now,
    updatedAt: now
  };

  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        'INSERT INTO voice_call_logs (id, campaign_id, contact_id, contact_name, phone, normalized_phone, role, list_name, recording_id, recording_title, mode, status, attempt, duration_sec, provider, provider_call_id, notes, called_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)',
        [id, log.campaignId, log.contactId, log.contactName, log.phone, log.normalizedPhone, log.role, log.listName, log.recordingId, log.recordingTitle, log.mode, log.status, log.attempt, log.durationSec, log.provider, log.providerCallId, log.notes, now, now]
      );
    } catch (e) {
      console.warn('PG logCall fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  if (!store.callLogs) store.callLogs = [];
  store.callLogs.unshift(log);
  saveJsonStore(store);
  return log;
}

// Activity Feed
async function getActivityFeed(limit = 20) {
  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      const res = await pool.query('SELECT * FROM activity_feed ORDER BY created_at DESC LIMIT $1', [limit]);
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          agent: r.agent,
          eventType: r.event_type,
          title: r.title,
          detail: r.detail,
          status: r.status,
          createdAt: r.created_at
        }));
      }
    } catch (e) {
      console.warn('PG getActivityFeed fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  return (store.activityFeed || []).slice(0, limit);
}

async function addActivity({ agent = 'Voice Agent', eventType = 'event', title, detail = '', status = 'info' }) {
  const id = 'act-' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const act = { id, agent, eventType, title, detail, status, createdAt: now };

  const pool = getPool();
  if (pool && await ensurePgSchema()) {
    try {
      await pool.query(
        'INSERT INTO activity_feed (id, agent, event_type, title, detail, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, agent, eventType, title, detail, status, now]
      );
    } catch (e) {
      console.warn('PG addActivity fallback:', e.message);
    }
  }

  const store = loadJsonStore();
  if (!store.activityFeed) store.activityFeed = [];
  store.activityFeed.unshift(act);
  if (store.activityFeed.length > 100) store.activityFeed.length = 100;
  saveJsonStore(store);
  return act;
}

// Dashboard Aggregates
async function getDashboardStats() {
  const store = loadJsonStore();
  const calls = store.callLogs || [];
  const campaigns = store.campaigns || [];
  const contacts = store.contacts || [];

  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.status === 'completed' || c.status === 'answered').length;
  const unansweredCalls = calls.filter(c => c.status === 'unanswered' || c.status === 'no-answer').length;
  const busyCalls = calls.filter(c => c.status === 'busy' || c.status === 'rejected').length;
  const completionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 100;

  return {
    voice: {
      callerId: '+251711705055',
      callerName: 'Yabsera (Tech Lead)',
      totalCampaigns: campaigns.length,
      totalCalls: totalCalls,
      completedCalls: completedCalls,
      unansweredCalls: unansweredCalls,
      busyCalls: busyCalls,
      completionRate: completionRate,
      activeContacts: contacts.length
    },
    activity: (store.activityFeed || []).slice(0, 8),
    recentCalls: calls.slice(0, 6)
  };
}

// CSV Export for Voice Campaign Logs
function exportCallLogsCsv(callLogs) {
  const headers = [
    'Call ID',
    'Campaign Name',
    'Caller ID (From)',
    'Recipient Name',
    'Phone Number',
    'Normalized Phone',
    'Role',
    'Contact List',
    'Voice Message Title',
    'Call Mode',
    'Status',
    'Attempt',
    'Duration (Seconds)',
    'Provider',
    'Timestamp',
    'Notes'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = [headers.join(',')];
  for (const c of callLogs) {
    rows.push([
      escapeCsv(c.id),
      escapeCsv(c.campaignId || 'Direct Dial'),
      escapeCsv(c.callerId || '+251711705055'),
      escapeCsv(c.contactName),
      escapeCsv(c.phone),
      escapeCsv(c.normalizedPhone),
      escapeCsv(c.role),
      escapeCsv(c.listName),
      escapeCsv(c.recordingTitle),
      escapeCsv(c.mode),
      escapeCsv(c.status),
      escapeCsv(c.attempt),
      escapeCsv(c.durationSec),
      escapeCsv(c.provider),
      escapeCsv(c.calledAt),
      escapeCsv(c.notes)
    ].join(','));
  }

  return rows.join('\r\n');
}

async function getTelephonySettings() {
  const store = loadJsonStore();
  return store.telephonySettings || {
    mode: 'free_web_engine',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    callerId: '+251711705055'
  };
}

async function saveTelephonySettings(settings) {
  const store = loadJsonStore();
  store.telephonySettings = {
    mode: settings.mode || 'free_web_engine',
    twilioAccountSid: (settings.twilioAccountSid || '').trim(),
    twilioAuthToken: (settings.twilioAuthToken || '').trim(),
    twilioPhoneNumber: (settings.twilioPhoneNumber || '').trim(),
    callerId: (settings.callerId || '+251711705055').trim()
  };
  saveJsonStore(store);
  return store.telephonySettings;
}

module.exports = {
  loadJsonStore,
  saveJsonStore,
  getTelephonySettings,
  saveTelephonySettings,
  getDbStatus,
  normalizeEthiopianPhone,
  getContactLists,
  createContactList,
  getContacts,
  addContact,
  getRecordings,
  addRecording,
  getCampaigns,
  createCampaign,
  updateCampaign,
  getCallLogs,
  logCall,
  getActivityFeed,
  addActivity,
  getDashboardStats,
  exportCallLogsCsv
};
