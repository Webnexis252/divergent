/**
 * Interakt WhatsApp API client
 *
 * Sends WhatsApp messages via Interakt's Template Message API.
 * Docs: https://api.interakt.ai/v1/public/message/
 *
 * Required env vars:
 *   INTERAKT_API_KEY     - Your Interakt API key (from Settings → Developer)
 *   INTERAKT_OTP_TEMPLATE_NAME - The code name of your approved OTP template
 *                                (e.g. "otp_verification")
 *
 * Template must have ONE body variable: {{1}} for the OTP code.
 * Example template body:
 *   "Your {{1}} verification code is {{1}}. It expires in 10 minutes. Do not share it with anyone."
 *
 * Create an "Authentication" type template in WhatsApp Business Manager,
 * then sync it in your Interakt dashboard under Templates.
 */

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

interface InteraktTemplatePayload {
  countryCode: string;
  phoneNumber: string;
  type: 'Template';
  template: {
    name: string;
    languageCode: string;
    bodyValues: string[];
  };
  callbackData?: string;
}

interface InteraktResponse {
  result: boolean;
  message?: string;
}

/**
 * Sends an OTP via WhatsApp using Interakt's Template Message API.
 *
 * @param phone - Full international phone number e.g. "+919876543210"
 * @param otp   - The 6-digit OTP string to send
 * @returns true on success, throws on failure
 */
export async function sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.INTERAKT_API_KEY;
  const templateName = process.env.INTERAKT_OTP_TEMPLATE_NAME;

  if (!apiKey) {
    throw new Error('INTERAKT_API_KEY environment variable is not set');
  }
  if (!templateName) {
    throw new Error('INTERAKT_OTP_TEMPLATE_NAME environment variable is not set');
  }

  // Parse phone into countryCode + phoneNumber
  // phone is in format +91XXXXXXXXXX
  const normalized = phone.replace(/\s/g, '');

  // Extract country code and local number
  // We support any format: +91XXXXXXXXXX, +1XXXXXXXXXX, etc.
  const match = normalized.match(/^(\+\d{1,3})(\d{6,14})$/);
  if (!match) {
    throw new Error(`Invalid phone number format: ${normalized}`);
  }
  const countryCode = match[1]; // e.g. "+91"
  const phoneNumber = match[2]; // e.g. "9876543210"

  const payload: InteraktTemplatePayload = {
    countryCode,
    phoneNumber,
    type: 'Template',
    template: {
      name: templateName,
      languageCode: 'en',
      bodyValues: [otp], // {{1}} in the template body = OTP
    },
    callbackData: `otp_send_${Date.now()}`,
  };

  const response = await fetch(INTERAKT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Interakt API error ${response.status}: ${text}`);
  }

  const json = await response.json() as InteraktResponse;

  if (!json.result) {
    throw new Error(`Interakt rejected the message: ${json.message ?? 'Unknown error'}`);
  }
}
