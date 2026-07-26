import { Resend } from "resend";
import { env } from "@/env";

// Fallback keeps construction from throwing during a no-secrets build
// (SKIP_ENV_VALIDATION); the real key is used at runtime when validation is on.
export const resend = new Resend(env.RESEND_API_KEY || "re_build_placeholder");

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export async function sendEmail(params: SendEmailParams) {
  return resend.emails.send({
    from: params.from ?? env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    tags: params.tags,
  });
}