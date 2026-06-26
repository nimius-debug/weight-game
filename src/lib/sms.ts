import twilio from "twilio";

export interface SmsResult {
  to: string;
  ok: boolean;
  detail: string;
}

/**
 * Normalize a user-entered phone into E.164 (e.g. +15551234567).
 * Twilio rejects anything that isn't E.164. We assume US (+1) when no
 * country code is given, which fits this friend-group app.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`; // US 10-digit
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSmsInvite({
  to,
  playerName,
  challengeName,
  accessToken,
}: {
  to: string;
  playerName: string;
  challengeName: string;
  accessToken: string;
}): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  // Strip any trailing slash so we don't build "https://host//u/..."
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

  if (!accountSid || !authToken || !from) {
    return { to, ok: false, detail: "Twilio env vars not set" };
  }

  const e164 = normalizePhone(to);
  if (!e164) {
    return { to, ok: false, detail: "invalid phone format" };
  }

  const client = twilio(accountSid, authToken);
  const link = `${baseUrl}/u/${accessToken}`;

  try {
    const msg = await client.messages.create({
      to: e164,
      from,
      body: `Hey ${playerName}! You've been added to "${challengeName}" 💪 Set your starting weight here: ${link}`,
    });
    return { to: e164, ok: true, detail: msg.sid };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[sms] send failed", e164, detail);
    return { to: e164, ok: false, detail };
  }
}
