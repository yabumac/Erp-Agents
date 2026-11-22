/**
 * Client-Side JavaScript Logic for Dashboard and Voice Agent
 * Exported as raw string and verified with vm.Script.
 */

function getVoiceClientScript() {
  return `
    // Voice State Store
    let voiceState = {
      lists: [],
      contacts: [],
      recordings: [],
      campaigns: [],
      callLogs: [],
      activeCampaign: null
    };

    function switchVoiceSubView(viewId) {
      ['bulk', 'single', 'contacts', 'recordings', 'logs'].forEach(v => {
        const el = document.getElementById('vsub-' + v);
        const nav = document.getElementById('vnav-' + v);
        if (el) el.classList.add('hidden');
        if (nav) {
          nav.classList.remove('bg-slate-900', 'text-white', 'font-semibold');
          nav.classList.add('text-slate-600');
        }
      });

      const activeEl = document.getElementById('vsub-' + viewId);
      const activeNav = document.getElementById('vnav-' + viewId);
      if (activeEl) activeEl.classList.remove('hidden');
      if (activeNav) {
        activeNav.classList.remove('text-slate-600');
        activeNav.classList.add('bg-slate-900', 'text-white', 'font-semibold');
      }

      if (viewId === 'contacts') renderVoiceContactsTable();
      if (viewId === 'recordings') renderVoiceRecordingsGrid();
      if (viewId === 'logs') renderVoiceLogsTable();
    }

    async function loadDashboardStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) return;
        const data = await res.json();
        const v = data.voice || {};

        const setTxt = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };

        setTxt('dash-voice-campaigns', v.totalCampaigns || 0);
        setTxt('dash-total-calls', v.totalCalls || 0);
        setTxt('dash-completion-rate', (v.completionRate || 0) + '%');
        setTxt('dash-badge-rate', (v.completionRate || 0) + '%');

        setTxt('dash-stat-completed', (v.completedCalls || 0) + ' Calls (' + (v.completionRate || 0) + '%)');
        setTxt('dash-stat-busy', (v.busyCalls || 0) + ' Calls');
        setTxt('dash-stat-unanswered', (v.unansweredCalls || 0) + ' Calls');

        const barComp = document.getElementById('dash-bar-completed');
        if (barComp) barComp.style.width = (v.completionRate || 0) + '%';
        const barBusy = document.getElementById('dash-bar-busy');
        if (barBusy) barBusy.style.width = (v.busyCalls ? Math.min(100, v.busyCalls * 15) : 0) + '%';
        const barUn = document.getElementById('dash-bar-unanswered');
        if (barUn) barUn.style.width = (v.unansweredCalls ? Math.min(100, v.unansweredCalls * 20) : 0) + '%';

        // Render Recent Activity Feed
        const actCont = document.getElementById('dash-activity-container');
        if (actCont && Array.isArray(data.activity) && data.activity.length > 0) {
          actCont.innerHTML = data.activity.map(a => {
            const isVoice = a.agent && a.agent.toLowerCase().includes('voice');
            const badgeClass = isVoice ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-800';
            return '<div class="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">' +
              '<div class="flex items-center justify-between">' +
                '<span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ' + badgeClass + '">' + (a.agent || 'System') + '</span>' +
                '<span class="text-[10px] text-slate-400 font-mono">' + (a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent') + '</span>' +
              '</div>' +
              '<p class="text-xs font-bold text-slate-800">' + (a.title || 'System Notification') + '</p>' +
              '<p class="text-[11px] text-slate-500">' + (a.detail || '') + '</p>' +
            '</div>';
          }).join('');
        }

        // Render DB Provider
        const dbRes = await fetch('/api/db/status');
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          setTxt('dash-db-provider', dbData.provider || 'Persistent Store');
        }
      } catch (e) {
        console.warn('Dashboard stats notice:', e.message);
      }
    }

    async function loadVoiceState() {
      try {
        const [lRes, rRes, cRes, logRes] = await Promise.all([
          fetch('/api/voice/lists'),
          fetch('/api/voice/recordings'),
          fetch('/api/voice/campaigns'),
          fetch('/api/voice/call-logs')
        ]);

        if (lRes.ok) voiceState.lists = await lRes.json();
        if (rRes.ok) voiceState.recordings = await rRes.json();
        if (cRes.ok) voiceState.campaigns = await cRes.json();
        if (logRes.ok) voiceState.callLogs = await logRes.json();

        // Populate Contact Lists Selectors
        const listSelect = document.getElementById('voice-bulk-list-select');
        const filterSelect = document.getElementById('voice-contacts-filter-list');
        if (listSelect) {
          listSelect.innerHTML = voiceState.lists.map(l =>
            '<option value="' + l.id + '">' + l.name + '</option>'
          ).join('');
        }
        if (filterSelect) {
          filterSelect.innerHTML = '<option value="">All Contact Lists</option>' +
            voiceState.lists.map(l => '<option value="' + l.id + '">' + l.name + '</option>').join('');
        }

        // Populate Recordings Selectors
        const recSelect = document.getElementById('voice-bulk-rec-select');
        const singleRecSelect = document.getElementById('voice-single-rec-select');
        const recOptions = voiceState.recordings.map(r =>
          '<option value="' + r.id + '" data-url="' + (r.audioUrl || '') + '" data-dur="' + (r.durationSec || 25) + '">' +
            r.title + ' (' + (r.durationSec || 25) + 's)' +
          '</option>'
        ).join('');

        if (recSelect) recSelect.innerHTML = recOptions;
        if (singleRecSelect) singleRecSelect.innerHTML = recOptions;

        onVoiceListSelectionChange();
        onVoiceRecordingSelectionChange();
        onSingleRecordingSelectionChange();
        renderVoiceLogsTable();
      } catch (e) {
        console.warn('Voice state load notice:', e.message);
      }
    }

    async function onVoiceListSelectionChange() {
      const select = document.getElementById('voice-bulk-list-select');
      if (!select) return;
      const listId = select.value;
      const summary = document.getElementById('voice-list-preview-summary');

      try {
        const res = await fetch('/api/voice/contacts?listId=' + encodeURIComponent(listId));
        if (res.ok) {
          const contacts = await res.json();
          voiceState.contacts = contacts;
          if (summary) {
            summary.innerText = contacts.length + ' Ethiopian contacts ready in selected list (' +
              contacts.slice(0, 3).map(c => c.name).join(', ') + (contacts.length > 3 ? '...' : '') + ')';
          }
          const totalOut = document.getElementById('voice-out-total');
          if (totalOut) totalOut.innerText = contacts.length;
        }
      } catch (e) {}
    }

    function onVoiceRecordingSelectionChange() {
      const select = document.getElementById('voice-bulk-rec-select');
      const audio = document.getElementById('voice-audio-element');
      const durLabel = document.getElementById('voice-audio-duration');
      if (!select || !select.selectedOptions || !select.selectedOptions[0]) return;

      const opt = select.selectedOptions[0];
      const url = opt.getAttribute('data-url');
      const dur = opt.getAttribute('data-dur');

      if (durLabel) durLabel.innerText = dur + ' Seconds';
      if (audio && url) {
        audio.src = url;
      }
    }

    function onSingleRecordingSelectionChange() {
      const select = document.getElementById('voice-single-rec-select');
      const audio = document.getElementById('voice-single-audio-preview');
      if (!select || !select.selectedOptions || !select.selectedOptions[0]) return;

      const url = select.selectedOptions[0].getAttribute('data-url');
      if (audio && url) audio.src = url;
    }

    // Execute Bulk Voice Campaign
    async function executeBulkVoiceBroadcast() {
      const listSelect = document.getElementById('voice-bulk-list-select');
      const recSelect = document.getElementById('voice-bulk-rec-select');
      const campNameInput = document.getElementById('voice-bulk-camp-name');
      const btn = document.getElementById('btn-exec-voice-bulk');
      const terminal = document.getElementById('voice-live-terminal');
      const statusBadge = document.getElementById('voice-camp-status-badge');

      if (!listSelect || !listSelect.value) return alert('Please select a target contact list.');
      if (!recSelect || !recSelect.value) return alert('Please select a voice recording.');

      const listId = listSelect.value;
      const recordingId = recSelect.value;
      const campName = campNameInput ? campNameInput.value.trim() : '';

      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Calling Recipients...';
      }
      if (statusBadge) {
        statusBadge.innerText = 'Dialing';
        statusBadge.className = 'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800';
      }

      const logTerminal = (msg) => {
        if (!terminal) return;
        const p = document.createElement('p');
        p.innerText = '> ' + msg;
        terminal.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
      };

      logTerminal('Initiating bulk voice broadcast engine...');
      logTerminal('Outbound Caller ID (From): +251 711705055 (EdTechHub Corporate Dispatch)');

      try {
        const res = await fetch('/api/voice/campaigns/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: campName, listId, recordingId, callerId: '+251711705055' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to dispatch voice campaign');

        voiceState.activeCampaign = data.campaign;

        logTerminal('Active Broadcast Audio: "' + (data.campaign.recordingTitle || 'Voice Message') + '"');
        if (Array.isArray(data.callLogs) && data.callLogs.length > 0) {
          data.callLogs.forEach((l, idx) => {
            logTerminal('Dialing [' + (idx + 1) + '/' + data.callLogs.length + ']: ' + l.contactName + ' (' + (l.normalizedPhone || l.phone) + ') from Caller ID: ' + (data.callerId || '+251 711705055') + ' -> ' + (l.status || 'COMPLETED').toUpperCase());
          });
        }
        logTerminal('Dispatched ' + (data.totalProcessed || 0) + ' outbound voice calls from +251 711705055.');
        logTerminal('Answered & Completed: ' + data.campaign.completedCount);
        logTerminal('Line Busy: ' + data.campaign.busyCount);
        logTerminal('Unanswered: ' + data.campaign.unansweredCount);
        logTerminal('All connected sessions finished audio stream and hung up automatically.');

        // Update Summary Badges
        const setTxt = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };

        setTxt('voice-out-total', data.totalProcessed || 0);
        setTxt('voice-out-completed', data.campaign.completedCount || 0);
        setTxt('voice-out-busy', data.campaign.busyCount || 0);
        setTxt('voice-out-unanswered', data.campaign.unansweredCount || 0);
        setTxt('voice-recall-count-badge', (data.campaign.unansweredCount || 0) + ' Pending');

        if (statusBadge) {
          statusBadge.innerText = 'Completed';
          statusBadge.className = 'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800';
        }

        await loadVoiceState();
        await loadDashboardStats();
      } catch (err) {
        logTerminal('Error: ' + err.message);
        alert('Voice campaign notice: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Call All Contacts (Bulk Broadcast)';
        }
      }
    }

    // Recall Unanswered
    async function executeRecallUnanswered() {
      const camp = voiceState.activeCampaign || (voiceState.campaigns && voiceState.campaigns[0]);
      if (!camp) return alert('No campaign active for recall. Run a bulk voice campaign first.');

      const btn = document.getElementById('btn-exec-recall');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Recalling Missed Contacts...';
      }

      try {
        const res = await fetch('/api/voice/recall-unanswered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: camp.id })
        });

        const data = await res.json();
        if (data.retriedCount === 0) {
          alert('All recipients already answered and completed the call. No pending retries needed.');
        } else {
          alert('Recall Batch Completed: Re-dialed ' + data.retriedCount + ' contacts. ' + data.newlyAnswered + ' answered and completed the message on retry.');
        }

        await loadVoiceState();
        await loadDashboardStats();
      } catch (e) {
        alert('Recall notice: ' + e.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Recall Unanswered Contacts Now';
        }
      }
    }

    // ================= LIVE CALL RECEIVER CONTROLLER (100% FREE) =================
    let liveCallRingCtx = null;
    let liveCallRingInterval = null;
    let liveCallTimerInterval = null;
    let liveCallActiveDuration = 28;

    function startPhoneRingTone() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!liveCallRingCtx) {
          liveCallRingCtx = new AudioCtx();
        }
        if (liveCallRingCtx.state === 'suspended') {
          liveCallRingCtx.resume();
        }

        function playBurst() {
          if (!liveCallRingCtx) return;
          const now = liveCallRingCtx.currentTime;
          const o1 = liveCallRingCtx.createOscillator();
          const o2 = liveCallRingCtx.createOscillator();
          const gain = liveCallRingCtx.createGain();

          // Authentic Telephony Dual-Frequency Ringtone: 440 Hz + 480 Hz
          o1.frequency.setValueAtTime(440, now);
          o2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          o1.connect(gain);
          o2.connect(gain);
          gain.connect(liveCallRingCtx.destination);

          o1.start(now);
          o2.start(now);
          o1.stop(now + 1.8);
          o2.stop(now + 1.8);
        }

        playBurst();
        liveCallRingInterval = setInterval(playBurst, 4000);
      } catch (e) {
        console.warn('Web Audio Ringtone notice:', e.message);
      }
    }

    function stopPhoneRingTone() {
      if (liveCallRingInterval) {
        clearInterval(liveCallRingInterval);
        liveCallRingInterval = null;
      }
      if (liveCallRingCtx) {
        try {
          liveCallRingCtx.close();
        } catch (e) {}
        liveCallRingCtx = null;
      }
    }

    function playHangupTone() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        setTimeout(() => ctx.close(), 500);
      } catch (e) {}
    }

    function showLiveCallModal(callData) {
      callData = callData || {};
      const modal = document.getElementById('modal-live-call');
      if (!modal) return;

      const nameEl = document.getElementById('call-modal-recipient-name');
      const phoneEl = document.getElementById('call-modal-recipient-phone');
      const titleEl = document.getElementById('call-modal-audio-title');
      const timerEl = document.getElementById('call-modal-timer');
      const statusEl = document.getElementById('call-modal-status-text');
      const audioEl = document.getElementById('call-modal-audio-element');

      const ringingControls = document.getElementById('call-modal-ringing-controls');
      const connectedControls = document.getElementById('call-modal-connected-controls');

      const name = callData.name || 'Yabsera (Tech Lead)';
      const phone = callData.phone || '+251 711705055';
      const title = callData.title || 'Course Completion & Project Submission Reminder';
      const audioUrl = callData.audioUrl || '/audio/voice_reminder_course.wav';
      liveCallActiveDuration = Number(callData.durationSec) || 28;

      if (nameEl) nameEl.innerText = name;
      if (phoneEl) phoneEl.innerText = phone;
      if (titleEl) titleEl.innerText = title;
      if (timerEl) timerEl.innerText = '00:00 / 00:' + liveCallActiveDuration + 's';
      if (statusEl) {
        statusEl.innerText = 'Incoming Call • Ringing...';
        statusEl.className = 'text-xs font-semibold uppercase tracking-wider text-emerald-400';
      }

      if (ringingControls) ringingControls.classList.remove('hidden');
      if (connectedControls) connectedControls.classList.add('hidden');

      if (audioEl) {
        audioEl.src = audioUrl;
        audioEl.currentTime = 0;
      }

      modal.classList.remove('hidden');
      startPhoneRingTone();
    }

    function answerLiveCall() {
      stopPhoneRingTone();
      const statusEl = document.getElementById('call-modal-status-text');
      const ringingControls = document.getElementById('call-modal-ringing-controls');
      const connectedControls = document.getElementById('call-modal-connected-controls');
      const audioEl = document.getElementById('call-modal-audio-element');
      const timerEl = document.getElementById('call-modal-timer');

      if (ringingControls) ringingControls.classList.add('hidden');
      if (connectedControls) connectedControls.classList.remove('hidden');

      if (statusEl) {
        statusEl.innerText = 'Connected • Streaming Voice Message';
        statusEl.className = 'text-xs font-semibold uppercase tracking-wider text-blue-400';
      }

      if (audioEl) {
        audioEl.play().catch(e => console.warn('Audio playback notice:', e.message));
        audioEl.onended = function() {
          hangupLiveCall(true);
        };
      }

      if (liveCallTimerInterval) clearInterval(liveCallTimerInterval);
      let elapsed = 0;
      liveCallTimerInterval = setInterval(() => {
        elapsed++;
        const elMin = Math.floor(elapsed / 60);
        const elSec = (elapsed % 60).toString().padStart(2, '0');
        if (timerEl) {
          timerEl.innerText = '0' + elMin + ':' + elSec + ' / 00:' + liveCallActiveDuration + 's';
        }
        if (elapsed >= liveCallActiveDuration) {
          hangupLiveCall(true);
        }
      }, 1000);
    }

    function declineLiveCall() {
      stopPhoneRingTone();
      if (liveCallTimerInterval) clearInterval(liveCallTimerInterval);
      const statusEl = document.getElementById('call-modal-status-text');
      if (statusEl) {
        statusEl.innerText = 'Call Declined';
        statusEl.className = 'text-xs font-semibold uppercase tracking-wider text-rose-400';
      }
      playHangupTone();
      setTimeout(() => {
        const modal = document.getElementById('modal-live-call');
        if (modal) modal.classList.add('hidden');
      }, 900);
    }

    function hangupLiveCall(isAutoCompleted) {
      stopPhoneRingTone();
      if (liveCallTimerInterval) {
        clearInterval(liveCallTimerInterval);
        liveCallTimerInterval = null;
      }
      const audioEl = document.getElementById('call-modal-audio-element');
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }

      const statusEl = document.getElementById('call-modal-status-text');
      if (statusEl) {
        statusEl.innerText = isAutoCompleted ? 'Completed • Auto Hung Up' : 'Call Terminated';
        statusEl.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
      }

      playHangupTone();
      setTimeout(() => {
        const modal = document.getElementById('modal-live-call');
        if (modal) modal.classList.add('hidden');
      }, 1200);
    }

    // Execute Single Call
    async function executeSingleVoiceCall() {
      const phoneInput = document.getElementById('voice-single-phone');
      const nameInput = document.getElementById('voice-single-name');
      const roleInput = document.getElementById('voice-single-role');
      const recSelect = document.getElementById('voice-single-rec-select');
      const btn = document.getElementById('btn-exec-voice-single');
      const resultBox = document.getElementById('voice-single-result-box');

      const phone = phoneInput ? phoneInput.value.trim() : '';
      if (!phone) return alert('Please enter an Ethiopian phone number (e.g. +251711705055 or 0711705055).');

      const name = nameInput ? nameInput.value.trim() : 'Direct Recipient';
      const role = roleInput ? roleInput.value.trim() : 'Trainee';
      const recordingId = recSelect ? recSelect.value : '';

      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Connecting Call from +251 711705055...';
      }

      try {
        const res = await fetch('/api/voice/call-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name, role, recordingId, callerId: '+251711705055' })
        });
        const data = await res.json();

        const recObj = (voiceState.recordings || []).find(r => r.id === recordingId) || {
          title: 'Course Completion Reminder',
          audioUrl: '/audio/voice_reminder_course.wav',
          durationSec: 28
        };

        if (resultBox) {
          resultBox.classList.remove('hidden');
          const isComp = data.status === 'completed';
          resultBox.className = 'p-3 rounded-lg border text-xs ' +
            (isComp ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900');
          resultBox.innerHTML = '<div class="space-y-1">' +
            '<p class="font-bold text-sm">Call Outcome: ' + (data.status || 'Completed').toUpperCase() + '</p>' +
            '<p class="font-mono text-slate-700"><strong>Outbound Caller ID (From):</strong> +251 711705055</p>' +
            '<p class="font-mono text-slate-700"><strong>Dialed Recipient (To):</strong> ' + (data.normalizedPhone || phone) + ' (' + name + ')</p>' +
            '<p class="mt-1 text-slate-600">' + (data.notes || 'Streamed voice message and hung up automatically upon audio completion.') + '</p>' +
            '<p class="font-mono text-[11px] text-slate-400 mt-1">Duration: ' + (data.durationSec || 0) + 's | Attempt #' + (data.attempt || 1) + '</p>' +
            '<div class="pt-2 flex items-center space-x-2">' +
              '<button type="button" onclick="showLiveCallModal({ name: \\'' + name.replace(/'/g, "\\\\'") + '\\', phone: \\'' + (data.normalizedPhone || phone) + '\\', title: \\'' + recObj.title.replace(/'/g, "\\\\'") + '\\', audioUrl: \\'' + (recObj.audioUrl || '/audio/voice_reminder_course.wav') + '\\', durationSec: ' + (recObj.durationSec || 28) + ' })" class="px-3 py-1.5 bg-blue-700 text-white font-semibold rounded text-xs hover:bg-blue-800">' +
                'Replay Live Call' +
              '</button>' +
              '<a href="/call?to=' + encodeURIComponent(data.normalizedPhone || phone) + '&name=' + encodeURIComponent(name) + '&rec=' + encodeURIComponent(recordingId || 'rec-course-complete') + '" target="_blank" class="px-3 py-1.5 bg-white border border-slate-300 font-semibold text-slate-700 rounded text-xs hover:bg-slate-50">' +
                'Open Mobile Link' +
              '</a>' +
            '</div>' +
          '</div>';
        }

        // Trigger Live Call Modal Ringing immediately
        showLiveCallModal({
          name: name,
          phone: data.normalizedPhone || phone,
          title: data.recordingTitle || recObj.title,
          audioUrl: recObj.audioUrl || '/audio/voice_reminder_course.wav',
          durationSec: data.durationSec || recObj.durationSec || 28
        });

        await loadVoiceState();
        await loadDashboardStats();
      } catch (e) {
        alert('Call notice: ' + e.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Place Single Voice Call (100% Free)';
        }
      }
    }

    function quickDialMyPhone() {
      switchVoiceSubView('single');
      const pIn = document.getElementById('voice-single-phone');
      const nIn = document.getElementById('voice-single-name');
      const rIn = document.getElementById('voice-single-role');
      if (pIn) pIn.value = '+251711705055';
      if (nIn) nIn.value = 'Yabsera';
      if (rIn) rIn.value = 'Tech Lead';
    }

    function quickDialContact(name, phone, role) {
      switchVoiceSubView('single');
      const pIn = document.getElementById('voice-single-phone');
      const nIn = document.getElementById('voice-single-name');
      const rIn = document.getElementById('voice-single-role');
      if (pIn) pIn.value = phone;
      if (nIn) nIn.value = name;
      if (rIn) rIn.value = role;
    }

    function renderVoiceContactsTable() {
      const tbody = document.getElementById('voice-contacts-table-body');
      if (!tbody) return;

      const contacts = voiceState.contacts || [];
      if (!contacts.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">No contacts in this list. Click "Import CSV Contacts" to upload.</td></tr>';
        return;
      }

      tbody.innerHTML = contacts.map(c =>
        '<tr class="hover:bg-slate-50 transition">' +
          '<td class="p-3 font-semibold text-slate-900">' + c.name + '</td>' +
          '<td class="p-3 font-mono font-medium text-slate-700">' + (c.normalizedPhone || c.phone) + '</td>' +
          '<td class="p-3 text-slate-600">' + (c.role || 'Trainee') + (c.notes ? ' (' + c.notes + ')' : '') + '</td>' +
          '<td class="p-3 text-slate-500 font-mono text-[11px]">' + (c.listName || 'Cohort List') + '</td>' +
          '<td class="p-3 text-right">' +
            '<button onclick="quickDialContact(\\'' + c.name.replace(/'/g, "\\\\'") + '\\', \\'' + (c.normalizedPhone || c.phone) + '\\', \\'' + (c.role || '').replace(/'/g, "\\\\'") + '\\')" class="px-2.5 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">' +
              'Call' +
            '</button>' +
          '</td>' +
        '</tr>'
      ).join('');
    }

    function renderVoiceRecordingsGrid() {
      const cont = document.getElementById('voice-recordings-container');
      if (!cont) return;

      const recs = voiceState.recordings || [];
      if (!recs.length) {
        cont.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">No voice recordings stored. Upload an audio file to begin.</p>';
        return;
      }

      cont.innerHTML = recs.map(r =>
        '<div class="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">' +
          '<div class="flex items-center justify-between">' +
            '<span class="font-bold text-xs text-slate-900">' + r.title + '</span>' +
            '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold">' + (r.category || 'Audio') + '</span>' +
          '</div>' +
          '<p class="text-[11px] text-slate-500">' + (r.description || 'Automated voice broadcast audio file.') + '</p>' +
          '<div class="flex items-center justify-between pt-1">' +
            '<audio controls src="' + (r.audioUrl || '') + '" class="h-7 w-64 outline-none"></audio>' +
            '<span class="text-xs font-mono text-slate-400">' + (r.durationSec || 25) + 's</span>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    function renderVoiceLogsTable() {
      const tbody = document.getElementById('voice-logs-table-body');
      const countLabel = document.getElementById('voice-logs-count-label');
      if (!tbody) return;

      const logs = voiceState.callLogs || [];
      if (countLabel) countLabel.innerText = logs.length + ' Calls Logged';

      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">No voice calls placed yet.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(l => {
        let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        if (l.status === 'unanswered' || l.status === 'no-answer') {
          badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
        } else if (l.status === 'busy' || l.status === 'rejected') {
          badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
        }

        const dateStr = l.calledAt ? new Date(l.calledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';

        return '<tr class="hover:bg-slate-50 transition">' +
          '<td class="p-3 font-mono font-bold text-blue-700 text-xs">' + (l.callerId || '+251711705055') + '</td>' +
          '<td class="p-3 font-semibold text-slate-900">' + l.contactName + '</td>' +
          '<td class="p-3 font-mono font-medium text-slate-700">' + (l.normalizedPhone || l.phone) + '</td>' +
          '<td class="p-3 text-slate-700 truncate max-w-xs">' + (l.recordingTitle || 'Voice Message') + '</td>' +
          '<td class="p-3">' +
            '<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold border ' + badgeClass + '">' +
              (l.status || 'completed').toUpperCase() +
            '</span>' +
          '</td>' +
          '<td class="p-3 font-mono text-slate-600">' + (l.durationSec || 0) + 's</td>' +
          '<td class="p-3 font-mono text-slate-500">#' + (l.attempt || 1) + '</td>' +
          '<td class="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">' + dateStr + '</td>' +
          '<td class="p-3 text-slate-500 text-[11px] truncate max-w-xs">' + (l.notes || '') + '</td>' +
        '</tr>';
      }).join('');
    }

    function searchLogsTable() {
      const q = (document.getElementById('voice-logs-search').value || '').toLowerCase();
      const rows = document.querySelectorAll('#voice-logs-table-body tr');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    }

    function searchContactsTable() {
      const q = (document.getElementById('voice-contacts-search').value || '').toLowerCase();
      const rows = document.querySelectorAll('#voice-contacts-table-body tr');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    }

    function filterContactsTable() {
      const listId = document.getElementById('voice-contacts-filter-list').value;
      if (!listId) {
        renderVoiceContactsTable();
        return;
      }
      fetch('/api/voice/contacts?listId=' + encodeURIComponent(listId))
        .then(r => r.json())
        .then(data => {
          voiceState.contacts = data;
          renderVoiceContactsTable();
        });
    }

    function downloadSampleVoiceCsv() {
      window.location.href = '/api/voice/sample-contacts-csv';
    }

    function exportCallLogsCsv() {
      const camp = voiceState.activeCampaign;
      const url = '/api/voice/export-csv' + (camp ? '?campaignId=' + encodeURIComponent(camp.id) : '');
      window.location.href = url;
    }

    // Handle CSV Import
    function handleVoiceCsvUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async function(evt) {
        const text = evt.target.result;
        try {
          const res = await fetch('/api/voice/upload-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csvContent: text, listName: file.name.replace(/\.[^/.]+$/, '') })
          });
          const data = await res.json();
          alert('Imported ' + (data.contacts ? data.contacts.length : 'all') + ' contacts into Ethiopian phone database.');
          await loadVoiceState();
          switchVoiceSubView('contacts');
        } catch (err) {
          alert('Upload notice: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    // Handle Audio Recording Upload
    async function handleVoiceRecordingSubmit(e) {
      e.preventDefault();
      const title = document.getElementById('rec-upload-title').value.trim();
      const category = document.getElementById('rec-upload-category').value;
      const duration = document.getElementById('rec-upload-duration').value;
      const fileInput = document.getElementById('rec-upload-file');
      const btn = document.getElementById('btn-save-recording');

      if (!fileInput.files || !fileInput.files[0]) return alert('Please select an audio file.');

      const file = fileInput.files[0];
      btn.disabled = true;
      btn.innerText = 'Uploading Audio...';

      const reader = new FileReader();
      reader.onload = async function(evt) {
        const base64 = evt.target.result;
        try {
          const res = await fetch('/api/voice/recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              category,
              durationSec: Number(duration) || 28,
              fileName: file.name,
              sizeBytes: file.size,
              mimeType: file.type || 'audio/wav',
              audioBase64: base64
            })
          });
          const data = await res.json();
          alert('Voice recording "' + data.title + '" saved successfully.');
          await loadVoiceState();
          switchVoiceSubView('recordings');
        } catch (err) {
          alert('Save notice: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.innerText = 'Save Voice Recording';
        }
      };
      reader.readAsDataURL(file);
    }
  `;
}

module.exports = {
  getVoiceClientScript
};
