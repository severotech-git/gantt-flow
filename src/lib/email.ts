import { Resend } from 'resend';
import { getEmailText, resolveEmailLocale } from './emailTranslations';
import type { AppLocale } from '@/i18n/routing';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let $resendInstance = null as Resend | null;
function getResend(): Resend {
  if (!$resendInstance) {
    $resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return $resendInstance;
}

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const PRIMARY_COLOR = '#1e293b'; // Slate 800
const MUTED_COLOR = '#64748b'; // Slate 500
const BACKGROUND_COLOR = '#f8fafc';
const CARD_BG = '#ffffff';
const RADIUS = '10px';

function renderEmailLayout(
  title: string,
  contentHtml: string,
  locale: AppLocale,
  footer: { copyright: string; tagline: string }
): string {
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: ${BACKGROUND_COLOR};
          color: #334155;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo {
          height: 40px;
          width: auto;
        }
        .card {
          background-color: ${CARD_BG};
          padding: 40px;
          border-radius: ${RADIUS};
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: ${PRIMARY_COLOR};
          margin-bottom: 24px;
          text-align: center;
        }
        .content {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .button-container {
          text-align: center;
          margin-bottom: 32px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: ${PRIMARY_COLOR};
          color: #ffffff !important;
          text-decoration: none;
          border-radius: ${RADIUS};
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: ${MUTED_COLOR};
          margin-top: 32px;
        }
        .divider {
          border: 0;
          border-top: 1px solid #e2e8f0;
          margin: 32px 0;
        }
        .otp-container {
          background-color: ${BACKGROUND_COLOR};
          padding: 24px;
          border-radius: ${RADIUS};
          text-align: center;
          margin: 24px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 8px;
          color: ${PRIMARY_COLOR};
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${APP_URL}/icon.png" alt="GanttFlow" class="logo">
        </div>
        <div class="card">
          ${contentHtml}
        </div>
        <div class="footer">
          <p>${escapeHtml(footer.copyright)}</p>
          <p>${escapeHtml(footer.tagline)}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function loadFooter(locale: AppLocale) {
  const [copyright, tagline] = await Promise.all([
    getEmailText(locale, 'emails.layout.copyright', {
      year: new Date().getFullYear(),
    }),
    getEmailText(locale, 'emails.layout.tagline'),
  ]);
  return { copyright, tagline };
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  locale?: string | null
): Promise<void> {
  const loc = resolveEmailLocale(locale);
  const from = process.env.EMAIL_FROM ?? 'GanttFlow <ganttflow@severotech.com>';
  const t = (key: string, params?: Record<string, string | number>) =>
    getEmailText(loc, `emails.verification.${key}`, params);

  const [subject, title, greeting, body, button, expiry, footer] =
    await Promise.all([
      t('subject'),
      t('title'),
      t('greeting'),
      t('body'),
      t('button'),
      t('expiry'),
      loadFooter(loc),
    ]);

  const html = renderEmailLayout(
    subject,
    `
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="content">
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(verifyUrl)}" class="button">${escapeHtml(button)}</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">${escapeHtml(expiry)}</p>
    </div>
  `,
    loc,
    footer
  );

  const [plainBody, plainExpiry, plainIgnore] = await Promise.all([
    t('plainBody'),
    t('plainExpiry'),
    t('plainIgnore'),
  ]);

  await getResend().emails.send({
    from,
    to,
    subject,
    text: [title, '', plainBody, verifyUrl, '', plainExpiry, '', plainIgnore].join(
      '\n'
    ),
    html,
  });
}

export async function sendMFACode(
  to: string,
  code: string,
  locale?: string | null
): Promise<void> {
  const loc = resolveEmailLocale(locale);
  const from = process.env.EMAIL_FROM ?? 'GanttFlow <ganttflow@severotech.com>';
  const t = (key: string, params?: Record<string, string | number>) =>
    getEmailText(loc, `emails.mfa.${key}`, params);

  const [subject, title, body, expiry, footer] = await Promise.all([
    t('subject'),
    t('title'),
    t('body'),
    t('expiry'),
    loadFooter(loc),
  ]);

  const html = renderEmailLayout(
    subject,
    `
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="content">
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="otp-container">
      <p class="otp-code">${escapeHtml(code)}</p>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR}; text-align: center;">${escapeHtml(expiry)}</p>
    </div>
  `,
    loc,
    footer
  );

  const [plainBody, plainExpiry, plainIgnore] = await Promise.all([
    t('plainBody', { code }),
    t('plainExpiry'),
    t('plainIgnore'),
  ]);

  await getResend().emails.send({
    from,
    to,
    subject,
    text: [plainBody, '', plainExpiry, '', plainIgnore].join('\n'),
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  locale?: string | null
): Promise<void> {
  const loc = resolveEmailLocale(locale);
  const from = process.env.EMAIL_FROM ?? 'GanttFlow <ganttflow@severotech.com>';
  const t = (key: string, params?: Record<string, string | number>) =>
    getEmailText(loc, `emails.passwordReset.${key}`, params);

  const [subject, title, greeting, body, button, expiry, footer] =
    await Promise.all([
      t('subject'),
      t('title'),
      t('greeting'),
      t('body'),
      t('button'),
      t('expiry'),
      loadFooter(loc),
    ]);

  const html = renderEmailLayout(
    subject,
    `
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="content">
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(resetUrl)}" class="button">${escapeHtml(button)}</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">${escapeHtml(expiry)}</p>
    </div>
  `,
    loc,
    footer
  );

  const [plainBody, plainExpiry, plainIgnore] = await Promise.all([
    t('plainBody'),
    t('plainExpiry'),
    t('plainIgnore'),
  ]);

  await getResend().emails.send({
    from,
    to,
    subject,
    text: [subject, '', plainBody, resetUrl, '', plainExpiry, '', plainIgnore].join(
      '\n'
    ),
    html,
  });
}

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  accountName: string,
  inviteUrl: string,
  locale?: string | null
): Promise<void> {
  const loc = resolveEmailLocale(locale);
  const from = process.env.EMAIL_FROM ?? 'GanttFlow <ganttflow@severotech.com>';
  const params = { inviterName, accountName };
  const t = (key: string, extra?: Record<string, string | number>) =>
    getEmailText(loc, `emails.invitation.${key}`, { ...params, ...extra });

  const escapedParams = {
    inviterName: escapeHtml(inviterName),
    accountName: escapeHtml(accountName),
  };

  const [subject, subjectPlain, title, greeting, body, cta, button, expiry, footer] =
    await Promise.all([
      t('subject'),
      t('subjectPlain'),
      t('title'),
      t('greeting'),
      getEmailText(loc, 'emails.invitation.body', escapedParams),
      t('cta'),
      t('button'),
      t('expiry'),
      loadFooter(loc),
    ]);

  const html = renderEmailLayout(
    subject,
    `
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="content">
      <p>${escapeHtml(greeting)}</p>
      <p>${body}</p>
      <p>${escapeHtml(cta)}</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(inviteUrl)}" class="button">${escapeHtml(button)}</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">${escapeHtml(expiry)}</p>
    </div>
  `,
    loc,
    footer
  );

  const [plainBody, plainCta, plainExpiry, plainIgnore] = await Promise.all([
    t('plainBody'),
    t('plainCta'),
    t('plainExpiry'),
    t('plainIgnore'),
  ]);

  await getResend().emails.send({
    from,
    to,
    subject: subjectPlain,
    text: [
      greeting,
      '',
      plainBody,
      '',
      plainCta,
      inviteUrl,
      '',
      plainExpiry,
      '',
      plainIgnore,
    ].join('\n'),
    html,
  });
}

export async function sendShareLinkEmails(
  emails: string[],
  projectName: string,
  sharerName: string,
  shareUrl: string,
  expiresAt: Date,
  locale?: string | null
): Promise<void> {
  const loc = resolveEmailLocale(locale);
  const from = process.env.EMAIL_FROM ?? 'GanttFlow <ganttflow@severotech.com>';
  const params = { sharerName, projectName };
  const t = (key: string, extra?: Record<string, string | number>) =>
    getEmailText(loc, `emails.share.${key}`, { ...params, ...extra });

  const escapedParams = {
    sharerName: escapeHtml(sharerName),
    projectName: escapeHtml(projectName),
  };

  const [subject, subjectPlain, title, greeting, body, button, expiry, footer] =
    await Promise.all([
      t('subject'),
      t('subjectPlain'),
      t('title'),
      t('greeting'),
      getEmailText(loc, 'emails.share.body', escapedParams),
      t('button'),
      t('expiry', { expiryDate: expiresAt.toLocaleDateString(loc) }),
      loadFooter(loc),
    ]);

  const html = renderEmailLayout(
    subject,
    `
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="content">
      <p>${escapeHtml(greeting)}</p>
      <p>${body}</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(shareUrl)}" class="button">${escapeHtml(button)}</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">${escapeHtml(expiry)}</p>
    </div>
  `,
    loc,
    footer
  );

  const [plainBody, plainExpiry, plainIgnore] = await Promise.all([
    t('plainBody'),
    t('plainExpiry', { expiryDate: expiresAt.toLocaleDateString(loc) }),
    t('plainIgnore'),
  ]);

  // Batch send to all recipients
  const batchEmails = emails.map((to) => ({
    from,
    to,
    subject: subjectPlain,
    text: [title, '', plainBody, shareUrl, '', plainExpiry, '', plainIgnore].join('\n'),
    html,
  }));

  await getResend().batch.send(batchEmails);
}
