import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(email: string, otp: string, name?: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'SOE-DQPS <noreply@yourdomain.com>',
      to: email,
      subject: 'Your Login OTP - SOE Digital Question Paper System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Inter',system-ui,sans-serif;">
          <div style="max-width:480px;margin:40px auto;background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;border:1px solid #334155;overflow:hidden;">
            <div style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🔐 SOE-DQPS</h1>
              <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">Digital Question Paper System</p>
            </div>
            <div style="padding:32px;">
              <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px;">Hello${name ? ` ${name}` : ''},</p>
              <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.5;">
                Your one-time password for login is:
              </p>
              <div style="background:#1e293b;border:2px solid #3b82f6;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="color:#ffffff;font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;">
                  ${otp}
                </span>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;line-height:1.5;">
                ⏱️ This code expires in <strong style="color:#f59e0b;">5 minutes</strong>.
              </p>
              <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.5;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            <div style="padding:16px 32px;background:#0f172a;border-top:1px solid #1e293b;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">
                School of Engineering — Digital Question Paper System
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

export function generateOtp(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}
