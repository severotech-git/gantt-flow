import nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const PRIMARY_COLOR = '#1e293b'; // Slate 800
const TEXT_COLOR = '#334155'; // Slate 700
const MUTED_COLOR = '#64748b'; // Slate 500
const BACKGROUND_COLOR = '#f8fafc';
const CARD_BG = '#ffffff';
const RADIUS = '10px';

function renderEmailLayout(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
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
          color: ${TEXT_COLOR};
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
          <p>&copy; ${new Date().getFullYear()} GanttFlow. All rights reserved.</p>
          <p>Built for teams who value clarity and efficiency.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';
  const subject = 'Verify your GanttFlow email address';

  const html = renderEmailLayout(subject, `
    <h1 class="title">Welcome to GanttFlow!</h1>
    <div class="content">
      <p>Hi there,</p>
      <p>We're excited to have you on board! To get started with GanttFlow, please verify your email address by clicking the button below.</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(verifyUrl)}" class="button">Verify Email Address</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">This link expires in 24 hours. If you didn't create a GanttFlow account, you can safely ignore this email.</p>
    </div>
  `);

  await transporter.sendMail({
    from,
    to,
    subject,
    text: [
      `Welcome to GanttFlow!`,
      ``,
      `Please verify your email address by clicking the link below:`,
      verifyUrl,
      ``,
      `This link expires in 24 hours.`,
      ``,
      `If you did not create a GanttFlow account, you can safely ignore this email.`,
    ].join('\n'),
    html,
  });
}

export async function sendMFACode(to: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';
  const subject = 'Your GanttFlow sign-in code';

  const html = renderEmailLayout(subject, `
    <h1 class="title">Authentication Code</h1>
    <div class="content">
      <p>Your GanttFlow sign-in verification code is below. Please enter this code in the application to complete your sign-in.</p>
    </div>
    <div class="otp-container">
      <p class="otp-code">${escapeHtml(code)}</p>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR}; text-align: center;">This code expires in 10 minutes. If you did not attempt to sign in, please ignore this email.</p>
    </div>
  `);

  await transporter.sendMail({
    from,
    to,
    subject,
    text: [
      `Your GanttFlow sign-in code is: ${code}`,
      ``,
      `This code expires in 10 minutes.`,
      ``,
      `If you did not attempt to sign in, please ignore this email.`,
    ].join('\n'),
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';
  const subject = 'Reset your GanttFlow password';

  const html = renderEmailLayout(subject, `
    <h1 class="title">Reset Your Password</h1>
    <div class="content">
      <p>Hi,</p>
      <p>We received a request to reset the password for your GanttFlow account. Click the button below to choose a new password.</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(resetUrl)}" class="button">Reset Password</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will not be changed.</p>
    </div>
  `);

  await transporter.sendMail({
    from,
    to,
    subject,
    text: [
      `Reset your GanttFlow password`,
      ``,
      `Click the link below to reset your password:`,
      resetUrl,
      ``,
      `This link expires in 1 hour.`,
      ``,
      `If you did not request a password reset, you can safely ignore this email.`,
    ].join('\n'),
    html,
  });
}

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  accountName: string,
  inviteUrl: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';
  const subject = `${inviterName} invited you to join ${accountName}`;

  const html = renderEmailLayout(subject, `
    <h1 class="title">Join Your Team</h1>
    <div class="content">
      <p>Hi,</p>
      <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(accountName)}</strong> on GanttFlow.</p>
      <p>Ready to start collaborating on your projects? Click the button below to accept your invitation.</p>
    </div>
    <div class="button-container">
      <a href="${escapeHtml(inviteUrl)}" class="button">Accept Invitation</a>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: ${MUTED_COLOR};">This link expires in 30 days. If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
  `);

  await transporter.sendMail({
    from,
    to,
    subject: `${inviterName} invited you to ${accountName} on GanttFlow`,
    text: [
      `Hi,`,
      ``,
      `${inviterName} has invited you to join "${accountName}" on GanttFlow.`,
      ``,
      `Accept your invitation here:`,
      inviteUrl,
      ``,
      `This link expires in 30 days.`,
      ``,
      `If you did not expect this invitation, you can safely ignore this email.`,
    ].join('\n'),
    html,
  });
}
