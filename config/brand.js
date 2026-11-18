/**
 * Backend-Only Brand & Email Configuration
 * Controls corporate identity, colors, and email HTML templates.
 * This is strictly a backend configuration and is NOT exposed as an editable UI on the frontend.
 */

const BrandConfig = {
  companyName: 'EdTechHub',
  legalEntity: 'EdTechHub Technologies',
  senderEmail: 'yabutech47@gmail.com',
  senderName: 'Yabsera',
  senderTitle: 'Tech Lead',
  primaryColor: '#1e40af', // Corporate Deep Blue
  accentColor: '#0284c7',  // Sky Accent
  website: 'https://edtechhub.et',
  location: 'Addis Ababa, Ethiopia',
  phone: '+251 91 123 4567',

  /**
   * Generates a corporate-grade, responsive HTML email matching top enterprise standards.
   * Compatible with Gmail, Outlook, Apple Mail, and mobile clients.
   */
  renderCorporateHtml({ subject, preheader = '', bodyContent, ctaText = '', ctaUrl = '', recipientName = '' }) {
    const brand = this;
    const preheaderSnippet = preheader ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : '';
    
    // Format paragraph breaks if plain text is passed
    let formattedBody = bodyContent;
    if (!formattedBody.includes('<p>') && !formattedBody.includes('<div>')) {
      formattedBody = formattedBody
        .split('\n\n')
        .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    const ctaButton = (ctaText && ctaUrl) ? `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
        <tr>
          <td align="left" style="border-radius: 6px;" bgcolor="${brand.primaryColor}">
            <a href="${ctaUrl}" target="_blank" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; padding: 12px 24px; border-radius: 6px; letter-spacing: 0.2px;">
              ${ctaText} &rarr;
            </a>
          </td>
        </tr>
      </table>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || brand.companyName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  ${preheaderSnippet}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;" role="presentation">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="4" style="background-color: ${brand.primaryColor}; line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Corporate Brand Header -->
          <tr>
            <td style="padding: 24px 36px 18px 36px; border-b: 1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td align="left" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td valign="middle" style="padding-right: 12px;">
                          <img src="https://erp-agents.vercel.app/logo.png" alt="${brand.companyName}" width="42" height="42" style="display: block; width: 42px; height: 42px; border-radius: 50%; border: 1px solid #e2e8f0; object-fit: contain;" />
                        </td>
                        <td valign="middle">
                          <span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; display: block;">
                            ${brand.companyName}
                          </span>
                          <span style="display: block; font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px;">
                            Enterprise Intelligent Mail
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #eff6ff; color: ${brand.primaryColor}; border-radius: 20px; font-size: 11px; font-weight: 600;">
                      Verified Dispatch
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0;">
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px 36px; font-size: 15px; line-height: 1.6; color: #334155;">
              ${recipientName ? `<p style="margin: 0 0 16px 0; font-weight: 600; color: #0f172a; font-size: 15px;">Dear ${recipientName},</p>` : ''}
              ${formattedBody}
              ${ctaButton}
              
              <!-- Professional Email Signature -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="vertical-align: top; padding-right: 14px;">
                      <img src="https://erp-agents.vercel.app/logo.png" alt="${brand.senderName}" width="44" height="44" style="width: 44px; height: 44px; border-radius: 50%; border: 1px solid #cbd5e1; display: block; object-fit: contain;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${brand.senderName}</div>
                      <div style="font-size: 12px; color: #64748b; line-height: 1.4;">${brand.senderTitle}</div>
                      <div style="font-size: 12px; color: ${brand.primaryColor}; font-weight: 500;">
                        ${brand.senderEmail} &bull; ${brand.website}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Corporate Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                &copy; ${new Date().getFullYear()} ${brand.legalEntity}. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Sent directly from ${brand.senderEmail} via ${brand.companyName} Automated Agent Hub.<br>
                ${brand.location}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
};

module.exports = BrandConfig;
