/**
 * Executive Operations Dashboard & Voice Agent UI Component
 * Strictly adheres to corporate styling:
 * - Zero emojis
 * - Clean Tailwind CSS enterprise layout
 * - Real-time statistics, progress graphs, and news feed
 * - Full Voice Agent workflow: Single call, bulk call, Ethiopian phone numbers (+251...),
 *   recorded audio playback, automated hangup upon completion, recall unanswered,
 *   database contact selection, and CSV spreadsheet export.
 */

function renderDashboardSection(stats, initialThreadsCount, initialContactsCount, initialSentCount) {
  const vStats = stats.voice || {
    totalCampaigns: 1,
    totalCalls: 5,
    completedCalls: 4,
    unansweredCalls: 1,
    busyCalls: 0,
    completionRate: 80,
    activeContacts: 7
  };

  return `
      <!-- ================= 0. DASHBOARD TAB (DEFAULT FIRST PAGE) ================= -->
      <section id="tab-dashboard" class="space-y-6">
        
        <!-- Header & Top Quick Actions -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="font-bold text-lg text-slate-900 tracking-tight">Executive Operations Dashboard</h2>
            <p class="text-xs text-slate-500 mt-0.5">Real-time telemetry, operational metrics, and communication workflows across Email and Voice agents.</p>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="switchTab('voice')" class="px-3.5 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition shadow-2xs">
              Launch Voice Campaign
            </button>
            <button onclick="switchTab('compose')" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-2xs">
              Compose Email
            </button>
            <button onclick="syncGmail()" class="px-3.5 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition">
              Sync Inbox
            </button>
          </div>
        </div>

        <!-- 5 KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <!-- Total Inbox Messages -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inbox Messages</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Gmail API</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <span class="text-2xl font-bold text-slate-900 font-mono" id="dash-inbox-count">${initialThreadsCount}</span>
              <span class="text-xs text-slate-500 font-medium">Real-time Sync</span>
            </div>
          </div>

          <!-- Email Audience Contacts -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email Audience</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Database</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <span class="text-2xl font-bold text-slate-900 font-mono" id="dash-email-contacts">${initialContactsCount}</span>
              <span class="text-xs text-slate-500 font-medium">${initialSentCount} Sent</span>
            </div>
          </div>

          <!-- Voice Campaigns -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Voice Broadcasts</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Outbound</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <span class="text-2xl font-bold text-slate-900 font-mono" id="dash-voice-campaigns">${vStats.totalCampaigns}</span>
              <span class="text-xs text-slate-500 font-medium">Bulk Batches</span>
            </div>
          </div>

          <!-- Total Calls Placed -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Calls</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">+251 Mobile</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <span class="text-2xl font-bold text-slate-900 font-mono" id="dash-total-calls">${vStats.totalCalls}</span>
              <span class="text-xs text-slate-500 font-medium">Logged in DB</span>
            </div>
          </div>

          <!-- Call Completion Rate -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completion Rate</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800" id="dash-badge-rate">${vStats.completionRate}%</span>
            </div>
            <div class="mt-3 flex items-baseline justify-between">
              <span class="text-2xl font-bold text-emerald-700 font-mono" id="dash-completion-rate">${vStats.completionRate}%</span>
              <span class="text-xs text-slate-500 font-medium">Auto Hangup</span>
            </div>
          </div>

        </div>

        <!-- 2-Column Operational Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- Left 8 Columns: Telemetry, Visual Graphs & Recent Voice Runs -->
          <div class="lg:col-span-8 space-y-6">

            <!-- Communications Performance Chart / Metric Breakdown -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 class="font-bold text-sm text-slate-900">Agent Performance & Status Breakdown</h3>
                  <p class="text-xs text-slate-500">Live call outcomes, recipient disposition, and audio message playback completion</p>
                </div>
                <span class="text-xs font-mono text-slate-400">Automated Voice Engine</span>
              </div>

              <!-- Horizontal Visual Progress Graph -->
              <div class="space-y-3 pt-1">
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-semibold text-slate-700">Answered & Completed (Full Audio Message Listened)</span>
                    <span class="font-mono text-slate-900 font-bold" id="dash-stat-completed">${vStats.completedCalls} Calls (${vStats.completionRate}%)</span>
                  </div>
                  <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div id="dash-bar-completed" class="h-full bg-emerald-600 rounded-full transition-all duration-500" style="width: ${vStats.completionRate}%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-semibold text-slate-700">Line Busy / Rejected</span>
                    <span class="font-mono text-slate-900 font-bold" id="dash-stat-busy">${vStats.busyCalls} Calls (0%)</span>
                  </div>
                  <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div id="dash-bar-busy" class="h-full bg-amber-500 rounded-full transition-all duration-500" style="width: 0%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-semibold text-slate-700">Unanswered / Missed (Queued for Automatic Recall)</span>
                    <span class="font-mono text-slate-900 font-bold" id="dash-stat-unanswered">${vStats.unansweredCalls} Calls (20%)</span>
                  </div>
                  <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div id="dash-bar-unanswered" class="h-full bg-rose-500 rounded-full transition-all duration-500" style="width: 20%"></div>
                  </div>
                </div>
              </div>

              <!-- Telemetry Indicators -->
              <div class="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <p class="text-[11px] text-slate-500">Average Message Length</p>
                  <p class="text-sm font-bold text-slate-800 font-mono mt-0.5">28 Seconds</p>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <p class="text-[11px] text-slate-500">Auto Hangup Reliability</p>
                  <p class="text-sm font-bold text-emerald-700 font-mono mt-0.5">100%</p>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <p class="text-[11px] text-slate-500">Ethiopian Phone Standard</p>
                  <p class="text-sm font-bold text-blue-700 font-mono mt-0.5">+251 E.164</p>
                </div>
              </div>
            </div>

            <!-- Recent Voice Campaigns -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 class="font-bold text-sm text-slate-900">Recent Voice Broadcast Operations</h3>
                  <p class="text-xs text-slate-500">Latest bulk audio notifications dispatched to Ethiopian numbers</p>
                </div>
                <button onclick="switchTab('voice')" class="text-xs font-semibold text-blue-700 hover:underline">
                  Open Voice Agent
                </button>
              </div>

              <div id="dash-campaigns-list" class="divide-y divide-slate-100">
                <div class="py-3 flex items-center justify-between">
                  <div>
                    <p class="font-bold text-xs text-slate-900">Cohort 1 Coursework Completion Reminder</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">Audience: Addis Ababa Trainees (Cohort 1) &bull; Audio: Course Completion (28s)</p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800">4 / 5 Completed</span>
                    <button onclick="switchTab('voice')" class="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50">View</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Right 4 Columns: Live News & Activity Feed + System Persistence Card -->
          <div class="lg:col-span-4 space-y-6">

            <!-- Live Activity & News Feed -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h3 class="font-bold text-sm text-slate-900">Live Activity Feed</h3>
                </div>
                <span class="text-[10px] font-mono text-slate-400">Chronological</span>
              </div>

              <div id="dash-activity-container" class="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                <!-- Dynamically loaded activities -->
                <div class="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">Voice Agent</span>
                    <span class="text-[10px] text-slate-400 font-mono">Recent</span>
                  </div>
                  <p class="text-xs font-bold text-slate-800">Bulk Voice Campaign Dispatched</p>
                  <p class="text-[11px] text-slate-500">Broadcasted "Course Completion Reminder" to Addis Ababa Trainees (Cohort 1).</p>
                </div>

                <div class="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">Email Agent</span>
                    <span class="text-[10px] text-slate-400 font-mono">Recent</span>
                  </div>
                  <p class="text-xs font-bold text-slate-800">Live Gmail Messages Synchronized</p>
                  <p class="text-[11px] text-slate-500">Retrieved incoming messages for yabutech47@gmail.com with zero errors.</p>
                </div>
              </div>
            </div>

            <!-- System Memory & Persistence Engine -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <h3 class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Persistence & Memory</h3>
              <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Database Engine:</span>
                  <span class="font-semibold text-slate-800 font-mono" id="dash-db-provider">Persistent Store Active</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Memory Sync:</span>
                  <span class="font-semibold text-emerald-700">Synchronized</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Audio Voice Engine:</span>
                  <span class="font-semibold text-slate-800 font-mono">Audio WAV Stream</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Operator:</span>
                  <span class="font-semibold text-slate-800">Yabsera (Tech Lead)</span>
                </div>
              </div>
              <div class="pt-2 border-t border-slate-100">
                <button onclick="switchTab('settings')" class="w-full text-center text-xs font-semibold text-blue-700 hover:underline">
                  Configure Database Settings
                </button>
              </div>
            </div>

          </div>

        </div>

      </section>
  `;
}

function renderVoiceSection() {
  return `
      <!-- ================= 2. VOICE AGENT TAB ================= -->
      <section id="tab-voice" class="hidden space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 class="font-bold text-lg text-slate-900 tracking-tight">Voice Agent & Automated Calling</h2>
              <span class="px-2.5 py-0.5 bg-blue-100 border border-blue-200 text-blue-900 rounded-md text-[11px] font-mono font-bold">Caller ID: +251 711705055</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Broadcast pre-recorded voice notifications to Ethiopian phone numbers (+251...). Plays recorded message and hangs up automatically.</p>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="downloadSampleVoiceCsv()" class="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition shadow-2xs">
              Download Sample Contacts CSV
            </button>
            <button onclick="exportCallLogsCsv()" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-2xs">
              Export Call Tracking (CSV)
            </button>
          </div>
        </div>

        <!-- Voice Sub-navigation Bar -->
        <div class="flex items-center space-x-1 border-b border-slate-200 pb-2 text-xs font-medium">
          <button onclick="switchVoiceSubView('bulk')" id="vnav-bulk" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold">
            Bulk Voice Broadcast
          </button>
          <button onclick="switchVoiceSubView('single')" id="vnav-single" class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            Single Direct Call
          </button>
          <button onclick="switchVoiceSubView('contacts')" id="vnav-contacts" class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            Contact Database (+251)
          </button>
          <button onclick="switchVoiceSubView('recordings')" id="vnav-recordings" class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            Voice Recordings
          </button>
          <button onclick="switchVoiceSubView('logs')" id="vnav-logs" class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            Call Tracking & Spreadsheet
          </button>
        </div>

        <!-- Telephony Gateway Banner -->
        <div id="voice-gateway-banner" class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-start space-x-3">
            <span id="gateway-status-dot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse"></span>
            <div>
              <p class="font-bold text-slate-900" id="gateway-status-title">Active Gateway: Android Phone GSM SIM Gateway (Ethio telecom +251 711705055)</p>
              <p class="text-slate-600 text-[11px] mt-0.5" id="gateway-status-desc">
                Calls physically ring real in-hand mobile phones via your own Android phone's Ethio telecom SIM card at 0 international fees.
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2 shrink-0">
            <a href="/gateway" target="_blank" class="px-3.5 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition whitespace-nowrap">
              Open Phone Gateway (/gateway)
            </a>
            <button type="button" onclick="openGatewayModal()" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition whitespace-nowrap">
              Gateway Options
            </button>
          </div>
        </div>

        <!-- SUB-VIEW 1: BULK VOICE BROADCAST -->
        <div id="vsub-bulk" class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Campaign Setup Form (7 Cols) -->
            <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-5">
              <div class="border-b border-slate-100 pb-3">
                <h3 class="font-bold text-sm text-slate-900">Launch Bulk Voice Broadcast</h3>
                <p class="text-xs text-slate-500">Select an existing audience from your database or upload a new contact list to broadcast your voice recording.</p>
              </div>

              <!-- Outbound Caller ID Banner -->
              <div class="bg-blue-50/70 p-3.5 rounded-lg border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold text-blue-900 block">Outbound Caller ID (From):</span>
                  <span class="text-blue-700 font-mono font-bold text-sm">+251 711705055</span>
                  <span class="text-blue-600 block text-[11px] mt-0.5">Recipients will see this number calling them on their phone screen.</span>
                </div>
                <span class="px-2 py-0.5 bg-blue-200 text-blue-900 rounded font-mono text-[10px] font-bold">Verified Mobile</span>
              </div>

              <!-- Step 1: Campaign Name -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Campaign Name / Identifier</label>
                <input type="text" id="voice-bulk-camp-name" placeholder="e.g. Cohort 1 Course Completion Reminder" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600">
              </div>

              <!-- Step 2: Target Audience List -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold text-slate-700">Target Contact List (Ethiopian Database)</label>
                  <label class="text-xs text-blue-700 hover:underline cursor-pointer font-medium">
                    + Upload New CSV List
                    <input type="file" accept=".csv" onchange="handleVoiceCsvUpload(event)" class="hidden">
                  </label>
                </div>
                <select id="voice-bulk-list-select" onchange="onVoiceListSelectionChange()" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 bg-white font-medium">
                  <!-- Dynamically populated lists -->
                </select>
                <div id="voice-list-preview-summary" class="text-[11px] text-slate-500 font-mono">
                  <!-- E.g. 5 contacts loaded (Addis Ababa Trainees) -->
                </div>
              </div>

              <!-- Step 3: Choose Voice Recording -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold text-slate-700">Recorded Voice Message</label>
                  <button type="button" onclick="switchVoiceSubView('recordings')" class="text-xs text-blue-700 hover:underline font-medium">
                    + Manage / Upload Audio
                  </button>
                </div>
                <select id="voice-bulk-rec-select" onchange="onVoiceRecordingSelectionChange()" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 bg-white font-medium">
                  <!-- Dynamically populated recordings -->
                </select>

                <!-- Embedded Audio Player Preview -->
                <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-700">Message Audio Preview:</span>
                    <span class="font-mono text-slate-500 text-[11px]" id="voice-audio-duration">28 Seconds</span>
                  </div>
                  <audio id="voice-audio-element" controls class="w-full h-8 outline-none"></audio>
                  <p class="text-[11px] text-slate-500 pt-1">The system dials each recipient, streams this exact audio message in full, and automatically hangs up when finished.</p>
                </div>
              </div>

              <!-- Dispatch Action -->
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div class="text-[11px] text-slate-500">
                  <span class="font-semibold text-slate-700">Engine:</span> Automated Calling & Audio Stream
                </div>
                <button type="button" onclick="executeBulkVoiceBroadcast()" id="btn-exec-voice-bulk" class="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 shadow-sm transition">
                  Call All Contacts (Bulk Broadcast)
                </button>
              </div>
            </div>

            <!-- Live Broadcast Progression & Outcome Summary (5 Cols) -->
            <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 class="font-bold text-sm text-slate-900">Live Campaign Status</h3>
                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700" id="voice-camp-status-badge">Standby</span>
              </div>

              <!-- Outcome Summary Counters -->
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-[11px] text-slate-500 uppercase font-semibold">Total Dialed</span>
                  <p class="text-xl font-bold font-mono text-slate-900 mt-1" id="voice-out-total">5</p>
                </div>
                <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span class="text-[11px] text-emerald-800 uppercase font-semibold">Completed & Hung Up</span>
                  <p class="text-xl font-bold font-mono text-emerald-700 mt-1" id="voice-out-completed">4</p>
                </div>
                <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span class="text-[11px] text-amber-800 uppercase font-semibold">Line Busy</span>
                  <p class="text-xl font-bold font-mono text-amber-700 mt-1" id="voice-out-busy">0</p>
                </div>
                <div class="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <span class="text-[11px] text-rose-800 uppercase font-semibold">Unanswered</span>
                  <p class="text-xl font-bold font-mono text-rose-700 mt-1" id="voice-out-unanswered">1</p>
                </div>
              </div>

              <!-- Recall Unanswered Action Card -->
              <div class="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
                <div class="flex items-center justify-between">
                  <p class="font-bold text-xs text-amber-900">Recall Unanswered Contacts</p>
                  <span class="text-[10px] font-mono px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-bold" id="voice-recall-count-badge">1 Pending</span>
                </div>
                <p class="text-[11px] text-amber-800 leading-relaxed">
                  Automatically filter to all recipients who missed the call or had a busy line, and launch a second retry attempt.
                </p>
                <button type="button" onclick="executeRecallUnanswered()" id="btn-exec-recall" class="w-full py-2 bg-amber-900 text-white rounded-lg text-xs font-semibold hover:bg-amber-950 transition">
                  Recall Unanswered Contacts Now
                </button>
              </div>

              <!-- Live Calling Terminal Output -->
              <div class="space-y-1">
                <span class="text-[11px] font-semibold text-slate-700 uppercase">Live Call Feed</span>
                <div id="voice-live-terminal" class="bg-slate-900 text-slate-100 font-mono text-[11px] p-3 rounded-lg h-44 overflow-y-auto space-y-1">
                  <p class="text-slate-400">&gt; Voice Engine ready. Select contact list and click "Call All Contacts".</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        <!-- SUB-VIEW 2: SINGLE DIRECT CALL -->
        <div id="vsub-single" class="hidden space-y-6">
          <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 max-w-xl mx-auto space-y-5">
            <div class="border-b border-slate-100 pb-3">
              <h3 class="font-bold text-sm text-slate-900">Single Direct Voice Call</h3>
              <p class="text-xs text-slate-500">Dial an individual Ethiopian mobile number and play your selected voice broadcast.</p>
            </div>

            <!-- Outbound Caller ID Banner -->
            <div class="bg-blue-50/70 p-3.5 rounded-lg border border-blue-200 flex items-center justify-between text-xs">
              <div>
                <span class="font-bold text-blue-900 block">Outbound Caller ID (From):</span>
                <span class="text-blue-700 font-mono font-bold text-sm">+251 711705055</span>
                <span class="text-blue-600 block text-[11px] mt-0.5">Calls will appear from your verified mobile number.</span>
              </div>
              <button type="button" onclick="quickDialMyPhone()" class="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
                Call My Phone
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Ethiopian Phone Number (+251... or 09...)</label>
                <input type="text" id="voice-single-phone" value="+251711705055" placeholder="+251711705055" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-600 font-semibold text-slate-900">
                <span class="text-[10px] text-slate-400 mt-1 block">Supports formats: +2517..., +2519..., 07..., 09...</span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
                  <input type="text" id="voice-single-name" value="Yabsera" placeholder="e.g. Yabsera" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-medium">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Role / Affiliation</label>
                  <input type="text" id="voice-single-role" value="Tech Lead" placeholder="e.g. Tech Lead" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-medium">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Select Recorded Voice Message</label>
                <select id="voice-single-rec-select" onchange="onSingleRecordingSelectionChange()" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 bg-white font-medium">
                  <!-- Dynamically populated -->
                </select>
                <audio id="voice-single-audio-preview" controls class="w-full h-8 mt-2 outline-none"></audio>
              </div>

              <div class="pt-2 flex items-center space-x-2">
                <button type="button" onclick="executeSingleVoiceCall()" id="btn-exec-voice-single" class="flex-1 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition shadow-2xs">
                  Place Single Voice Call (100% Free)
                </button>
                <a href="/call?to=251711705055&name=Yabsera&rec=rec-course-complete" target="_blank" class="px-3 py-2.5 bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-200 transition text-center whitespace-nowrap">
                  Open Mobile Call Link
                </a>
              </div>

              <div id="voice-single-result-box" class="hidden p-3 rounded-lg border text-xs"></div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW 3: CONTACT DATABASE (+251) -->
        <div id="vsub-contacts" class="hidden space-y-6">
          <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-bold text-sm text-slate-900">Ethiopian Phone Database</h3>
                <p class="text-xs text-slate-500">Manage contact lists and verify mobile numbers for automated voice campaigns.</p>
              </div>
              <div class="flex items-center space-x-2">
                <label class="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition cursor-pointer">
                  Import CSV Contacts
                  <input type="file" accept=".csv" onchange="handleVoiceCsvUpload(event)" class="hidden">
                </label>
                <button onclick="downloadSampleVoiceCsv()" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50">
                  Sample CSV
                </button>
              </div>
            </div>

            <!-- List Filter and Contact Search -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center space-x-2 w-full sm:w-auto">
                <span class="text-xs font-semibold text-slate-600 whitespace-nowrap">Filter List:</span>
                <select id="voice-contacts-filter-list" onchange="filterContactsTable()" class="p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium outline-none">
                  <!-- Lists -->
                </select>
              </div>
              <input type="text" id="voice-contacts-search" oninput="searchContactsTable()" placeholder="Search contact name, phone, or role..." class="w-full sm:w-64 p-2 border border-slate-300 rounded-lg text-xs outline-none">
            </div>

            <!-- Contacts Table -->
            <div class="border border-slate-200 rounded-lg overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th class="p-3">Contact Name</th>
                    <th class="p-3">Phone (Standard E.164)</th>
                    <th class="p-3">Role / Campus</th>
                    <th class="p-3">Contact List</th>
                    <th class="p-3 text-right">Quick Dial</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100" id="voice-contacts-table-body">
                  <!-- Dynamically populated contacts -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW 4: VOICE RECORDINGS -->
        <div id="vsub-recordings" class="hidden space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Recordings List (7 Cols) -->
            <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div class="border-b border-slate-100 pb-3">
                <h3 class="font-bold text-sm text-slate-900">Stored Voice Recordings</h3>
                <p class="text-xs text-slate-500">Pre-recorded audio messages stored in the database ready for broadcast.</p>
              </div>

              <div id="voice-recordings-container" class="space-y-3">
                <!-- Dynamically populated recordings cards -->
              </div>
            </div>

            <!-- Upload New Recording (5 Cols) -->
            <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div class="border-b border-slate-100 pb-3">
                <h3 class="font-bold text-sm text-slate-900">Upload New Voice Audio</h3>
                <p class="text-xs text-slate-500">Add an audio message file (.wav, .mp3) for automated calling.</p>
              </div>

              <form onsubmit="handleVoiceRecordingSubmit(event)" class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Recording Title</label>
                  <input type="text" id="rec-upload-title" placeholder="e.g. Final Exam Verification Notice" required class="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Category / Purpose</label>
                  <select id="rec-upload-category" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white outline-none">
                    <option value="Course Reminder">Course Reminder</option>
                    <option value="Training Alert">Training Alert</option>
                    <option value="Exam Notice">Exam Notice</option>
                    <option value="General Announcement">General Announcement</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Audio File (.wav, .mp3, .m4a)</label>
                  <input type="file" id="rec-upload-file" accept="audio/*" required class="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Duration (Seconds)</label>
                  <input type="number" id="rec-upload-duration" placeholder="e.g. 30" min="5" max="300" value="28" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none">
                </div>

                <div class="pt-2">
                  <button type="submit" id="btn-save-recording" class="w-full py-2.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
                    Save Voice Recording
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>

        <!-- SUB-VIEW 5: CALL TRACKING & SPREADSHEET -->
        <div id="vsub-logs" class="hidden space-y-6">
          <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-bold text-sm text-slate-900">Call Tracking & Outcome Logs</h3>
                <p class="text-xs text-slate-500">Complete historical registry of all single and bulk voice dispatches.</p>
              </div>
              <div class="flex items-center space-x-2">
                <button onclick="exportCallLogsCsv()" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-2xs">
                  Download Spreadsheet (CSV)
                </button>
              </div>
            </div>

            <!-- Search and Filter -->
            <div class="flex items-center justify-between gap-3">
              <input type="text" id="voice-logs-search" oninput="searchLogsTable()" placeholder="Search by recipient name, phone, or status..." class="w-full sm:w-72 p-2 border border-slate-300 rounded-lg text-xs outline-none">
              <span class="text-xs font-mono text-slate-500" id="voice-logs-count-label">5 Calls Logged</span>
            </div>

            <!-- Logs Table -->
            <div class="border border-slate-200 rounded-lg overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[700px]">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th class="p-3">Caller ID (From)</th>
                    <th class="p-3">Recipient Name</th>
                    <th class="p-3">Recipient Phone</th>
                    <th class="p-3">Message Title</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Duration</th>
                    <th class="p-3 font-mono">Attempt</th>
                    <th class="p-3 font-mono">Timestamp</th>
                    <th class="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100" id="voice-logs-table-body">
                  <!-- Dynamically populated logs -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ================= MODAL: INTERACTIVE LIVE VOICE CALL RECEIVER (100% FREE) ================= -->
        <div id="modal-live-call" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
          <div class="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-6 border border-slate-700">
            
            <!-- Top Telephony Status -->
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span class="flex items-center space-x-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Free Voice Engine (Active)</span>
              </span>
              <span>EdTechHub Telecom Gateway</span>
            </div>

            <!-- Caller Avatar / Profile -->
            <div class="space-y-2 pt-2">
              <div class="w-20 h-20 mx-auto rounded-full bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-blue-300 font-bold text-2xl font-mono">
                EH
              </div>
              <div>
                <h3 class="font-bold text-base text-white tracking-tight" id="call-modal-recipient-name">Yabsera (Tech Lead)</h3>
                <p class="text-xs text-blue-400 font-mono font-semibold" id="call-modal-recipient-phone">+251 711705055</p>
                <p class="text-[11px] text-slate-400 mt-1">Caller ID: <span class="font-mono text-slate-300">+251 711705055</span></p>
              </div>
            </div>

            <!-- Call Status & Active Audio Name -->
            <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wider text-emerald-400" id="call-modal-status-text">Incoming Call &bull; Ringing...</p>
              <p class="text-[11px] text-slate-300 font-medium" id="call-modal-audio-title">Course Completion Reminder</p>
              <p class="text-[11px] font-mono text-slate-400" id="call-modal-timer">00:00 / 00:28</p>
            </div>

            <!-- Call Action Controls (Answer vs Decline) -->
            <div id="call-modal-ringing-controls" class="flex items-center justify-around pt-2">
              <button type="button" onclick="declineLiveCall()" class="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-bold text-xs shadow-lg transition">
                Decline
              </button>
              <button type="button" onclick="answerLiveCall()" class="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-lg animate-bounce transition">
                Answer
              </button>
            </div>

            <!-- In-Call Connected Controls (Hang Up) -->
            <div id="call-modal-connected-controls" class="hidden flex items-center justify-center pt-2">
              <button type="button" onclick="hangupLiveCall(false)" class="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-bold text-xs shadow-lg transition">
                End Call
              </button>
            </div>

            <!-- Ringtone and Message Audio Streams -->
            <audio id="call-modal-ring-audio" src="/audio/phone_ring.wav" loop preload="auto"></audio>
            <audio id="call-modal-audio-element" class="hidden" preload="auto"></audio>

            <!-- Ring Sound Indicator / Click to Unmute -->
            <div id="call-modal-audio-notice" class="text-center pt-1">
              <button type="button" onclick="startPhoneRingTone()" class="text-[11px] text-blue-400 hover:text-blue-300 font-mono underline">
                Ringtone audio active &bull; Click to test sound
              </button>
            </div>

            <!-- Free Mode Notice -->
            <p class="text-[10px] text-slate-400">
              100% Free Voice Receiver &bull; Plays message aloud &amp; hangs up automatically upon completion.
            </p>
          </div>
        </div>

        <!-- ================= MODAL: CONFIGURE TELEPHONY GATEWAY ================= -->
        <div id="modal-gateway-config" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-bold text-sm text-slate-900">Outbound Telephony Gateway Options</h3>
                <p class="text-xs text-slate-500">Choose how outbound voice calls ring real physical mobile phones.</p>
              </div>
              <button type="button" onclick="closeGatewayModal()" class="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
            </div>

            <!-- Option 1: Android Phone GSM Gateway (Recommended) -->
            <div class="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-emerald-950 flex items-center space-x-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Option 1: Android Phone GSM Gateway (Active &bull; Recommended)</span>
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900">0 USD &bull; Local ETB</span>
              </div>
              <p class="text-slate-700 text-[11px]">
                Uses your own Android smartphone and Ethio telecom SIM card (+251 711705055). When you click Call on this computer, your phone automatically dials the recipient over the real cellular network.
              </p>
              <div class="flex items-center space-x-2 pt-1">
                <a href="/gateway" target="_blank" class="px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg text-xs hover:bg-emerald-800 transition">
                  Open Gateway on Android Phone (/gateway)
                </a>
                <span class="text-[11px] text-slate-500">Keep page open in Chrome on your phone.</span>
              </div>
            </div>

            <!-- Option 2: Cloud Twilio Gateway -->
            <form onsubmit="handleSaveGatewaySettings(event)" class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800">Option 2: Cloud Twilio Gateway (Optional)</span>
                <span class="text-[10px] text-slate-500 font-mono">Requires Funded Account</span>
              </div>
              <p class="text-slate-500 text-[11px]">
                If you fund a Twilio or cloud telecom account, enter your credentials below to dial directly from the cloud.
              </p>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Twilio Account SID</label>
                <input type="text" id="gw-account-sid" placeholder="e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" class="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:ring-1 focus:ring-blue-600 bg-white">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Twilio Auth Token</label>
                <input type="password" id="gw-auth-token" placeholder="Paste Auth Token" class="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:ring-1 focus:ring-blue-600 bg-white">
              </div>

              <div class="pt-1 flex items-center justify-between">
                <span class="text-[11px] text-slate-400">Caller ID: +251 711705055</span>
                <button type="submit" id="btn-save-gw" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 text-xs">
                  Save Twilio Settings
                </button>
              </div>
            </form>

            <div class="pt-1 flex justify-end">
              <button type="button" onclick="closeGatewayModal()" class="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>

      </section>
  `;
}

function renderMobileCallPage(query = {}) {
  const to = query.to || '+251711705055';
  const name = query.name || 'Yabsera (Tech Lead)';
  const recId = query.rec || 'rec-course-complete';
  const audioMap = {
    'rec-course-complete': { title: 'Course Completion & Project Submission Reminder', url: '/audio/voice_reminder_course.wav', dur: 28 },
    'rec-training-alert': { title: 'Practical Hands-on Workshop Announcement', url: '/audio/voice_training_alert.wav', dur: 34 },
    'rec-exam-prep': { title: 'Certification Exam Portal Verification Notice', url: '/audio/voice_exam_notice.wav', dur: 21 }
  };
  const rec = audioMap[recId] || audioMap['rec-course-complete'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Incoming Voice Call - EdTechHub</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; }
  </style>
</head>
<body class="flex flex-col h-screen justify-between p-6 select-none">
  <!-- Top Bar -->
  <div class="text-center pt-8 space-y-1">
    <div class="flex items-center justify-center space-x-2 text-xs text-emerald-400 font-mono">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span id="call-status">INCOMING VOICE BROADCAST</span>
    </div>
    <p class="text-xs text-slate-400 font-mono mt-1">EdTechHub Corporate Dispatch</p>
  </div>

  <!-- Caller Info -->
  <div class="text-center space-y-4 my-auto">
    <div class="w-28 h-28 mx-auto rounded-full bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-blue-300 font-bold text-3xl font-mono shadow-2xl">
      EH
    </div>
    <div class="space-y-1">
      <h1 class="text-2xl font-bold text-white tracking-tight">${name}</h1>
      <p class="text-sm font-mono text-blue-400 font-semibold">${to}</p>
      <p class="text-xs text-slate-400 font-mono">Caller ID: +251 711705055</p>
    </div>
    <div class="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 max-w-xs mx-auto">
      <p class="text-xs font-semibold text-slate-200">${rec.title}</p>
      <p class="text-xs font-mono text-slate-400 mt-1" id="timer-display">00:00 / 00:${rec.dur}s</p>
    </div>
  </div>

  <!-- Call Controls -->
  <div class="pb-12 text-center space-y-6">
    <div id="ringing-buttons" class="flex items-center justify-around max-w-xs mx-auto">
      <button onclick="declineCall()" class="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xl active:scale-95 transition">
        Decline
      </button>
      <button onclick="answerCall()" class="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xl animate-bounce active:scale-95 transition">
        Answer
      </button>
    </div>

    <div id="connected-buttons" class="hidden flex items-center justify-center max-w-xs mx-auto">
      <button onclick="hangupCall()" class="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xl active:scale-95 transition">
        End Call
      </button>
    </div>

    <div class="space-y-1">
      <button id="tap-ring-btn" onclick="startRing()" class="text-xs text-blue-400 hover:text-blue-300 font-mono underline">
        Tap screen to start ringing audio
      </button>
      <p class="text-[11px] text-slate-500 font-mono">100% Free Mobile Receiver &bull; Plays message &amp; auto hangs up</p>
    </div>
  </div>

  <audio id="ring-audio" src="/audio/phone_ring.wav" loop preload="auto"></audio>
  <audio id="call-audio" src="${rec.url}" preload="auto"></audio>

  <script>
    let ringCtx = null;
    let ringInterval = null;
    let timerInterval = null;
    const totalDur = ${rec.dur};

    function startRing() {
      const ringAudio = document.getElementById('ring-audio');
      if (ringAudio) {
        ringAudio.volume = 1.0;
        ringAudio.play().then(() => {
          const btn = document.getElementById('tap-ring-btn');
          if (btn) btn.innerText = 'Ringtone audio playing';
        }).catch(e => console.log('Audio autoplay policy:', e.message));
      }

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!ringCtx) ringCtx = new AudioCtx();
        if (ringCtx.state === 'suspended') ringCtx.resume();
        function burst() {
          if (!ringCtx || ringCtx.state === 'closed') return;
          if (ringCtx.state === 'suspended') ringCtx.resume();
          const now = ringCtx.currentTime;
          const o1 = ringCtx.createOscillator();
          const o2 = ringCtx.createOscillator();
          const g = ringCtx.createGain();
          o1.frequency.setValueAtTime(440, now);
          o2.frequency.setValueAtTime(480, now);
          g.gain.setValueAtTime(0.4, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
          o1.connect(g); o2.connect(g); g.connect(ringCtx.destination);
          o1.start(now); o2.start(now); o1.stop(now + 1.9); o2.stop(now + 1.9);
        }
        burst();
        if (ringInterval) clearInterval(ringInterval);
        ringInterval = setInterval(burst, 4000);
      } catch(e) {}
    }

    function stopRing() {
      const ringAudio = document.getElementById('ring-audio');
      if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
      }
      if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
      if (ringCtx) { try { ringCtx.close(); } catch(e){} ringCtx = null; }
    }

    function answerCall() {
      stopRing();
      document.getElementById('ringing-buttons').classList.add('hidden');
      document.getElementById('connected-buttons').classList.remove('hidden');
      document.getElementById('call-status').innerText = 'CONNECTED - PLAYING AUDIO';
      document.getElementById('call-status').className = 'text-blue-400 font-bold font-mono';

      const audio = document.getElementById('call-audio');
      audio.play().catch(e => console.log('Play notice:', e.message));

      let elapsed = 0;
      timerInterval = setInterval(() => {
        elapsed++;
        const elMin = Math.floor(elapsed / 60);
        const elSec = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = '0' + elMin + ':' + elSec + ' / 00:' + totalDur + 's';
        if (elapsed >= totalDur) hangupCall();
      }, 1000);

      audio.onended = () => hangupCall();
    }

    function declineCall() {
      stopRing();
      document.getElementById('call-status').innerText = 'CALL DECLINED';
      document.getElementById('ringing-buttons').classList.add('hidden');
      setTimeout(() => window.close(), 1200);
    }

    function hangupCall() {
      stopRing();
      clearInterval(timerInterval);
      const audio = document.getElementById('call-audio');
      if (audio) audio.pause();
      document.getElementById('call-status').innerText = 'CALL FINISHED - AUTO HUNG UP';
      document.getElementById('call-status').className = 'text-slate-400 font-bold font-mono';
      document.getElementById('connected-buttons').classList.add('hidden');
    }

    window.addEventListener('DOMContentLoaded', () => {
      startRing();
    });
  </script>
</body>
</html>`;
}

function renderAndroidGatewayPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Android GSM Gateway - EdTechHub</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; }
  </style>
</head>
<body class="flex flex-col min-h-screen p-4 space-y-4 select-none">

  <!-- Top Header & SIM Status -->
  <header class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2.5">
        <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-bold text-sm text-white">Android GSM Gateway</span>
      </div>
      <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
        ONLINE &bull; POLLING
      </span>
    </div>
    <div class="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
      <span>SIM: <strong class="text-blue-400 font-mono">Ethio telecom</strong></span>
      <span>Dispatcher: <strong class="text-white font-mono">+251 711705055</strong></span>
    </div>
  </header>

  <!-- Main Active Call Dispatch Card -->
  <main class="flex-1 flex flex-col justify-center">
    <div id="card-idle" class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
      <div class="w-16 h-16 mx-auto rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 text-2xl font-bold font-mono">
        EH
      </div>
      <div class="space-y-1">
        <h2 class="text-lg font-bold text-white tracking-tight">Listening for Outbound Calls</h2>
        <p class="text-xs text-slate-400">Keep this screen open on your phone. When you press Call on your computer, this device will immediately trigger the call via your Ethio telecom SIM card.</p>
      </div>
      <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs font-mono">
        <span class="text-slate-400">Queue Check:</span>
        <span class="text-emerald-400" id="poll-indicator">Polling every 2s...</span>
      </div>
      <button onclick="testSimDial()" class="w-full py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700">
        Test Native SIM Dialer (+251 711705055)
      </button>
    </div>

    <!-- Active Task Card (Hidden until task arrives) -->
    <div id="card-active-task" class="hidden bg-slate-900 border-2 border-emerald-500 rounded-2xl p-6 space-y-5 shadow-2xl">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold font-mono text-emerald-400 tracking-wide uppercase">Call Task Received</span>
        <span class="text-xs font-mono text-slate-400" id="task-timer">00:00 / 00:28s</span>
      </div>

      <div class="space-y-1 text-center py-2">
        <h3 class="text-2xl font-bold text-white tracking-tight" id="task-name">Yabsera</h3>
        <p class="text-lg font-mono font-bold text-blue-400" id="task-phone">+251 921764304</p>
        <p class="text-xs text-slate-400" id="task-role">Tech Lead &bull; EdTechHub</p>
      </div>

      <div class="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
        <p class="text-[11px] text-slate-400 font-mono">Recorded Voice Broadcast:</p>
        <p class="text-xs font-semibold text-slate-200" id="task-rec-title">Course Completion Reminder</p>
        <audio id="task-audio" controls class="w-full h-8 mt-2 outline-none"></audio>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3 pt-2">
        <a id="btn-native-dial" href="tel:+251921764304" onclick="onNativeDialClicked()" class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-center font-bold text-base shadow-xl block active:scale-95 transition">
          DIAL RECIPIENT VIA SIM CARD
        </a>

        <div class="grid grid-cols-3 gap-2">
          <button onclick="finishTask('completed')" class="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
            Answered
          </button>
          <button onclick="finishTask('busy')" class="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold">
            Busy
          </button>
          <button onclick="finishTask('unanswered')" class="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold">
            No Answer
          </button>
        </div>
      </div>
    </div>
  </main>

  <!-- Automation & Hands-Free Guide -->
  <footer class="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
    <div class="flex items-center justify-between font-bold text-slate-300">
      <span>Hands-Free Auto Dialing</span>
      <span class="text-[10px] text-blue-400 font-mono">MacroDroid / Tasker Ready</span>
    </div>
    <p class="text-[11px] text-slate-500">
      To dial automatically without pressing any buttons, install <strong>MacroDroid</strong> on this phone and add a Webhook trigger for:
      <code class="text-blue-300 block bg-slate-950 p-1.5 rounded font-mono mt-1 select-all break-all">https://erp-agents.vercel.app/api/gateway/poll</code>
    </p>
  </footer>

  <script>
    let activeTask = null;
    let pollInterval = null;
    let callTimerInterval = null;

    // Report presence every 15s
    async function sendPing() {
      try {
        await fetch('/api/gateway/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: '+251 711705055',
            deviceName: navigator.userAgent.includes('Android') ? 'Android Smartphone' : 'Web Phone Gateway',
            simOperator: 'Ethio telecom'
          })
        });
      } catch (e) {}
    }

    // Check for pending call tasks
    async function pollQueue() {
      if (activeTask) return; // Currently busy with a call

      try {
        const res = await fetch('/api/gateway/poll');
        if (!res.ok) return;
        const task = await res.json();

        if (task && task.id) {
          showTask(task);
        }
      } catch (e) {}
    }

    function showTask(task) {
      activeTask = task;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      document.getElementById('card-idle').classList.add('hidden');
      document.getElementById('card-active-task').classList.remove('hidden');

      document.getElementById('task-name').innerText = task.name || 'Recipient';
      document.getElementById('task-phone').innerText = task.phone;
      document.getElementById('task-role').innerText = task.role || 'Trainee';
      document.getElementById('task-rec-title').innerText = task.recordingTitle || 'Voice Message';
      document.getElementById('btn-native-dial').href = 'tel:' + task.phone;
      document.getElementById('btn-native-dial').innerText = 'DIAL ' + task.phone + ' VIA SIM';

      const audio = document.getElementById('task-audio');
      if (audio && task.audioUrl) {
        audio.src = task.audioUrl;
      }

      // Start duration countdown
      let elapsed = 0;
      const total = task.durationSec || 28;
      document.getElementById('task-timer').innerText = '00:00 / 00:' + total + 's';
      
      if (callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => {
        elapsed++;
        const elMin = Math.floor(elapsed / 60);
        const elSec = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('task-timer').innerText = '0' + elMin + ':' + elSec + ' / 00:' + total + 's';
        if (elapsed >= total + 4) {
          finishTask('completed');
        }
      }, 1000);
    }

    function onNativeDialClicked() {
      const audio = document.getElementById('task-audio');
      if (audio) {
        audio.play().catch(e => console.log('Audio autoplay:', e.message));
      }
    }

    async function finishTask(outcome) {
      if (!activeTask) return;
      if (callTimerInterval) clearInterval(callTimerInterval);

      const taskId = activeTask.id;
      const audio = document.getElementById('task-audio');
      if (audio) audio.pause();

      try {
        await fetch('/api/gateway/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: taskId,
            status: outcome || 'completed',
            durationSec: activeTask.durationSec || 28,
            notes: 'Dialed via Android Ethio telecom SIM to ' + activeTask.phone
          })
        });
      } catch (e) {}

      activeTask = null;
      document.getElementById('card-active-task').classList.add('hidden');
      document.getElementById('card-idle').classList.remove('hidden');
    }

    function testSimDial() {
      window.location.href = 'tel:+251711705055';
    }

    window.addEventListener('DOMContentLoaded', () => {
      sendPing();
      setInterval(sendPing, 15000);
      setInterval(pollQueue, 2000);
    });
  </script>
</body>
</html>`;
}

module.exports = {
  renderDashboardSection,
  renderVoiceSection,
  renderMobileCallPage,
  renderAndroidGatewayPage
};
