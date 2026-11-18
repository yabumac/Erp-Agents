/**
 * Native Google OAuth2 & Gmail API Client
 * Uses Node.js 18+ native fetch and crypto (no external dependencies required).
 * Handles token exchange, refresh, thread fetching, and message sending.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const AUTH_FILE = path.join(AUTH_DIR, 'auth.json');
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.modify'
].join(' ');

const cleanEnv = (val) => val ? String(val).trim().replace(/^["']|["']$/g, '') : '';

function getStoredAuth() {
  let fileData = {};
  try {
    if (fs.existsSync(AUTH_FILE)) {
      fileData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading auth file:', e.message);
  }
  return {
    clientId: cleanEnv(process.env.GOOGLE_CLIENT_ID) || fileData.clientId || '',
    clientSecret: cleanEnv(process.env.GOOGLE_CLIENT_SECRET) || fileData.clientSecret || '',
    refreshToken: cleanEnv(process.env.GOOGLE_REFRESH_TOKEN) || fileData.refreshToken || '',
    accessToken: fileData.accessToken || '',
    tokenExpiresAt: fileData.tokenExpiresAt || 0,
    email: 'yabutech47@gmail.com'
  };
}

function saveStoredAuth(data) {
  try {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    const current = getStoredAuth();
    const updated = { ...current, ...data };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (e) {
    console.error('Error saving auth file:', e.message);
    return null;
  }
}

function getRedirectUri(req) {
  if (process.env.APP_URL) {
    return `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/callback`;
  }
  const host = req ? req.headers.host : 'localhost:3002';
  const protocol = (req && req.headers['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}/api/auth/callback`;
}

function getAuthUrl(req) {
  const auth = getStoredAuth();
  if (!auth.clientId) return null;

  const redirectUri = getRedirectUri(req);
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: auth.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state: state
  };
}

async function exchangeCodeForTokens(code, req) {
  const auth = getStoredAuth();
  const redirectUri = getRedirectUri(req);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  const expiresAt = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;
  saveStoredAuth({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || auth.refreshToken,
    tokenExpiresAt: expiresAt
  });

  return data;
}

async function getValidAccessToken() {
  const auth = getStoredAuth();
  if (auth.accessToken && auth.tokenExpiresAt > Date.now()) {
    return auth.accessToken;
  }

  if (!auth.refreshToken) {
    return null;
  }

  // Refresh access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      refresh_token: auth.refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Failed to refresh token:', data);
    return null;
  }

  const expiresAt = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;
  saveStoredAuth({
    accessToken: data.access_token,
    tokenExpiresAt: expiresAt
  });

  return data.access_token;
}

function decodeBase64Url(str) {
  if (!str) return '';
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts && payload.parts.length) {
    // Try text/plain first
    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64Url(plainPart.body.data);
    }
    // Try text/html
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return decodeBase64Url(htmlPart.body.data).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    }
    // Recursive search
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return '';
}

async function fetchRealThreads(maxResults = 25) {
  const token = await getValidAccessToken();
  if (!token) {
    return { authenticated: false, threads: [] };
  }

  try {
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}&q=in:inbox`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!listRes.ok) {
      const errData = await listRes.json();
      return { authenticated: false, error: errData.error && errData.error.message, threads: [] };
    }

    const listData = await listRes.json();
    const threadItems = listData.threads || [];
    if (!threadItems.length) {
      return { authenticated: true, threads: [] };
    }

    // Fetch details for each thread
    const threads = await Promise.all(threadItems.map(async (t) => {
      try {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=full`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();
        const messages = detail.messages || [];
        const latest = messages[messages.length - 1] || {};
        const headers = (latest.payload && latest.payload.headers) || [];

        const getHeader = (name) => {
          const h = headers.find(x => x.name.toLowerCase() === name.toLowerCase());
          return h ? h.value : '';
        };

        const fromHeader = getHeader('from');
        const subjectHeader = getHeader('subject') || '(No Subject)';
        const dateHeader = getHeader('date');

        let senderName = fromHeader;
        let senderEmail = fromHeader;
        const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
        if (match) {
          senderName = match[1].replace(/["']/g, '').trim() || match[2];
          senderEmail = match[2].trim();
        }

        const body = extractBody(latest.payload) || latest.snippet || '';

        return {
          id: t.id,
          messageId: latest.id,
          from: senderEmail,
          senderName: senderName,
          subject: subjectHeader,
          snippet: latest.snippet || body.substring(0, 100),
          body: body,
          date: dateHeader ? new Date(dateHeader).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent',
          rawDate: dateHeader,
          status: 'unread'
        };
      } catch (err) {
        return null;
      }
    }));

    return {
      authenticated: true,
      threads: threads.filter(Boolean)
    };
  } catch (err) {
    console.error('Error fetching Gmail threads:', err);
    return { authenticated: false, error: err.message, threads: [] };
  }
}

async function sendRealMessage({ to, subject, htmlBody, inReplyTo, references }) {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const boundary = 'bnd_' + crypto.randomBytes(8).toString('hex');
  const headers = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ];

  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  const textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rawMime = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(textBody, 'utf8').toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody, 'utf8').toString('base64'),
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const rawBase64Url = Buffer.from(rawMime, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawBase64Url })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error && data.error.message) || 'Failed to send message via Gmail API');
  }

  return data;
}

module.exports = {
  getStoredAuth,
  saveStoredAuth,
  getRedirectUri,
  getAuthUrl,
  exchangeCodeForTokens,
  getValidAccessToken,
  fetchRealThreads,
  sendRealMessage
};
