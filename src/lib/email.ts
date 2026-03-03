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

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your GanttFlow email address',
    text: [
      `Hi,`,
      ``,
      `Please verify your email address by clicking the link below:`,
      verifyUrl,
      ``,
      `This link expires in 24 hours.`,
      ``,
      `If you did not create a GanttFlow account, you can safely ignore this email.`,
    ].join('\n'),
    html: `
      <p>Hi,</p>
      <p>Please verify your email address to start using GanttFlow.</p>
      <p>
        <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Verify Email Address
        </a>
      </p>
      <p style="font-size:12px;color:#888;">This link expires in 24 hours. If you did not create a GanttFlow account, you can safely ignore this email.</p>
    `,
  });
}

export async function sendMFACode(to: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';

  await transporter.sendMail({
    from,
    to,
    subject: 'Your GanttFlow sign-in code',
    text: [
      `Your GanttFlow sign-in code is: ${code}`,
      ``,
      `This code expires in 10 minutes.`,
      ``,
      `If you did not attempt to sign in, please ignore this email.`,
    ].join('\n'),
    html: `
      <p>Your GanttFlow sign-in verification code:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#6366f1;text-align:center;margin:24px 0;">
        ${escapeHtml(code)}
      </p>
      <p style="font-size:12px;color:#888;text-align:center;">This code expires in 10 minutes. If you did not attempt to sign in, please ignore this email.</p>
    `,
  });
}

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  accountName: string,
  inviteUrl: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@mygant.app';

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
    html: `
      <p>Hi,</p>
      <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(accountName)}</strong> on GanttFlow.</p>
      <p>
        <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Accept Invitation
        </a>
      </p>
      <p style="font-size:12px;color:#888;">This link expires in 30 days. If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  });
}
