import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

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
      <p><strong>${inviterName}</strong> has invited you to join <strong>${accountName}</strong> on GanttFlow.</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Accept Invitation
        </a>
      </p>
      <p style="font-size:12px;color:#888;">This link expires in 30 days. If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  });
}
