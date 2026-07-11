import { issueOtp } from "./otp";
import type { Transporter } from "nodemailer";

const mode = () => process.env.EMAIL_MODE || "console";

export interface OtpResult {
  devCode: string | null;   // dev/console: the code, so the UI can show it
  previewUrl: string | null; // ethereal: URL to view the rendered email
}

// Cache the auto-created Ethereal transport across requests.
let etherealTransport: Transporter | null = null;

async function getEtherealTransport(): Promise<Transporter> {
  const nodemailer = await import("nodemailer");
  if (etherealTransport) return etherealTransport;
  // Creates a throwaway inbox on ethereal.email — no signup, no credentials needed.
  const testAccount = await nodemailer.createTestAccount();
  etherealTransport = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log(`\n[Ethereal] test inbox ready: ${testAccount.user}\n`);
  return etherealTransport;
}

const mailBody = (code: string) => ({
  subject: "Your CamPulse verification code",
  text: `Your CamPulse code is ${code}. It expires in 10 minutes.`,
  html: `<div style="font-family:sans-serif;max-width:420px">
    <h2 style="margin:0 0 8px">Cam<span style="color:#6366f1">Pulse</span></h2>
    <p>Your verification code is:</p>
    <p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p>
    <p style="color:#888">Expires in 10 minutes. If you didn't request this, ignore it.</p>
  </div>`,
});

/**
 * Send an OTP to a campus email. Behaviour by EMAIL_MODE:
 * - "console" (default) / no SMTP: logs the code + returns it for on-screen display.
 * - "ethereal": auto-creates a test inbox, sends the email, returns a preview URL.
 * - "smtp": sends a real email via configured SMTP_* creds.
 */
export async function sendOtpEmail(email: string): Promise<OtpResult> {
  const code = await issueOtp(email);
  const m = mode();

  // Ethereal test inbox — no signup, view the real rendered email at a preview URL.
  if (m === "ethereal") {
    const nodemailer = await import("nodemailer");
    const transport = await getEtherealTransport();
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || "CamPulse <no-reply@campulse.app>",
      to: email,
      ...mailBody(code),
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log(`\n[Ethereal] OTP for ${email} — preview: ${previewUrl}\n`);
    return { devCode: null, previewUrl };
  }

  // Console dev mode — no email; surface the code directly.
  if (m === "console" || !process.env.SMTP_HOST) {
    console.log("\n==============================");
    console.log(`  CamPulse OTP for ${email}: ${code}`);
    console.log("==============================\n");
    return { devCode: code, previewUrl: null };
  }

  // Real SMTP.
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM || "CamPulse <no-reply@campulse.app>",
    to: email,
    ...mailBody(code),
  });
  return { devCode: null, previewUrl: null };
}
