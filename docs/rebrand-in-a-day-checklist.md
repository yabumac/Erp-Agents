# "Rebrand in Under a Day" Operational Checklist & Timing

How to Onboard, Brand, and Launch a Fully Customized Customer Platform in Under 3 Hours

---

## 1. Timing Summary & Schedule

| Step | Activity | Estimated Time | Tool / Script |
|---|---|---|---|
| **Step 1** | Scaffold new customer brand pack | **5 minutes** | `pnpm brand:create <customer>` |
| **Step 2** | Import logos, icons, and SVG assets | **20 minutes** | Copy to `packages/brand/<customer>/assets/` |
| **Step 3** | Tune primary colors, fonts, and radii | **25 minutes** | Edit `packages/brand/<customer>/brand.json` |
| **Step 4** | Validate contrast ratios and asset presence | **5 minutes** | `pnpm brand:validate <customer>` |
| **Step 5** | Customize login copy, email footer & default persona | **15 minutes** | Edit `copy` and `defaultPersona` in `brand.json` |
| **Step 6** | Connect sending domain & verify DNS (SPF/DKIM/DMARC) | **30 minutes** | Admin > Mail > Sending Domains |
| **Step 7** | Provision telephony numbers or connect SIP trunk | **20 minutes** | Admin > Voice > Phone Numbers |
| **Step 8** | Seed realistic customer demo data | **10 minutes** | `pnpm demo:seed <customer>` |
| **Step 9** | Visual inspection & end-to-end smoke test | **20 minutes** | Admin Theme Preview + Test Inquiry |
| **Total** | **Complete Rebrand to Production Readiness** | **~2.5 Hours** | **Fully within the 1-Day Target** |

---

## 2. Step-by-Step Execution Guide

### Step 1: Scaffold Brand Pack (5 mins)
Run the generator CLI from workspace root:
```bash
pnpm brand:create acme
```
Generates `packages/brand/acme/brand.json` pre-configured with complete token structure.

### Step 2: Asset Placement (20 mins)
Place customer assets into `packages/brand/acme/assets/`:
- `logo-light.svg` (Horizontal layout, dark text, transparent background)
- `logo-dark.svg` (Horizontal layout, light text, transparent background)
- `favicon.ico` (Multi-resolution 16x16 / 32x32)
- `app-icon.png` (512x512 PWA and mobile shortcut icon)
- `email-header.png` (600px width branded banner)

### Step 3: Design Token Configuration (25 mins)
Open `packages/brand/acme/brand.json` and set HSL color variables:
```json
{
  "tokens": {
    "colors": {
      "primary": "142.1 76.2% 36.3%",
      "primaryForeground": "355.7 100% 97.3%",
      "border": "240 5.9% 90%",
      "radius": "0.25rem"
    },
    "fontFamily": "Roboto, system-ui, sans-serif",
    "density": "compact"
  }
}
```

### Step 4: Run Automated Brand Validation (5 mins)
```bash
pnpm brand:validate acme
```
Asserts:
- All referenced asset files exist on disk.
- Contrast ratio between `primary` and `primaryForeground` satisfies WCAG 2.2 AA (minimum 4.5:1).
- All required copy strings and agent personas are defined.

### Step 5: Copy & Persona Customization (15 mins)
Define the customer-specific voice guidelines:
```json
{
  "copy": {
    "loginTitle": "Sign in to Acme Global Operations",
    "emailFooter": "Confidential communication sent by Acme Global Technologies.",
    "supportEmail": "helpdesk@acmeglobal.com"
  },
  "defaultPersona": {
    "name": "Acme Operations Assistant",
    "tone": "Direct, technical, precise",
    "signoff": "Sincerely,\nAcme Global Support Team"
  }
}
```

### Step 6: DNS & Sending Domain Verification (30 mins)
1. Add sending domain `mail.acmeglobal.com` in Admin UI.
2. Provide customer IT with DNS TXT / CNAME entries:
   - `v=spf1 include:resend.com ~all`
   - `resend._domainkey.mail.acmeglobal.com`
   - `v=DMARC1; p=reject; rua=mailto:dmarc@acmeglobal.com`
3. Click "Verify Records".

### Step 7: Telephony Setup (20 mins)
1. Provision Twilio / Telnyx local or toll-free number.
2. Link number to standard Inbound Customer Service Flow.
3. Configure regional calling hours in Compliance Center.

### Step 8: Demo & Catalog Seed (10 mins)
```bash
pnpm demo:seed acme
```
Seeds realistic contacts, product inventory items, pipeline deals, and welcome inbox threads branded to the new customer.

### Step 9: Final Visual Inspection (20 mins)
1. Navigate to `/admin/branding` to inspect live desktop and mobile preview.
2. Send test email to verify branded shell and unsubscribe headers.
3. Perform test call to voice test console.
4. Issue test invoice and inspect generated PDF branding.
