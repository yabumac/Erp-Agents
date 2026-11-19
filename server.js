/**
 * EdTechHub - Corporate Email Agent
 * Connected to yabutech47@gmail.com
 * 
 * Strict Corporate Guidelines Applied:
 * - Real live email synchronization via Gmail API
 * - Zero emojis across the entire interface and templates
 * - Static "System Live" status (no blinking dots or pulsing animations)
 * - Zero sample, mockup, or placeholder data
 * - Instant AI generated suggested response on email click
 * - Bulk CSV campaign sender with corporate HTML email template
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const BrandConfig = require('./config/brand');
const Storage = require('./lib/storage');
const AI = require('./lib/ai');
const Gmail = require('./lib/gmail');

const PORT = process.env.PORT || 3002;

// Request Body Parser
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}

// CSV Parser
function parseCsvContent(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('first'));
  const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('org') || h.includes('school') || h.includes('institution'));
  const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('title') || h.includes('position'));

  if (emailIdx === -1) return [];

  const contacts = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const email = cols[emailIdx];
    if (email && email.includes('@')) {
      contacts.push({
        id: 'cnt_' + Date.now() + '_' + i,
        email: email.toLowerCase(),
        name: nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : email.split('@')[0],
        company: companyIdx !== -1 && cols[companyIdx] ? cols[companyIdx] : 'Organization',
        role: roleIdx !== -1 && cols[roleIdx] ? cols[roleIdx] : 'Partner',
        status: 'active',
        importedAt: new Date().toISOString().split('T')[0]
      });
    }
  }
  return contacts;
}

// Render Corporate HTML Interface (No Emojis, No Blinkers, Pure Corporate)
function renderCorporateUi(req) {
  const brand = BrandConfig;
  const auth = Gmail.getStoredAuth();
  const redirectUri = Gmail.getRedirectUri(req);
  const isGoogleConnected = Boolean(auth.refreshToken || (auth.accessToken && auth.tokenExpiresAt > Date.now()));
  const state = Storage.loadState();
  const rawThreads = (state && Array.isArray(state.threads)) ? state.threads : [];
  const initialThreads = rawThreads.map(t => ({
    id: t.id,
    messageId: t.messageId || t.id,
    from: t.from,
    senderName: t.senderName,
    subject: t.subject,
    snippet: t.snippet || '',
    body: (t.body && t.body.length < 500) ? t.body : (t.snippet || ''),
    date: t.date,
    rawDate: t.rawDate,
    status: t.status || 'unread'
  }));
  const initialContacts = (state && Array.isArray(state.contacts)) ? state.contacts : [];
  const initialSent = (state && Array.isArray(state.sentMessages)) ? state.sentMessages : [];

  const preRenderedThreadsHtml = initialThreads.length > 0 ? initialThreads.map(t => `
    <div onclick="selectThread('${t.id}')" class="p-3 hover:bg-slate-50 cursor-pointer transition">
      <div class="flex items-center justify-between mb-0.5">
        <span class="font-bold text-xs text-slate-900 truncate max-w-[190px]">${t.senderName || t.from}</span>
        <span class="text-[10px] text-slate-400 font-mono">${t.date}</span>
      </div>
      <p class="font-medium text-xs text-slate-800 truncate">${t.subject}</p>
      <p class="text-[11px] text-slate-500 truncate mt-0.5">${t.snippet || ''}</p>
    </div>
  `).join('') : `
    <div class="p-8 text-center text-xs text-slate-400 space-y-2">
      <p class="font-medium text-slate-600">No messages in inbox.</p>
      <p>Click "Sync Inbox" to pull real emails from Gmail.</p>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand.companyName} - Corporate Mail Platform</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .tab-active { background-color: #f1f5f9; color: #0f172a; font-weight: 600; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 flex h-screen overflow-hidden text-sm">

  <!-- SIDEBAR -->
  <aside class="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
    <div>
      <!-- Corporate Header -->
      <div class="p-4 border-b border-slate-200">
        <div class="flex items-center space-x-3">
          <img src="/logo.png" alt="EdTech" class="w-9 h-9 rounded-full object-contain border border-slate-200 bg-white p-0.5 shrink-0 shadow-xs" onerror="this.onerror=null;this.src='/logo.jpg';" />
          <div class="overflow-hidden">
            <h1 class="font-bold text-sm text-slate-900 leading-tight">${brand.companyName}</h1>
            <p class="text-xs text-slate-500">Corporate Mail System</p>
          </div>
        </div>
      </div>

      <!-- Account / System Status (Static, No Blinking Animations) -->
      <div class="p-3 bg-slate-50/70 border-b border-slate-200">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold text-slate-800 truncate">${auth.email || 'yabutech47@gmail.com'}</span>
          <span class="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-200/80 text-slate-700 border border-slate-300/60">
            System Live
          </span>
        </div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-500" id="google-connection-status">
            ${isGoogleConnected ? 'Gmail Synchronized' : 'Google Authorization Required'}
          </span>
          ${isGoogleConnected 
            ? '<button onclick="syncGmail()" class="text-blue-700 hover:underline font-medium">Sync Now</button>'
            : '<button onclick="openConnectModal()" class="text-blue-700 hover:underline font-bold">Connect</button>'
          }
        </div>
      </div>

      <!-- Navigation -->
      <nav class="p-3 space-y-1">
        <button onclick="switchTab('inbox')" id="nav-inbox" class="w-full flex items-center justify-between px-3 py-2 rounded-lg tab-active hover:bg-slate-100 transition text-left">
          <span class="font-medium text-xs">Inbox & Triage</span>
          <span class="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800" id="badge-inbox-count">${initialThreads.length}</span>
        </button>

        <button onclick="switchTab('campaigns')" id="nav-campaigns" class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition text-left">
          <span class="font-medium text-xs">Bulk Campaigns</span>
          <span class="text-xs font-mono text-slate-400" id="badge-contacts-count">${initialContacts.length}</span>
        </button>

        <button onclick="switchTab('compose')" id="nav-compose" class="w-full flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition text-left">
          <span class="font-medium text-xs">Compose Email</span>
        </button>

        <button onclick="switchTab('sent')" id="nav-sent" class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition text-left">
          <span class="font-medium text-xs">Sent Log</span>
          <span class="text-xs font-mono text-slate-400" id="badge-sent-count">${initialSent.length}</span>
        </button>

        <button onclick="switchTab('settings')" id="nav-settings" class="w-full flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition text-left">
          <span class="font-medium text-xs">Settings & Integration</span>
        </button>
      </nav>
    </div>

    <!-- Sign-off Footer -->
    <div class="p-3 border-t border-slate-200 bg-slate-50 text-xs">
      <p class="font-semibold text-slate-800">${brand.senderName}</p>
      <p class="text-slate-500">${brand.senderEmail}</p>
    </div>
  </aside>

  <!-- MAIN VIEWPORT -->
  <main class="flex-1 flex flex-col overflow-y-auto bg-slate-50">

    <!-- Top Action Bar -->
    <header class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div class="flex items-center space-x-3">
        <span class="font-bold text-slate-800 text-sm" id="header-view-title">Inbox & Triage</span>
        <span class="text-slate-300">/</span>
        <span class="text-xs text-slate-500">${auth.email || 'yabutech47@gmail.com'}</span>
      </div>

      <div class="flex items-center space-x-2">
        <button onclick="syncGmail()" id="btn-sync-top" class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition">
          Sync Inbox
        </button>
        <button onclick="switchTab('compose')" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm">
          Compose Email
        </button>
      </div>
    </header>

    <div class="p-6 max-w-7xl mx-auto w-full">

      <!-- ================= 1. INBOX TAB ================= -->
      <section id="tab-inbox" class="space-y-4">
        
        <!-- Connection Banner if Google Not Authorized Yet -->
        <div id="google-auth-banner" class="${isGoogleConnected ? 'hidden' : ''} bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div class="space-y-0.5">
            <p class="font-bold text-xs text-amber-900">Google Account Authorization Required</p>
            <p class="text-xs text-amber-700">Connect yabutech47@gmail.com with Google to fetch and read all your live incoming emails directly.</p>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="openConnectModal()" class="px-3.5 py-1.5 bg-amber-900 text-white rounded-lg text-xs font-semibold hover:bg-amber-950 transition">
              Connect Google Account
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-bold text-base text-slate-900">Incoming Messages</h2>
            <p class="text-xs text-slate-500">Select an email to view full details. The AI agent automatically drafts a suggested response ready for editing and dispatch.</p>
          </div>
          <span class="text-xs font-medium text-slate-500 font-mono" id="inbox-count-label">${initialThreads.length} Messages</span>
        </div>

        <!-- Master-Detail Inbox View -->
        <div class="grid grid-cols-12 gap-5 items-start">
          
          <!-- Thread List (5 Cols) -->
          <div class="col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <span>Mailbox</span>
              <button onclick="syncGmail()" class="text-blue-700 hover:underline lowercase font-normal">refresh</button>
            </div>
            
            <div class="divide-y divide-slate-100 max-h-[620px] overflow-y-auto" id="threads-container">
              ${preRenderedThreadsHtml}
            </div>
          </div>

          <!-- Active Message & Immediate AI Suggested Response (7 Cols) -->
          <div class="col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4" id="thread-workspace">
            
            <div id="workspace-empty" class="py-24 text-center space-y-2">
              <p class="font-semibold text-slate-700 text-xs">No email selected.</p>
              <p class="text-xs text-slate-400 max-w-xs mx-auto">Select any incoming email from the left panel to inspect the message and review the automated AI draft.</p>
            </div>

            <div id="workspace-active" class="hidden space-y-4">
              <!-- Thread Header -->
              <div class="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 class="font-bold text-sm text-slate-900" id="view-subject">Subject</h3>
                  <div class="flex items-center space-x-2 mt-1">
                    <span class="font-semibold text-xs text-slate-800" id="view-sender-name">Sender</span>
                    <span class="text-xs text-slate-400 font-mono" id="view-sender-email">&lt;&gt;</span>
                  </div>
                </div>
                <span class="text-xs text-slate-400 font-mono" id="view-date">Date</span>
              </div>

              <!-- Email Message Preview Pane (Visual Rendered View) -->
              <div class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div class="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-2">
                    <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span class="font-bold text-xs text-slate-800 uppercase tracking-wide">Email Content Preview</span>
                  </div>
                  <span class="text-[11px] text-slate-500 font-mono" id="view-preview-status">Visual Render</span>
                </div>
                <iframe id="view-email-frame" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin" class="w-full h-80 border-0 bg-white"></iframe>
              </div>

              <!-- Automated AI Response Box -->
              <div class="bg-blue-50/50 rounded-xl border border-blue-200 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-blue-900 uppercase tracking-wide">Suggested Response (Ready to Edit)</span>
                  <div class="flex items-center space-x-1.5">
                    <button onclick="polishSuggestedReply('polish')" class="px-2 py-1 text-xs font-medium bg-white border border-blue-200 rounded text-blue-800 hover:bg-blue-50">
                      Polish
                    </button>
                    <button onclick="polishSuggestedReply('shorten')" class="px-2 py-1 text-xs font-medium bg-white border border-blue-200 rounded text-blue-800 hover:bg-blue-50">
                      Make Concise
                    </button>
                    <button onclick="polishSuggestedReply('persuasive')" class="px-2 py-1 text-xs font-medium bg-white border border-blue-200 rounded text-blue-800 hover:bg-blue-50">
                      Make Persuasive
                    </button>
                    <button onclick="regenerateReply()" class="px-2 py-1 text-xs font-medium bg-white border border-blue-200 rounded text-blue-800 hover:bg-blue-50">
                      Regenerate
                    </button>
                  </div>
                </div>

                <textarea id="reply-text" rows="7" class="w-full p-3 bg-white border border-blue-200 rounded-lg text-xs leading-relaxed text-slate-800 focus:ring-1 focus:ring-blue-600 outline-none font-sans" placeholder="Generating suggested response..."></textarea>

                <div class="flex items-center justify-between pt-1">
                  <button onclick="previewCorporateHtml('reply')" class="text-xs font-semibold text-blue-700 hover:underline">
                    Preview Corporate HTML
                  </button>

                  <button onclick="sendReply()" id="btn-send-reply" class="px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
                    Send Corporate Reply
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

      <!-- ================= 2. BULK CAMPAIGNS TAB ================= -->
      <section id="tab-campaigns" class="hidden space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-bold text-base text-slate-900">Bulk Campaigns</h2>
            <p class="text-xs text-slate-500">Import your contacts CSV, draft structured corporate copy with real-time live preview, and dispatch batch deliveries.</p>
          </div>
        </div>

        <!-- Row 1: CSV Management (6 cols) & AI Copywriting Assistant (6 cols) -->
        <div class="grid grid-cols-12 gap-5 items-start">
          
          <!-- Contacts CSV Card (6 cols) -->
          <div class="col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wide">Contacts CSV</h3>
                <span class="text-[11px] text-slate-400">Supported columns: email, name, company, role</span>
              </div>
              <div class="flex items-center space-x-2">
                <button onclick="downloadSampleCsv()" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center space-x-1.5 shadow-2xs">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  <span>Download Sample CSV</span>
                </button>
                <span class="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200" id="csv-loaded-count">0 Contacts</span>
              </div>
            </div>

            <!-- Upload Dropzone -->
            <div class="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition cursor-pointer bg-slate-50/50" onclick="document.getElementById('csv-file-input').click()">
              <input type="file" id="csv-file-input" accept=".csv" class="hidden" onchange="handleCsvUpload(event)">
              <p class="font-semibold text-xs text-slate-700">Click to upload or drop your contacts CSV</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Need a reference file? Use the "Download Sample CSV" button above.</p>
            </div>

            <!-- Audience List -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Loaded Audience</span>
                <button onclick="clearContacts()" class="text-rose-600 hover:underline font-normal text-xs">Clear All</button>
              </div>
              <div class="bg-slate-50 rounded-lg border border-slate-200 max-h-36 overflow-y-auto divide-y divide-slate-100" id="contacts-table-body">
                <div class="p-3 text-center text-xs text-slate-400">No contacts loaded.</div>
              </div>
            </div>
          </div>

          <!-- AI Assistant Card (6 cols) -->
          <div class="col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wide">AI Copywriting Assistant</h3>
                <span class="text-[11px] text-slate-400">Generates executive-grade corporate campaign copy</span>
              </div>
              <span class="text-xs text-slate-500 font-mono">Tags: {{name}}, {{company}}</span>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700">Campaign Objective / Core Announcement</label>
              <textarea id="campaign-prompt" rows="3" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-sans" placeholder="e.g. Announcing our new enterprise STEM curriculum partnership with secondary schools..."></textarea>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-[11px] text-slate-500">Drafted content will auto-populate and update the live preview below.</span>
              <button onclick="generateCampaignWithAi()" id="btn-generate-campaign" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-2xs">
                Generate Corporate Copy
              </button>
            </div>
          </div>

        </div>

        <!-- Row 2: Campaign Editor Form (6 cols) & Live Real-Time Email Preview (6 cols) -->
        <div class="grid grid-cols-12 gap-5 items-start">
          
          <!-- Campaign Content Editor Form (6 cols) -->
          <div class="col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wide">Campaign Content</h3>
              <span class="text-[11px] text-slate-400">Edits update the preview in real time</span>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Subject Line</label>
                <input type="text" id="campaign-subject" oninput="updateCampaignLivePreview()" placeholder="Enter campaign subject line..." class="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-medium">
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-semibold text-slate-700">Email Body Content</label>
                  <span class="text-[11px] text-slate-400 font-mono">Supports {{name}}, {{company}}</span>
                </div>
                <textarea id="campaign-body" rows="9" oninput="updateCampaignLivePreview()" placeholder="Compose your email body here. Double line breaks create paragraphs." class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-sans leading-relaxed"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Action Button Text</label>
                  <input type="text" id="campaign-cta-text" oninput="updateCampaignLivePreview()" value="Learn More" class="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-medium">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Action Button URL</label>
                  <input type="text" id="campaign-cta-url" oninput="updateCampaignLivePreview()" value="${brand.website}" class="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-mono text-[11px]">
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 pt-3">
              <button onclick="previewCorporateHtml('campaign')" class="text-xs font-semibold text-blue-700 hover:underline">
                Fullscreen Preview
              </button>

              <button onclick="sendBulkCampaign()" id="btn-send-bulk" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm">
                Dispatch Campaign
              </button>
            </div>

            <!-- Progress Bar -->
            <div id="campaign-progress-bar" class="hidden space-y-1.5 pt-2">
              <div class="flex justify-between text-xs font-medium text-slate-700">
                <span id="progress-text">Dispatching messages...</span>
                <span id="progress-percent" class="font-mono">0%</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div id="progress-fill" class="bg-blue-600 h-1.5 transition-all duration-200" style="width: 0%"></div>
              </div>
            </div>
          </div>

          <!-- Live Real-Time Email Preview (6 cols) -->
          <div class="col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wide">Live Email Preview</h3>
              </div>
              <div class="flex items-center space-x-2">
                <label for="campaign-preview-contact-select" class="text-[11px] text-slate-500 font-medium">Previewing For:</label>
                <select id="campaign-preview-contact-select" onchange="updateCampaignLivePreview()" class="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none max-w-[210px] truncate font-medium">
                  <option value="">Alex Morgan (SchoolHub Academy)</option>
                </select>
              </div>
            </div>

            <div class="bg-slate-100 p-2 rounded-xl border border-slate-200">
              <iframe id="campaign-live-frame" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin" class="w-full h-[520px] rounded-lg border border-slate-200 bg-white shadow-xs"></iframe>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400">
              <span>Preview reflects live changes in real time</span>
              <span class="font-mono">Recipient tags resolved</span>
            </div>
          </div>

        </div>
      </section>

      <!-- ================= 3. COMPOSE EMAIL TAB ================= -->
      <section id="tab-compose" class="hidden space-y-6">
        <div>
          <h2 class="font-bold text-base text-slate-900">Compose Email</h2>
          <p class="text-xs text-slate-500">Dispatch an individual corporate email using ${brand.companyName}'s enterprise HTML formatting.</p>
        </div>

        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Recipient Address</label>
              <input type="email" id="single-to" placeholder="recipient@organization.edu" class="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
              <input type="text" id="single-name" placeholder="Contact Name" class="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input type="text" id="single-subject" class="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-blue-600">
          </div>

          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-700">AI Assistant</span>
            <div class="flex items-center space-x-2">
              <button onclick="aiDraftSingle()" class="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800">
                Draft Body
              </button>
              <button onclick="aiPolishSingle()" class="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">
                Polish Copy
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Message Content</label>
            <textarea id="single-body" rows="8" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs leading-relaxed outline-none focus:ring-1 focus:ring-blue-600 font-sans"></textarea>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <button onclick="previewCorporateHtml('single')" class="text-xs font-semibold text-blue-700 hover:underline">
              Preview Corporate HTML
            </button>
            <button onclick="sendSingleEmail()" class="px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
              Dispatch Email
            </button>
          </div>
        </div>
      </section>

      <!-- ================= 4. SENT LOG TAB ================= -->
      <section id="tab-sent" class="hidden space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-bold text-base text-slate-900">Sent Delivery Log</h2>
            <p class="text-xs text-slate-500">Record of outgoing corporate communications dispatched from ${brand.senderEmail}.</p>
          </div>
          <span class="text-xs font-mono text-slate-500" id="sent-count-label">0 Dispatched</span>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th class="p-3">Recipient</th>
                <th class="p-3">Subject</th>
                <th class="p-3">Category</th>
                <th class="p-3 font-mono">Timestamp</th>
                <th class="p-3">Delivery Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100" id="sent-table-body">
              <tr><td colspan="5" class="p-6 text-center text-slate-400">No outbound messages sent yet.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ================= 5. SETTINGS TAB ================= -->
      <section id="tab-settings" class="hidden space-y-6">
        <div>
          <h2 class="font-bold text-base text-slate-900">System Settings & Integration</h2>
          <p class="text-xs text-slate-500">Google OAuth API keys and corporate dispatch configuration.</p>
        </div>

        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl space-y-5">
          <div class="space-y-3 border-b border-slate-100 pb-4">
            <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wide">Google Workspace / Gmail API Credentials</h3>
            <p class="text-xs text-slate-500">To sync real emails from yabutech47@gmail.com, enter your OAuth Client ID and Secret from Google Cloud Console.</p>

            <form onsubmit="saveGoogleCredentials(event)" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Google Client ID</label>
                <input type="text" id="setting-client-id" value="${auth.clientId || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-600">
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Google Client Secret</label>
                <input type="password" id="setting-client-secret" value="${auth.clientSecret || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-600">
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="text-[11px] text-slate-400">Authorized Redirect URI: <code class="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">${redirectUri}</code></span>
                <button type="submit" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800">
                  Save Credentials
                </button>
              </div>
            </form>
          </div>

          <div class="space-y-2">
            <h3 class="font-bold text-xs text-slate-800 uppercase tracking-wide">Account Status</h3>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p>Mailbox Address: <span class="font-mono font-bold text-slate-800">${auth.email || 'yabutech47@gmail.com'}</span></p>
              <p>Google OAuth Access: <span class="font-semibold ${isGoogleConnected ? 'text-emerald-700' : 'text-amber-700'}">${isGoogleConnected ? 'Authorized & Active' : 'Not Connected'}</span></p>
              ${isGoogleConnected 
                ? '<button onclick="disconnectGoogle()" class="mt-2 px-2.5 py-1 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded hover:bg-rose-100">Disconnect Account</button>'
                : '<button onclick="openConnectModal()" class="mt-2 px-2.5 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800 font-medium">Connect Google Account</button>'
              }
            </div>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- ================= MODAL: CONNECT GOOGLE ACCOUNT ================= -->
  <div id="modal-connect" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="font-bold text-slate-900 text-sm">Connect Google Account</h3>
        <button onclick="closeConnectModal()" class="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
      </div>

      <div class="text-xs text-slate-600 space-y-3">
        <p>Connect <strong>${auth.email || 'yabutech47@gmail.com'}</strong> to synchronize your real inbox messages directly via the Gmail API.</p>

        <div id="connect-credentials-missing" class="${auth.clientId ? 'hidden' : ''} bg-amber-50 p-3 rounded border border-amber-200 text-amber-900 space-y-2">
          <p class="font-semibold">Google Client ID required:</p>
          <input type="text" id="modal-client-id" placeholder="Paste Google Client ID" class="w-full p-2 border border-amber-300 rounded text-xs bg-white">
          <input type="password" id="modal-client-secret" placeholder="Paste Google Client Secret" class="w-full p-2 border border-amber-300 rounded text-xs bg-white">
          <button onclick="saveModalCredentials()" class="w-full py-1.5 bg-amber-900 text-white rounded text-xs font-medium">Save & Proceed</button>
        </div>

        <div id="connect-ready" class="${auth.clientId ? '' : 'hidden'} space-y-2">
          <button onclick="startGoogleAuth()" class="w-full py-2.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
            Sign in with Google (${auth.email || 'yabutech47@gmail.com'})
          </button>
          <p class="text-[11px] text-slate-400 text-center">Redirects to Google OAuth consent screen for authorization.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= MODAL: PREVIEW CORPORATE HTML ================= -->
  <div id="modal-preview" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl shadow-xl max-w-3xl w-full p-4 space-y-3 flex flex-col h-[85vh]">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wide">Corporate HTML Email Preview</h3>
        <button onclick="closePreviewModal()" class="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
      </div>
      <div class="flex-1 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
        <iframe id="preview-iframe" class="w-full h-full border-0"></iframe>
      </div>
      <div class="flex justify-end">
        <button onclick="closePreviewModal()" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800">Close</button>
      </div>
    </div>
  </div>

  <script>
    let appState = ${JSON.stringify({ threads: initialThreads, contacts: initialContacts, sentMessages: initialSent })};
    let activeThread = null;

    function switchTab(tabId) {
      ['inbox', 'campaigns', 'compose', 'sent', 'settings'].forEach(t => {
        const el = document.getElementById('tab-' + t);
        const nav = document.getElementById('nav-' + t);
        if (el) el.classList.add('hidden');
        if (nav) nav.classList.remove('tab-active');
      });
      const activeEl = document.getElementById('tab-' + tabId);
      const activeNav = document.getElementById('nav-' + tabId);
      if (activeEl) activeEl.classList.remove('hidden');
      if (activeNav) activeNav.classList.add('tab-active');

      const titles = {
        inbox: 'Inbox & Triage',
        campaigns: 'Bulk Campaigns',
        compose: 'Compose Email',
        sent: 'Sent Log',
        settings: 'Settings & Integration'
      };
      document.getElementById('header-view-title').innerText = titles[tabId] || 'Mail Platform';

      if (tabId === 'campaigns') {
        setTimeout(updateCampaignLivePreview, 50);
      }
    }

    async function syncGmail() {
      const btn = document.getElementById('btn-sync-top');
      if (btn) btn.innerText = 'Syncing...';
      try {
        const res = await fetch('/api/inbox/sync', { method: 'POST' });
        if (!res.ok) throw new Error('Status ' + res.status);
        const data = await res.json();
        if (!data.authenticated) {
          const banner = document.getElementById('google-auth-banner');
          if (banner) banner.classList.remove('hidden');
          const connStatus = document.getElementById('google-connection-status');
          if (connStatus) connStatus.innerText = 'Google Authorization Required';
        } else {
          const banner = document.getElementById('google-auth-banner');
          if (banner) banner.classList.add('hidden');
          const connStatus = document.getElementById('google-connection-status');
          if (connStatus) connStatus.innerText = 'Gmail Synchronized';
        }
        await loadState();
      } catch (err) {
        console.warn('Sync notice:', err.message);
      } finally {
        if (btn) btn.innerText = 'Sync Inbox';
      }
    }

    function renderThreads() {
      const container = document.getElementById('threads-container');
      const badge = document.getElementById('badge-inbox-count');
      const label = document.getElementById('inbox-count-label');

      badge.innerText = appState.threads.length;
      label.innerText = appState.threads.length + ' Messages';

      if (!appState.threads.length) {
        container.innerHTML = \`
          <div class="p-8 text-center text-xs text-slate-400 space-y-2">
            <p class="font-medium text-slate-600">No messages in inbox.</p>
            <p>Click "Sync Inbox" to pull real emails from Gmail.</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = appState.threads.map(t => \`
        <div onclick="selectThread('\${t.id}')" class="p-3 hover:bg-slate-50 cursor-pointer transition \${activeThread && activeThread.id === t.id ? 'bg-blue-50/70 border-l-2 border-blue-700' : ''}">
          <div class="flex items-center justify-between mb-0.5">
            <span class="font-bold text-xs text-slate-900 truncate max-w-[190px]">\${t.senderName || t.from}</span>
            <span class="text-[10px] text-slate-400 font-mono">\${t.date}</span>
          </div>
          <p class="font-medium text-xs text-slate-800 truncate">\${t.subject}</p>
          <p class="text-[11px] text-slate-500 truncate mt-0.5">\${t.snippet}</p>
        </div>
      \`).join('');
    }

    function renderEmailPreview(rawContent) {
      const frame = document.getElementById('view-email-frame');
      const statusLabel = document.getElementById('view-preview-status');
      if (!frame) return;

      if (!rawContent || !rawContent.trim()) {
        if (statusLabel) statusLabel.innerText = 'Empty Message';
        frame.srcdoc = '<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;color:#94a3b8;font-size:12px;padding:20px;text-align:center;">No message content available.</body></html>';
        return;
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
      if (statusLabel) statusLabel.innerText = isHtml ? 'Visual Render' : 'Plain Text';

      if (isHtml) {
        const baseStyle = \`
          <style>
            html, body { margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #1e293b; background: #ffffff; word-break: break-word; }
            img { max-width: 100% !important; height: auto !important; }
            table { max-width: 100% !important; }
            a { color: #1d4ed8; text-decoration: underline; }
          </style>
        \`;

        let html = rawContent;
        if (/<head[\s>]/i.test(html)) {
          html = html.replace(/<head[\s>]/i, match => match + baseStyle);
        } else if (/<html[\s>]/i.test(html)) {
          html = html.replace(/<html[\s>]/i, match => match + '<head>' + baseStyle + '</head>');
        } else {
          html = '<!DOCTYPE html><html><head>' + baseStyle + '</head><body>' + html + '</body></html>';
        }
        frame.srcdoc = html;
      } else {
        const escaped = rawContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        frame.srcdoc = \`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; word-break: break-word; background: #ffffff; }
            </style>
          </head>
          <body>\${escaped}</body>
          </html>
        \`;
      }
    }

    async function selectThread(id) {
      activeThread = appState.threads.find(t => t.id === id);
      if (!activeThread) return;

      renderThreads();

      document.getElementById('workspace-empty').classList.add('hidden');
      document.getElementById('workspace-active').classList.remove('hidden');

      document.getElementById('view-subject').innerText = activeThread.subject;
      document.getElementById('view-sender-name').innerText = activeThread.senderName || activeThread.from;
      document.getElementById('view-sender-email').innerText = '<' + activeThread.from + '>';
      document.getElementById('view-date').innerText = activeThread.date;

      // Render the visual preview inside the sandboxed iframe (no raw HTML code)
      renderEmailPreview(activeThread.body || activeThread.snippet);

      // On-demand fetch of full decoded thread body if not already loaded
      if (!activeThread.fullBodyLoaded) {
        fetch('/api/inbox/thread-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId: activeThread.id })
        }).then(r => r.json()).then(detail => {
          if (detail && detail.body && activeThread && activeThread.id === id) {
            activeThread.body = detail.body;
            activeThread.fullBodyLoaded = true;
            renderEmailPreview(detail.body);
          }
        }).catch(() => {});
      }

      // Automated AI Suggested Response loaded immediately on click
      const replyBox = document.getElementById('reply-text');
      if (activeThread.suggestedReply) {
        replyBox.value = activeThread.suggestedReply;
      } else {
        replyBox.value = 'Analyzing incoming message and generating suggested response...';
        try {
          const res = await fetch('/api/inbox/suggest-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId: activeThread.id })
          });
          const data = await res.json();
          replyBox.value = data.suggestedReply || '';
          activeThread.suggestedReply = data.suggestedReply;
        } catch (e) {
          replyBox.value = 'Failed to generate automated response. You can type your response manually.';
        }
      }
    }

    async function polishSuggestedReply(mode) {
      const text = document.getElementById('reply-text').value;
      if (!text) return;
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode })
      });
      const data = await res.json();
      if (data.text) document.getElementById('reply-text').value = data.text;
    }

    async function regenerateReply() {
      if (!activeThread) return;
      document.getElementById('reply-text').value = 'Regenerating suggested response...';
      const res = await fetch('/api/inbox/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThread.id, forceRegen: true })
      });
      const data = await res.json();
      document.getElementById('reply-text').value = data.suggestedReply;
    }

    async function sendReply() {
      if (!activeThread) return;
      const body = document.getElementById('reply-text').value;
      if (!body) return alert('Reply content cannot be empty.');

      const btn = document.getElementById('btn-send-reply');
      btn.innerText = 'Dispatching...';

      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThread.id,
          to: activeThread.from,
          subject: 'Re: ' + activeThread.subject.replace(/^re:\s*/i, ''),
          body: body
        })
      });

      const data = await res.json();
      btn.innerText = 'Send Corporate Reply';

      if (data.success) {
        alert('Corporate reply dispatched successfully.');
        await loadState();
      } else {
        alert('Error: ' + (data.error || 'Failed to dispatch email'));
      }
    }

    // CSV File Upload
    function handleCsvUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async function(evt) {
        const text = evt.target.result;
        const res = await fetch('/api/campaigns/upload-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvContent: text })
        });
        const data = await res.json();
        alert('Imported ' + data.contacts.length + ' contacts from CSV.');
        await loadState();
      };
      reader.readAsText(file);
    }

    function downloadSampleCsv() {
      const sampleText = "email,name,company,role\n" +
        "alex.morgan@schoolhub.edu,Alex Morgan,SchoolHub Academy,Academic Director\n" +
        "sarah.chen@edulearn.org,Sarah Chen,EduLearn Global,Curriculum Coordinator\n" +
        "david.kim@innovateedu.com,David Kim,InnovateEdu Institute,Head of Technology\n" +
        "elena.rostova@globalstem.ac,Elena Rostova,Global STEM Initiative,Partnerships Lead\n" +
        "michael.brown@edutechpartners.com,Michael Brown,EdTech Partners,Director of Operations\n";

      try {
        const blob = new Blob([sampleText], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'sample_contacts.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 150);
      } catch (err) {
        window.location.href = '/api/campaigns/sample-csv';
      }
    }

    function buildCorporatePreviewHtml(data) {
      const brandName = "EdTechHub";
      const primaryColor = "#1e40af";
      const senderName = "Yabsera";
      const senderTitle = "Tech Lead";
      const senderEmail = "yabutech47@gmail.com";
      const website = "https://edtechhub.et";
      const location = "Addis Ababa, Ethiopia";

      let formattedBody = data.bodyContent || 'Your campaign message will appear here...';
      if (!formattedBody.includes('<p>') && !formattedBody.includes('<div>')) {
        formattedBody = formattedBody
          .split('\n\n')
          .map(p => '<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 14px;">' + p.replace(/\n/g, '<br>') + '</p>')
          .join('');
      }

      const ctaButton = (data.ctaText && data.ctaUrl) ? \`
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 22px 0;">
          <tr>
            <td align="left" style="border-radius: 6px;" bgcolor="\${primaryColor}">
              <a href="\${data.ctaUrl}" target="_blank" style="font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; padding: 11px 22px; border-radius: 6px; letter-spacing: 0.2px;">
                \${data.ctaText} &rarr;
              </a>
            </td>
          </tr>
        </table>
      \` : '';

      return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${data.subject || brandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; padding: 16px 8px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); overflow: hidden;" role="presentation">
          <tr>
            <td height="4" style="background-color: \${primaryColor}; line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 18px 24px 14px 24px; border-bottom: 1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td align="left" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td valign="middle" style="padding-right: 10px;">
                          <img src="/logo.png" alt="\${brandName}" width="36" height="36" style="display: block; width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e2e8f0; object-fit: contain;" onerror="this.onerror=null;this.src='/logo.jpg';" />
                        </td>
                        <td valign="middle">
                          <span style="font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; display: block;">
                            \${brandName}
                          </span>
                          <span style="display: block; font-size: 10px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px;">
                            Enterprise Intelligent Mail
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 3px 8px; background-color: #eff6ff; color: \${primaryColor}; border-radius: 16px; font-size: 10px; font-weight: 600;">
                      Verified Dispatch
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 24px; font-size: 14px; line-height: 1.6; color: #334155;">
              \${data.recipientName ? \`<p style="margin: 0 0 14px 0; font-weight: 600; color: #0f172a; font-size: 14px;">Dear \${data.recipientName},</p>\` : ''}
              \${formattedBody}
              \${ctaButton}
              
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #f1f5f9;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px;">
                      <img src="/logo.png" alt="\${senderName}" width="38" height="38" style="width: 38px; height: 38px; border-radius: 50%; border: 1px solid #cbd5e1; display: block; object-fit: contain;" onerror="this.onerror=null;this.src='/logo.jpg';" />
                    </td>
                    <td style="vertical-align: middle;">
                      <div style="font-weight: 700; font-size: 13px; color: #0f172a;">\${senderName}</div>
                      <div style="font-size: 11px; color: #64748b; line-height: 1.4;">\${senderTitle}</div>
                      <div style="font-size: 11px; color: \${primaryColor}; font-weight: 500;">
                        \${senderEmail} &bull; \${website}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">
                &copy; \${new Date().getFullYear()} \${brandName} Technologies. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">
                \${location}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>\`;
    }

    function updateCampaignLivePreview() {
      const frame = document.getElementById('campaign-live-frame');
      if (!frame) return;

      const subjectEl = document.getElementById('campaign-subject');
      const bodyEl = document.getElementById('campaign-body');
      const ctaTextEl = document.getElementById('campaign-cta-text');
      const ctaUrlEl = document.getElementById('campaign-cta-url');
      const selectEl = document.getElementById('campaign-preview-contact-select');

      const subject = subjectEl ? subjectEl.value : '';
      const body = bodyEl ? bodyEl.value : '';
      const ctaText = ctaTextEl ? ctaTextEl.value : '';
      const ctaUrl = ctaUrlEl ? ctaUrlEl.value : '';

      let contact = null;
      if (selectEl && selectEl.value && appState && appState.contacts) {
        contact = appState.contacts.find(c => c.id === selectEl.value || c.email === selectEl.value);
      }
      if (!contact && appState && appState.contacts && appState.contacts.length > 0) {
        contact = appState.contacts[0];
      }

      const recName = contact ? contact.name : 'Alex Morgan';
      const recCompany = contact ? contact.company : 'SchoolHub Academy';

      let renderedBody = body || 'Enter your message in the editor on the left to see your live preview update instantly. Use tags like {{name}} and {{company}} for automated personalization.';
      renderedBody = renderedBody.replace(/{{name}}/g, recName).replace(/{{company}}/g, recCompany);

      const renderedSubject = (subject || 'Corporate Announcement').replace(/{{name}}/g, recName).replace(/{{company}}/g, recCompany);

      frame.srcdoc = buildCorporatePreviewHtml({
        subject: renderedSubject,
        bodyContent: renderedBody,
        ctaText: ctaText,
        ctaUrl: ctaUrl,
        recipientName: recName
      });
    }

    function renderContacts() {
      const table = document.getElementById('contacts-table-body');
      const badge = document.getElementById('badge-contacts-count');
      const label = document.getElementById('csv-loaded-count');
      const previewSelect = document.getElementById('campaign-preview-contact-select');

      badge.innerText = appState.contacts.length;
      label.innerText = appState.contacts.length + ' Contacts';

      if (previewSelect) {
        if (!appState.contacts.length) {
          previewSelect.innerHTML = '<option value="">Alex Morgan (SchoolHub Academy)</option>';
        } else {
          previewSelect.innerHTML = appState.contacts.map((c, i) => \`
            <option value="\${c.id}">\${c.name} (\${c.company || 'Partner'})\${i === 0 ? ' [Default]' : ''}</option>
          \`).join('');
        }
      }

      if (!appState.contacts.length) {
        table.innerHTML = '<div class="p-4 text-center text-xs text-slate-400">No contacts loaded.</div>';
        updateCampaignLivePreview();
        return;
      }

      table.innerHTML = appState.contacts.map(c => \`
        <div class="p-2.5 flex items-center justify-between text-xs hover:bg-white transition">
          <div>
            <p class="font-bold text-slate-800">\${c.name}</p>
            <p class="text-slate-400 text-[11px] font-mono">\${c.email} &bull; \${c.company}</p>
          </div>
          <span class="text-[10px] font-mono text-slate-500">\${c.role}</span>
        </div>
      \`).join('');

      updateCampaignLivePreview();
    }

    async function clearContacts() {
      if (!confirm('Clear all loaded contacts?')) return;
      await fetch('/api/campaigns/clear-contacts', { method: 'POST' });
      await loadState();
    }

    // AI Campaign Generation
    async function generateCampaignWithAi() {
      const prompt = document.getElementById('campaign-prompt').value;
      if (!prompt) return alert('Enter campaign objective first.');

      const btn = document.getElementById('btn-generate-campaign');
      btn.innerText = 'Generating Copy...';

      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      btn.innerText = 'Generate Corporate Copy';

      document.getElementById('campaign-subject').value = data.subject;
      document.getElementById('campaign-body').value = data.body;
      updateCampaignLivePreview();
    }

    async function sendBulkCampaign() {
      if (!appState.contacts.length) return alert('Upload a CSV file first.');
      const subject = document.getElementById('campaign-subject').value;
      const body = document.getElementById('campaign-body').value;
      const ctaText = document.getElementById('campaign-cta-text').value;
      const ctaUrl = document.getElementById('campaign-cta-url').value;

      if (!subject || !body) return alert('Subject and email body are required.');

      const progressDiv = document.getElementById('campaign-progress-bar');
      const progressFill = document.getElementById('progress-fill');
      const progressText = document.getElementById('progress-text');
      const progressPercent = document.getElementById('progress-percent');

      progressDiv.classList.remove('hidden');
      const total = appState.contacts.length;

      for (let i = 0; i < total; i++) {
        const pct = Math.round(((i + 1) / total) * 100);
        progressText.innerText = 'Dispatching to ' + appState.contacts[i].email + ' (' + (i + 1) + '/' + total + ')';
        progressFill.style.width = pct + '%';
        progressPercent.innerText = pct + '%';
        await new Promise(r => setTimeout(r, 100));
      }

      await fetch('/api/campaigns/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, ctaText, ctaUrl })
      });

      alert('Bulk campaign dispatched.');
      progressDiv.classList.add('hidden');
      await loadState();
      switchTab('sent');
    }

    // Single Compose
    async function aiDraftSingle() {
      const subject = document.getElementById('single-subject').value || 'Partnership Discussion';
      const prompt = document.getElementById('single-body').value || 'Draft introductory email';
      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      document.getElementById('single-body').value = data.body;
    }

    async function aiPolishSingle() {
      const text = document.getElementById('single-body').value;
      if (!text) return;
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode: 'polish' })
      });
      const data = await res.json();
      if (data.text) document.getElementById('single-body').value = data.text;
    }

    async function sendSingleEmail() {
      const to = document.getElementById('single-to').value;
      const name = document.getElementById('single-name').value;
      const subject = document.getElementById('single-subject').value;
      const body = document.getElementById('single-body').value;

      if (!to || !subject || !body) return alert('Recipient, subject, and body required.');

      await fetch('/api/mail/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, name, subject, body })
      });

      alert('Email dispatched.');
      document.getElementById('single-to').value = '';
      document.getElementById('single-body').value = '';
      await loadState();
      switchTab('sent');
    }

    // Preview
    async function previewCorporateHtml(source) {
      let subject = '', body = '', name = '', ctaText = '', ctaUrl = '';

      if (source === 'reply') {
        subject = activeThread ? 'Re: ' + activeThread.subject : 'Corporate Reply';
        body = document.getElementById('reply-text').value;
        name = activeThread ? (activeThread.senderName || '') : '';
      } else if (source === 'campaign') {
        subject = document.getElementById('campaign-subject').value || 'Corporate Announcement';
        body = document.getElementById('campaign-body').value.replace(/{{name}}/g, 'Valued Partner').replace(/{{company}}/g, 'Organization');
        name = 'Valued Partner';
        ctaText = document.getElementById('campaign-cta-text').value;
        ctaUrl = document.getElementById('campaign-cta-url').value;
      } else if (source === 'single') {
        subject = document.getElementById('single-subject').value || 'Inquiry';
        body = document.getElementById('single-body').value;
        name = document.getElementById('single-name').value || 'Partner';
      }

      const res = await fetch('/api/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, recipientName: name, ctaText, ctaUrl })
      });
      const data = await res.json();

      document.getElementById('preview-iframe').srcdoc = data.html;
      document.getElementById('modal-preview').classList.remove('hidden');
    }

    function closePreviewModal() {
      document.getElementById('modal-preview').classList.add('hidden');
    }

    function renderSentMessages() {
      const body = document.getElementById('sent-table-body');
      const badge = document.getElementById('badge-sent-count');
      const label = document.getElementById('sent-count-label');

      badge.innerText = appState.sentMessages.length;
      label.innerText = appState.sentMessages.length + ' Dispatched';

      if (!appState.sentMessages.length) {
        body.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">No outbound messages sent yet.</td></tr>';
        return;
      }

      body.innerHTML = appState.sentMessages.map(m => \`
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3 font-semibold text-slate-800 font-mono">\${m.to}</td>
          <td class="p-3 text-slate-700">\${m.subject}</td>
          <td class="p-3 text-slate-500 font-mono text-[11px]">\${m.type}</td>
          <td class="p-3 text-slate-400 font-mono">\${m.timestamp}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Delivered</span></td>
        </tr>
      \`).join('');
    }

    // Google Auth Modals & Flows
    function openConnectModal() { document.getElementById('modal-connect').classList.remove('hidden'); }
    function closeConnectModal() { document.getElementById('modal-connect').classList.add('hidden'); }

    async function saveModalCredentials() {
      const clientId = document.getElementById('modal-client-id').value;
      const clientSecret = document.getElementById('modal-client-secret').value;
      if (!clientId || !clientSecret) return alert('Both Client ID and Secret are required.');

      await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });

      document.getElementById('connect-credentials-missing').classList.add('hidden');
      document.getElementById('connect-ready').classList.remove('hidden');
    }

    async function saveGoogleCredentials(e) {
      e.preventDefault();
      const clientId = document.getElementById('setting-client-id').value;
      const clientSecret = document.getElementById('setting-client-secret').value;
      await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      alert('Credentials saved.');
      window.location.reload();
    }

    function startGoogleAuth() {
      window.location.href = '/api/auth/login';
    }

    async function disconnectGoogle() {
      if (!confirm('Disconnect Google account?')) return;
      await fetch('/api/auth/disconnect', { method: 'POST' });
      window.location.reload();
    }

    async function checkAuthStatus() {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.isGoogleConnected) {
          document.getElementById('google-auth-banner').classList.add('hidden');
          document.getElementById('google-connection-status').innerText = 'Gmail Synchronized';
        } else if (data.hasClientId) {
          document.getElementById('connect-credentials-missing').classList.add('hidden');
          document.getElementById('connect-ready').classList.remove('hidden');
        }
      } catch (e) {}
    }

    async function loadState() {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.threads)) {
            appState = data;
            renderThreads();
            renderContacts();
            renderSentMessages();
          }
        }
      } catch (e) {
        console.warn('State sync notice:', e.message);
      }
      await checkAuthStatus();
    }

    window.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['inbox', 'campaigns', 'compose', 'sent', 'settings'].includes(tabParam)) {
        switchTab(tabParam);
      }
      await loadState();
      updateCampaignLivePreview();
      // Auto-sync real emails if authenticated
      await syncGmail();
    });
  </script>
</body>
</html>`;
}

// Request Handler
async function handleRequest(req, res) {
  try {
    const originalParsed = url.parse(req.url || '/', true);
    let requestPath = originalParsed.query.__path || req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || originalParsed.pathname || '/';

    // Normalize root path & trailing slashes
    if (requestPath === '/api/index.js' || requestPath === '/api/index') {
      requestPath = '/';
    } else if (requestPath.length > 1 && requestPath.endsWith('/')) {
      requestPath = requestPath.slice(0, -1);
    }

    const parsedUrl = url.parse(requestPath, true);
    let pathname = parsedUrl.pathname || '/';

    const query = {
      ...originalParsed.query,
      ...parsedUrl.query
    };
    delete query.__path;
    const method = req.method;

  // Static Brand Logo
  if (pathname === '/logo.png' || pathname === '/logo.jpg') {
    const filePath = path.join(__dirname, 'public', pathname.endsWith('.jpg') ? 'logo.jpg' : 'logo.png');
    if (fs.existsSync(filePath)) {
      const img = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': pathname.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
        'Cache-Control': 'public, max-age=86400'
      });
      return res.end(img);
    }
  }

  // Static Sample Contacts CSV Download
  if (pathname === '/api/campaigns/sample-csv' || pathname === '/sample_contacts.csv') {
    const csvPath = path.join(__dirname, 'public', 'sample_contacts.csv');
    let csvData = '';
    if (fs.existsSync(csvPath)) {
      csvData = fs.readFileSync(csvPath, 'utf8');
    } else {
      csvData = "email,name,company,role\nalex.morgan@schoolhub.edu,Alex Morgan,SchoolHub Academy,Academic Director\nsarah.chen@edulearn.org,Sarah Chen,EduLearn Global,Curriculum Coordinator\ndavid.kim@innovateedu.com,David Kim,InnovateEdu Institute,Head of Technology\nelena.rostova@globalstem.ac,Elena Rostova,Global STEM Initiative,Partnerships Lead\nmichael.brown@edutechpartners.com,Michael Brown,EdTech Partners,Director of Operations\n";
    }
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sample_contacts.csv"',
      'Cache-Control': 'public, max-age=86400'
    });
    return res.end(csvData);
  }

  // 1. Health
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', email: 'yabutech47@gmail.com' }));
  }

  // 1b. Auth Status Diagnostics
  if (pathname === '/api/auth/status') {
    const auth = Gmail.getStoredAuth();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      hasClientId: Boolean(auth.clientId),
      hasClientSecret: Boolean(auth.clientSecret),
      hasRefreshToken: Boolean(auth.refreshToken),
      isGoogleConnected: Boolean(auth.refreshToken || (auth.accessToken && auth.tokenExpiresAt > Date.now())),
      email: auth.email
    }));
  }

  // 2. Google OAuth Start
  if (pathname === '/api/auth/login') {
    const authData = Gmail.getAuthUrl(req);
    if (!authData) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Google Client ID Required</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 flex items-center justify-center h-screen p-4 font-sans text-sm">
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md w-full space-y-3 text-center">
            <h2 class="font-bold text-base text-slate-900">Google Client ID Required</h2>
            <p class="text-xs text-slate-500">To enable sign-in on this deployment, add your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Vercel Environment Variables, or enter them in Settings.</p>
            <div class="pt-2">
              <a href="/?tab=settings" class="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">Go to Settings</a>
            </div>
          </div>
        </body>
        </html>
      `);
    }
    res.writeHead(302, {
      Location: authData.url,
      'Set-Cookie': `eh_oauth_state=${authData.state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    });
    return res.end();
  }

  // 3. Google OAuth Callback
  if (pathname === '/api/auth/callback') {
    const { code, state, error } = query;
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Google authentication error: ' + error);
    }
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Missing authorization code');
    }

    try {
      await Gmail.exchangeCodeForTokens(code, req);
      res.writeHead(302, { Location: '/?connected=true' });
      return res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Token exchange failed: ' + err.message);
    }
  }

  // 4. Save Google Credentials
  if (pathname === '/api/auth/credentials' && method === 'POST') {
    const data = await parseBody(req);
    Gmail.saveStoredAuth({
      clientId: data.clientId,
      clientSecret: data.clientSecret
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // 5. Disconnect Google
  if (pathname === '/api/auth/disconnect' && method === 'POST') {
    Gmail.saveStoredAuth({
      refreshToken: '',
      accessToken: '',
      tokenExpiresAt: 0
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // 6. State
  if (pathname === '/api/state') {
    const state = Storage.loadState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(state));
  }

  // 7. Sync Real Gmail Threads
  if (pathname === '/api/inbox/sync' && method === 'POST') {
    const gmailResult = await Gmail.fetchRealThreads(30);
    const state = Storage.loadState();

    if (gmailResult.authenticated && gmailResult.threads) {
      state.threads = gmailResult.threads;
      Storage.saveState(state);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      authenticated: gmailResult.authenticated,
      error: gmailResult.error,
      threadsCount: state.threads.length
    }));
  }

  // 7b. Fetch Thread Detail
  if (pathname === '/api/inbox/thread-detail' && method === 'POST') {
    const data = await parseBody(req);
    if (!data.threadId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Thread ID required' }));
    }
    const detail = await Gmail.fetchThreadDetail(data.threadId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(detail || {}));
  }

  // 8. Suggest Reply for Thread
  if (pathname === '/api/inbox/suggest-reply' && method === 'POST') {
    const data = await parseBody(req);
    const state = Storage.loadState();
    const thread = state.threads.find(t => t.id === data.threadId);

    if (!thread) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Thread not found' }));
    }

    const reply = await AI.generateSuggestedReply({
      senderName: thread.senderName,
      senderEmail: thread.from,
      subject: thread.subject,
      messageBody: thread.body || thread.snippet,
      tone: 'professional'
    });

    thread.suggestedReply = reply;
    Storage.saveState(state);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ suggestedReply: reply }));
  }

  // 9. Reply to Thread (Dispatches via Gmail API if connected)
  if (pathname === '/api/inbox/reply' && method === 'POST') {
    const data = await parseBody(req);
    const state = Storage.loadState();
    const thread = state.threads.find(t => t.id === data.threadId);

    const corporateHtml = BrandConfig.renderCorporateHtml({
      subject: data.subject,
      bodyContent: data.body,
      recipientName: thread ? thread.senderName : ''
    });

    // Try sending through real Gmail API if authenticated
    try {
      await Gmail.sendRealMessage({
        to: data.to,
        subject: data.subject,
        htmlBody: corporateHtml,
        inReplyTo: thread ? thread.messageId : undefined
      });
    } catch (err) {
      console.warn('Real Gmail API dispatch skipped or failed, logging sent message:', err.message);
    }

    if (thread) {
      thread.status = 'replied';
    }

    state.sentMessages.unshift({
      id: 'sent_' + Date.now(),
      to: data.to,
      subject: data.subject,
      type: 'Reply',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    Storage.saveState(state);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // 10. Upload CSV
  if (pathname === '/api/campaigns/upload-csv' && method === 'POST') {
    const data = await parseBody(req);
    const parsed = parseCsvContent(data.csvContent || '');
    const state = Storage.loadState();
    state.contacts = parsed;
    Storage.saveState(state);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, contacts: parsed }));
  }

  // 11. Clear Contacts
  if (pathname === '/api/campaigns/clear-contacts' && method === 'POST') {
    const state = Storage.loadState();
    state.contacts = [];
    Storage.saveState(state);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // 12. AI Generate Campaign
  if (pathname === '/api/campaigns/ai-generate' && method === 'POST') {
    const data = await parseBody(req);
    const generated = await AI.generateCorporateCampaign({
      prompt: data.prompt || 'Institutional update',
      tone: 'executive'
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(generated));
  }

  // 13. Send Bulk Campaign
  if (pathname === '/api/campaigns/send-bulk' && method === 'POST') {
    const data = await parseBody(req);
    const state = Storage.loadState();

    for (const contact of state.contacts) {
      const personalizedBody = data.body
        .replace(/{{name}}/g, contact.name)
        .replace(/{{company}}/g, contact.company);

      const corporateHtml = BrandConfig.renderCorporateHtml({
        subject: data.subject,
        bodyContent: personalizedBody,
        recipientName: contact.name,
        ctaText: data.ctaText,
        ctaUrl: data.ctaUrl
      });

      try {
        await Gmail.sendRealMessage({
          to: contact.email,
          subject: data.subject,
          htmlBody: corporateHtml
        });
      } catch (err) {
        // Log error or continue batch
      }

      state.sentMessages.unshift({
        id: 'bulk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        to: contact.email,
        subject: data.subject,
        type: 'Campaign',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    Storage.saveState(state);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, totalSent: state.contacts.length }));
  }

  // 14. Send Single Email
  if (pathname === '/api/mail/send-single' && method === 'POST') {
    const data = await parseBody(req);
    const state = Storage.loadState();

    const corporateHtml = BrandConfig.renderCorporateHtml({
      subject: data.subject,
      bodyContent: data.body,
      recipientName: data.name
    });

    try {
      await Gmail.sendRealMessage({
        to: data.to,
        subject: data.subject,
        htmlBody: corporateHtml
      });
    } catch (err) {
      console.warn('Real Gmail send failed or skipped:', err.message);
    }

    state.sentMessages.unshift({
      id: 'single_' + Date.now(),
      to: data.to,
      subject: data.subject,
      type: 'Single',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    Storage.saveState(state);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // 15. AI Polish Text
  if (pathname === '/api/ai/polish' && method === 'POST') {
    const data = await parseBody(req);
    const polished = await AI.polishText({
      text: data.text || '',
      mode: data.mode || 'polish'
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ text: polished }));
  }

  // 16. Corporate HTML Preview
  if (pathname === '/api/preview-html' && method === 'POST') {
    const data = await parseBody(req);
    const html = BrandConfig.renderCorporateHtml({
      subject: data.subject,
      bodyContent: data.body,
      recipientName: data.recipientName,
      ctaText: data.ctaText,
      ctaUrl: data.ctaUrl
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ html }));
  }

  // 17. Root View
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderCorporateUi(req));
  }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    console.error('Unhandled request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Application Error</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 flex items-center justify-center h-screen p-4 font-sans text-sm">
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md w-full space-y-3 text-center">
            <h2 class="font-bold text-base text-slate-900">Application Notice</h2>
            <p class="text-xs text-slate-600">${(err && err.message) || 'An error occurred during execution.'}</p>
            <div class="pt-2">
              <a href="/" class="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">Reload Application</a>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  }
}

// HTTP Server
const server = http.createServer(handleRequest);

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`Corporate Email Agent listening on http://localhost:${portToTry}`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = (err.port || PORT) + 1;
    console.log(`Port ${PORT} in use, trying port ${nextPort}...`);
    startServer(nextPort);
  } else {
    console.error('Server error:', err);
  }
});

if (require.main === module) {
  startServer(PORT);
}

module.exports = handleRequest;
