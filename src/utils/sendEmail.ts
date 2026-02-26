import axios from "axios";
import ejs from "ejs";
import { SendEmailTypes } from "../types/utils";

const RESEND_API_URL = "https://api.resend.com/emails";

const sendEmail = async ({ to, subject, path, data }: SendEmailTypes) => {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || "Acme <onboarding@resend.dev>";

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY configuration.");
    }

    const template = await ejs.renderFile(path, data, { beautify: true });

    const response = await axios.post(
      RESEND_API_URL,
      {
        from,
        to: [to],
        subject,
        html: template,
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Message sent via Resend: >>>>>>>");
    console.log("Resend Email ID:", response.data?.id);
    return response.data;
  } catch (error: any) {
    console.log("Message not Sent: <<<<<<<<<");
    console.log(error?.response?.data || error?.message || error);
    return error;
  }
};

export default sendEmail;
