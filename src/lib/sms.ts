import twilio from "twilio";

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
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  if (!accountSid || !authToken || !from) {
    console.warn("SMS not configured — skipping invite to", to);
    return;
  }

  const client = twilio(accountSid, authToken);
  const link = `${baseUrl}/u/${accessToken}`;

  await client.messages.create({
    to,
    from,
    body: `Hey ${playerName}! You've been added to "${challengeName}" 💪 Set your starting weight here: ${link}`,
  });
}
