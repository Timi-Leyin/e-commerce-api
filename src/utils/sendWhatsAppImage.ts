import twilio from "twilio";

const toWhatsAppNumber = (phone: string) => {
  const trimmed = String(phone || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("whatsapp:")) {
    return trimmed;
  }

  const digits = trimmed.replace(/[^\d+]/g, "");
  const withCountryCode = digits.startsWith("+")
    ? digits
    : digits.startsWith("0")
      ? `+234${digits.slice(1)}`
      : `+${digits}`;

  return `whatsapp:${withCountryCode}`;
};

const sendWhatsAppText = async (message: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = toWhatsAppNumber(
    process.env.TWILIO_WHATSAPP_FROM || "+14155238886",
  );
  const to = toWhatsAppNumber(
    process.env.TWILIO_WHATSAPP_TO || process.env.ADMIN_PHONE_NUMBER || "",
  );
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  const contentVariables = process.env.TWILIO_WHATSAPP_CONTENT_VARIABLES;
  const useTemplate =
    String(process.env.TWILIO_USE_CONTENT_TEMPLATE || "false").toLowerCase() ===
    "true";

  if (!accountSid || !authToken || !from || !to) {
    throw new Error("Missing Twilio WhatsApp configuration.");
  }

  const client = twilio(accountSid, authToken);

  if (useTemplate && contentSid) {
    return client.messages.create({
      from,
      to,
      contentSid,
      contentVariables:
        contentVariables ||
        JSON.stringify({
          "1": message,
        }),
    });
  }

  return client.messages.create({
    from,
    to,
    body: message,
  });
};

export default sendWhatsAppText;
