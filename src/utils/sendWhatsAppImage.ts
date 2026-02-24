import twilio from "twilio";

const sendWhatsAppText = async (message: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO ?? process.env.ADMIN_PHONE_NUMBER;
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

  if (!accountSid || !authToken || !from || !to) {
    throw new Error("Missing Twilio WhatsApp configuration.");
  }

  const client = twilio(accountSid, authToken);

  const messageParams: {
    from: string;
    to: string;
    body?: string;
    contentSid?: string;
    contentVariables?: string;
  } = {
    from,
    to,
  };

  if (contentSid) {
    messageParams.contentSid = contentSid;
    messageParams.contentVariables = JSON.stringify({
      "1": message,
    });
  } else {
    messageParams.body = message;
  }

  return client.messages.create(messageParams);
};

export default sendWhatsAppText;
