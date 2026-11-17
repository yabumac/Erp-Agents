# User Interface Information Architecture (IA)

Design Systems, Layout Hierarchy, and Page Inventories for the White-Label Shell

---

## 1. App Shell Architecture

The user interface follows a dense, calm, keyboard-first design philosophy. It operates as a unified operational console rather than a fragmented suite of applications.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Workspace Switcher | Search (Cmd+K) | Quick Create (+) | Notifications | User │
├───────────────┬────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR       │ MAIN CONTENT AREA                                                      │
│ (Grouped by   │                                                                        │
│ Manifest)     │ ┌────────────────────────────────────────────────────────────────────┐ │
│               │ │ Breadcrumbs / View Header / Primary Actions                        │ │
│ Communicate   │ ├────────────────────────────────────────────────────────────────────┤ │
│  - Mail       │ │ Data Table / Detail Panels / Canvas / Widgets                      │ │
│  - Voice      │ │                                                                    │ │
│ Sell          │ │                                                                    │ │
│  - CRM        │ │                                                                    │ │
│ Operate       │ │                                                                    │ │
│  - Inventory  │ │                                                                    │ │
│ Finance       │ │                                                                    │ │
│  - Invoicing  │ │                                                                    │ │
│ Insights      │ │                                                                    │ │
│  - Automations│ │                                                                    │ │
│ Admin         │ └────────────────────────────────────────────────────────────────────┘ │
│  - Settings   │                                                                        │
└───────────────┴────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Sidebar Navigation Groups
The collapsible sidebar dynamically assembles based on enabled module manifests:
- **Communicate:** Mail (Inbox, Campaigns, Audiences, Templates), Voice (Calls, Flows, Phone Numbers).
- **Sell:** CRM (Contacts, Companies, Deals, Pipelines).
- **Operate:** Inventory (Items, Warehouses, Stock Movements, Stock Counts).
- **Finance:** Invoicing (Invoices, Credit Notes, Payments, Chart of Accounts, Journal).
- **Insights:** Automations (Workflows, Run Logs), Analytics.
- **Top-Level Special Surface:** **Approval Queue** (Central triage for pending agent proposals across all modules).
- **Admin:** Team & Roles, Billing & Usage, API & Webhooks, Audit Log, Brand Settings.

### 1.2 Top Navigation Bar
1. **Workspace Switcher:** Instant tenant / organization switching with keyboard shortcut.
2. **Global Command Palette (`Cmd/Ctrl+K`):** Global fuzzy search across all module records (contacts, invoices, inventory items, deals) and quick actions ("Create Invoice", "Draft Email", "Place Call").
3. **Quick Create (`+`):** Contextual shortcut dropdown to create new entity without leaving current view.
4. **Notification Center:** Bell icon with unread badge displaying system notifications and agent alerts.
5. **User Profile Menu:** Account settings, dark/light mode toggle, sign out.

### 1.3 Mobile Bottom Navigation (< 768px)
On mobile displays, the desktop sidebar collapses into a 4-tab bottom navigation bar:
- **Home:** Executive summary & Needs Attention rail.
- **Inbox:** Unified mail and customer messaging.
- **CRM:** Quick contact and deal lookup.
- **More:** Drawer exposing remaining enabled modules and settings.

---

## 2. Complete Page Inventory (Wave-1 Modules)

### 2.1 Home & Executive Dashboard
- **Path:** `/`
- **Sections:**
  - **Needs-Attention Rail:** Urgent approvals awaiting human review, overdue invoices, low-stock threshold alerts, missed incoming voice calls.
  - **Module Metric Cards:** Contributed dynamically by enabled modules (e.g. Mail response time, 30-day revenue, inventory valuation, call containment rate).
  - **Recent Activity Feed:** Real-time stream of audit events and completed workflows.

### 2.2 Approval Queue (Central Agent Surface)
- **Path:** `/approvals`
- **Views:**
  - Filter by Risk Level (`all`, `financial`, `external-send`, `write`).
  - Filter by Module (`mail`, `voice`, `inventory`, `invoicing`, `crm`).
- **Review Drawer / Modal:**
  - Action summary and structured payload preview.
  - Agent rationale and confidence score.
  - Source citations (links to retrieved knowledge chunks or previous customer emails).
  - One-click actions: `[Approve & Execute]`, `[Edit & Approve]`, `[Reject]`, `[Always Allow Pattern]`.

### 2.3 Mail Module
- **Inbox View (`/mail`):**
  - Left pane: Folders (`Inbox`, `Drafts`, `Sent`, `Archive`, `Spam`) and Category Tabs (`Support`, `Sales`, `Billing`, `General`).
  - Middle pane: Virtualized thread list with sender, subject, snippet, category badge, and assignment avatar.
  - Right pane: Active thread conversation view, inline rich reply editor (TipTap), agent draft suggestions, and right-hand Customer CRM context sidebar.
- **Compose (`/mail/compose`):**
  - Full-screen or floating dialog with merge-tag chip support, template selector, spam-risk checker, and scheduled send.
- **Audiences (`/mail/audiences`):**
  - Audience directory with member counts and CSV upload modal with drag-and-drop column mapping.
- **Campaigns (`/mail/campaigns`):**
  - Campaign table with delivery stats (Sent, Opened %, Clicked %, Bounced %).
  - Wizard: `/mail/campaigns/new` (Step 1: Audience → Step 2: A/B Templates → Step 3: Throttling & Sending Window → Step 4: Review & Send).
- **Deliverability (`/mail/domains`):**
  - Domain status cards verifying DNS TXT/CNAME records (SPF, DKIM, DMARC, MX).

### 2.4 Voice Module
- **Call Board (`/voice`):**
  - Tabbed view: `Live Calls`, `Completed Calls`, `Voicemail`.
  - Table: Direction icon, caller number, contact name, duration, AI containment status (`Contained` / `Transferred`), sentiment badge.
- **Call Detail View (`/voice/calls/[id]`):**
  - Audio waveform player with playback speed controls and download button.
  - Synchronized interactive transcript with timestamp markers and speaker identification.
  - AI Call Summary, extracted action items, and linked CRM contact/deal.
- **Flow Builder Canvas (`/voice/flows/[id]`):**
  - Visual node canvas (React Flow): Greeting node, Intent classifier, Knowledge lookup, Module tool invocation, Human transfer, Voicemail.
  - Embedded **Browser Test Console**: Simulated WebRTC voice call to test flow logic before publishing.
- **Phone Numbers (`/voice/numbers`):**
  - Number inventory with Twilio provisioning drawer.
- **Compliance Center (`/voice/compliance`):**
  - Regional rules, calling hours schedule, DNC registry upload, and mandatory AI recording disclosure editor.

### 2.5 CRM Module
- **Contacts (`/crm/contacts`):**
  - Data table with search, saved views (`All`, `My Contacts`, `VIP Customers`), column toggle, and bulk actions (Tag, Delete, Export CSV).
- **Contact Profile (`/crm/contacts/[id]`):**
  - Header: Name, title, company link, avatar, contact buttons (Email, Call).
  - Activity Timeline: Chronological feed of emails, calls, notes, deals, and invoices.
  - Agent Memory Panel: Inferred preferences and notes with human deletion control.
- **Deals & Pipelines (`/crm/deals`):**
  - Switchable view: **Kanban Board** (drag cards across stage columns with total value headers) and **Data Table**.
  - Pipeline Settings: Configure stages, order, and win probability percentages.

### 2.6 Inventory Module
- **Item Master Catalog (`/inventory/items`):**
  - Item catalog showing SKU, barcode, unit of measure, total on-hand stock, reorder status badge (`Adequate`, `Low Stock`, `Out of Stock`).
- **Item Detail View (`/inventory/items/[id]`):**
  - Variant matrix (Color, Size) with independent SKUs and prices.
  - Stock distribution table across warehouses and bin locations.
  - Filterable **Stock Movement Ledger** showing historical in/out balance shifts.
- **Stock Movement Log (`/inventory/movements`):**
  - Immutable ledger view: Timestamp, Item SKU, Warehouse, Movement Type (`Receive`, `Ship`, `Adjust`), Signed Quantity, Created By.
- **Stock Take / Physical Count (`/inventory/counts`):**
  - Active count reconciliation interface: Expected Quantity vs Counted Quantity with automated variance calculation and one-click ledger adjustment.

### 2.7 Invoicing & Finance Module
- **Invoice Register (`/invoicing/invoices`):**
  - Status filter tabs (`All`, `Draft`, `Sent`, `Paid`, `Overdue`).
  - Status indicators with payment due countdown.
- **Document Editor (`/invoicing/invoices/new`):**
  - Clean accounting editor: Customer selection, numbering series generator, line item table with auto-calculating tax and discount rates, PDF live preview.
- **Invoice Detail View (`/invoicing/invoices/[id]`):**
  - Document summary, payment link generator (Stripe), manual payment recording dialog, PDF download button, audit trail.
- **General Ledger & Journal Entries (`/invoicing/journal`):**
  - Double-entry verification table: Every entry enforces `Debit Sum = Credit Sum` before posting.
- **Chart of Accounts (`/invoicing/accounts`):**
  - Tree-grid view of Assets, Liabilities, Equity, Revenue, and Expenses with current running balances.

### 2.8 Knowledge & AI RAG Module
- **Knowledge Sources (`/knowledge`):**
  - Source inventory (Documents, URLs, FAQs).
  - Document ingestion dropzone supporting PDF, Markdown, DOCX, and raw text.
  - Chunk inspector displaying semantic vector embeddings and indexing status.

### 2.9 Automations Module
- **Workflow Directory (`/automations`):**
  - Workflow cards with toggle switches, run counts, and last execution status.
- **Workflow Canvas Builder (`/automations/[id]`):**
  - Visual builder: Trigger node (`mail.message.received`) → Condition node (`if subject contains "Invoice"`) → Action node (`create crm_deal`).
- **Execution Run History (`/automations/runs/[id]`):**
  - Step-by-step debug timeline showing input/output JSON payloads and execution latency.

---

## 3. Data Table Standards & UX Patterns

Every data table across all modules adheres to standard TanStack Table conventions:
1. **Column Visibility & Ordering:** Users can show/hide columns and reorder them via drag-and-drop; state persists in local preferences.
2. **Keyboard Navigation:**
   - `Arrow Keys`: Navigate cells and rows.
   - `Enter`: Open selected record or trigger inline edit.
   - `Space`: Toggle row selection checkbox.
   - `Escape`: Cancel edit or clear selection.
3. **Bulk Action Toolbar:** Appears floating above table when rows are selected (`[Assign]`, `[Export CSV]`, `[Apply Tag]`, `[Delete]`).
4. **CSV Import with Field Mapping:** Drag-and-drop CSV modal provides intelligent column auto-matching, data preview, validation error flags, and background batch ingestion.

---

## 4. Product Copy Discipline & Empty States

Adhering strictly to Working Rule 6:
- **Tone:** Direct, neutral, professional, operational.
- **No Filler Text:** Screens contain zero instructional paragraphs, zero tutorial blurbs, and zero marketing puffery.
- **No AI Badges:** Output created or drafted by agents does not carry "AI-generated" glitter badges or labels by default (governed by tenant setting).
- **One-Line Empty States:** When a dataset is empty, the screen displays a concise one-line description and a primary action button:
  - *Invoices:* "No invoices issued." → `[Create Invoice]`
  - *Inventory:* "No items in catalog." → `[Add Item]`
  - *Approval Queue:* "All agent actions resolved."
