import Anthropic from "@anthropic-ai/sdk";

export async function verifyScalePhoto(
  photoUrl: string,
  declaredWeight: number,
  unit: "lb" | "kg",
): Promise<{ ok: boolean; message: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: true, message: "Verification skipped." };
  }

  const client = new Anthropic();

  let text = "";
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: photoUrl } },
            {
              type: "text",
              text: "What number is displayed on this digital scale? Reply with ONLY the numeric value shown (e.g. '185.2'). If you cannot read it clearly, reply 'unreadable'.",
            },
          ],
        },
      ],
    });
    text =
      msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch (err) {
    console.error("Scale verification error:", err);
    return { ok: true, message: "Verification unavailable — submission accepted." };
  }

  if (!text || text.toLowerCase() === "unreadable") {
    return {
      ok: false,
      message:
        "Could not read the number on your scale photo. Please retake a clearer photo of the display.",
    };
  }

  const readWeight = parseFloat(text);
  if (isNaN(readWeight)) {
    return {
      ok: false,
      message:
        "Could not read the number on your scale photo. Please retake a clearer photo of the display.",
    };
  }

  const tolerance = unit === "lb" ? 1.0 : 0.5;
  if (Math.abs(readWeight - declaredWeight) > tolerance) {
    return {
      ok: false,
      message: `Your scale shows ${readWeight.toFixed(1)} ${unit} but you entered ${declaredWeight.toFixed(1)} ${unit}. Please correct your entry.`,
    };
  }

  return { ok: true, message: "Scale verified." };
}
