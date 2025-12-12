import nodemailer from "nodemailer";

export interface SendInvoiceEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.ZOHO_EMAIL;
  const pass = process.env.ZOHO_PASSWORD;

  if (!user || !pass) {
    throw new Error("ZOHO_EMAIL and ZOHO_PASSWORD must be set");
  }

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
  const transporter = getTransporter();

  const from = process.env.ZOHO_EMAIL;
  if (!from) throw new Error("ZOHO_EMAIL must be set");

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
}
