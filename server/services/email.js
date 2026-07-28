const { Resend } = require('resend');

let resend = null;
const emailFrom = process.env.EMAIL_FROM || 'Finding Love Malawi <noreply@findinglovemalawi.com>';

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`[EMAIL SKIPPED - No Resend API key] To: ${to}, Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: emailFrom, to, subject, html });
    console.log(`[EMAIL SENT] To: ${to}, Subject: ${subject}`);
  } catch (err) {
    console.error(`[EMAIL ERROR] To: ${to}, Subject: ${subject}`, err.message);
  }
}

async function sendWelcomeEmail(email, name) {
  await sendEmail({
    to: email,
    subject: 'Welcome to Finding Love Malawi!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ec4899;">Welcome to Finding Love Malawi, ${name}!</h1>
        <p>We're thrilled to have you join our community of people looking for meaningful connections.</p>
        <p>Here's what you can do to get started:</p>
        <ul>
          <li>Complete your profile with photos</li>
          <li>Set your preferences to find your ideal match</li>
          <li>Start swiping and connecting!</li>
        </ul>
        <p style="margin-top: 20px;">Wishing you love and happiness,</p>
        <p><strong>The Finding Love Malawi Team</strong></p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, resetLink) {
  await sendEmail({
    to: email,
    subject: 'Reset Your Password - Finding Love Malawi',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ec4899;">Password Reset Request</h1>
        <p>You requested a password reset for your Finding Love Malawi account.</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #f43f5e); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendNewMatchEmail(email, name, matchName) {
  await sendEmail({
    to: email,
    subject: `You matched with ${matchName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ec4899;">New Match!</h1>
        <p>Great news, ${name}! You and <strong>${matchName}</strong> liked each other!</p>
        <p>Head over to the app and start a conversation.</p>
        <p style="margin-top: 20px;">Good luck!</p>
        <p><strong>The Finding Love Malawi Team</strong></p>
      </div>
    `,
  });
}

async function sendNewMessageEmail(email, name, senderName) {
  await sendEmail({
    to: email,
    subject: `New message from ${senderName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ec4899;">New Message</h1>
        <p>Hi ${name}, you have a new message from <strong>${senderName}</strong> on Finding Love Malawi.</p>
        <p>Log in to view and reply to the message.</p>
        <p><strong>The Finding Love Malawi Team</strong></p>
      </div>
    `,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNewMatchEmail,
  sendNewMessageEmail,
};
