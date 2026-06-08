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

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 15_000;

/** Maximum retries for transient failures */
const MAX_RETRIES = 2;

interface InteraktTemplatePayload {
  countryCode: string;
  phoneNumber: string;
  type: 'Template';
  template: {
    name: string;
    languageCode: string;
    bodyValues: string[];
    buttonValues?: Record<string, string[]>;
  };
  callbackData?: string;
}

/**
 * Known country calling codes ordered by length (longest first) to avoid
 * ambiguity when parsing.  This covers the most common codes; for anything
 * else we fall back to a generic split.
 */
const KNOWN_COUNTRY_CODES = [
  '1',    // USA / Canada
  '7',    // Russia
  '20',   // Egypt
  '27',   // South Africa
  '30',   // Greece
  '31',   // Netherlands
  '33',   // France
  '34',   // Spain
  '39',   // Italy
  '44',   // UK
  '49',   // Germany
  '55',   // Brazil
  '60',   // Malaysia
  '61',   // Australia
  '62',   // Indonesia
  '63',   // Philippines
  '65',   // Singapore
  '66',   // Thailand
  '81',   // Japan
  '82',   // South Korea
  '86',   // China
  '90',   // Turkey
  '91',   // India
  '92',   // Pakistan
  '93',   // Afghanistan
  '94',   // Sri Lanka
  '95',   // Myanmar
  '212',  // Morocco
  '234',  // Nigeria
  '254',  // Kenya
  '255',  // Tanzania
  '256',  // Uganda
  '260',  // Zambia
  '263',  // Zimbabwe
  '351',  // Portugal
  '353',  // Ireland
  '355',  // Albania
  '358',  // Finland
  '372',  // Estonia
  '380',  // Ukraine
  '420',  // Czech Republic
  '421',  // Slovakia
  '880',  // Bangladesh
  '886',  // Taiwan
  '960',  // Maldives
  '966',  // Saudi Arabia
  '971',  // UAE
  '977',  // Nepal
];

/**
 * Parses an international phone number (e.g. "+919876543210") into
 * { countryCode, phoneNumber } for the Interakt API.
 */
function parsePhone(phone: string): { countryCode: string; phoneNumber: string } {
  const normalized = phone.replace(/[\s\-()]/g, '');

  if (!normalized.startsWith('+') || normalized.length < 8) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  // Strip the leading '+'
  const digits = normalized.substring(1);

  // Try to match known country codes (try longer codes first)
  const sortedCodes = [...KNOWN_COUNTRY_CODES].sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (digits.startsWith(code)) {
      const local = digits.substring(code.length);
      if (local.length >= 4 && local.length <= 15) {
        return { countryCode: code, phoneNumber: local };
      }
    }
  }

  // Fallback: assume 1-3 digit country code
  // For numbers with 10+ digit local parts, try 1-digit CC first
  // For shorter numbers, try up to 3-digit CC
  if (digits.length > 10) {
    // Likely 1-2 digit country code
    return {
      countryCode: digits.substring(0, digits.length - 10),
      phoneNumber: digits.substring(digits.length - 10),
    };
  }

  // Last resort: first 2 digits as country code
  return {
    countryCode: digits.substring(0, 2),
    phoneNumber: digits.substring(2),
  };
}

/**
 * Sends an OTP via WhatsApp using Interakt's Template Message API.
 *
 * @param phone - Full international phone number e.g. "+919876543210"
 * @param otp   - The 6-digit OTP string to send
 * @throws Error with a descriptive message on failure
 */
export async function sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.INTERAKT_API_KEY;
  const templateName = process.env.INTERAKT_OTP_TEMPLATE_NAME;

  if (!apiKey) {
    console.error('[INTERAKT] INTERAKT_API_KEY environment variable is not set');
    throw new Error('WhatsApp OTP service is not configured. Please contact support.');
  }
  if (!templateName) {
    console.error('[INTERAKT] INTERAKT_OTP_TEMPLATE_NAME environment variable is not set');
    throw new Error('WhatsApp OTP template is not configured. Please contact support.');
  }

  // Parse the phone number
  let parsed: { countryCode: string; phoneNumber: string };
  try {
    parsed = parsePhone(phone);
  } catch (parseErr) {
    console.error('[INTERAKT] Phone parse error:', parseErr);
    throw new Error(
      'Could not parse the phone number. Please use international format (e.g. +919876543210).',
    );
  }

  if (!parsed.countryCode || !parsed.phoneNumber) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  const payload: InteraktTemplatePayload = {
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: templateName,
      languageCode: 'en',
      bodyValues: [otp],
      // The template has a "Copy Code" button at index 0 that requires
      // the OTP as its variable value. Interakt requires this to be sent
      // in buttonValues or it rejects the request with a 400.
      buttonValues: { '0': [otp] },
    },
    callbackData: `otp_send_${Date.now()}`,
  };

  // Retry loop for transient failures
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        console.log(
          `[INTERAKT] Sending OTP (attempt ${attempt + 1}/${MAX_RETRIES + 1}) to ${parsed.countryCode}${parsed.phoneNumber.slice(0, 3)}***`,
        );

        const response = await fetch(INTERAKT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          console.error(
            `[INTERAKT] API returned ${response.status}: ${errorText}`,
          );

          // Don't retry on 4xx client errors (bad request, unauthorized, etc.)
          if (response.status >= 400 && response.status < 500) {
            // Specific handling for common Interakt errors
            if (response.status === 401 || response.status === 403) {
              throw new Error(
                'WhatsApp API authentication failed. Please check the API key configuration.',
              );
            }
            if (response.status === 400) {
              // Try to parse error details
              try {
                const errorJson = JSON.parse(errorText);
                const msg = errorJson.message || errorJson.error || errorText;
                throw new Error(`WhatsApp API rejected the request: ${msg}`);
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message.startsWith('WhatsApp API')) {
                  throw parseErr;
                }
                throw new Error(
                  `WhatsApp API rejected the request (${response.status}). Please verify the phone number.`,
                );
              }
            }
            throw new Error(
              `WhatsApp API error (${response.status}): ${errorText.substring(0, 200)}`,
            );
          }

          // 5xx errors are retryable
          lastError = new Error(
            `Interakt API returned ${response.status}`,
          );
          // Wait before retrying (exponential backoff)
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
          continue;
        }

        // Parse the response body
        let json: { result?: boolean; message?: string };
        try {
          json = await response.json();
        } catch {
          // Interakt returned 200 but non-JSON body — treat as success
          console.warn('[INTERAKT] Response was 200 but not valid JSON — treating as success');
          return;
        }

        if (json.result === false) {
          const msg = json.message || 'Unknown error';
          console.error(`[INTERAKT] API rejected message: ${msg}`);
          throw new Error(`WhatsApp service rejected the OTP message: ${msg}`);
        }

        // Success!
        console.log('[INTERAKT] OTP sent successfully');
        return;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      // Handle abort (timeout) errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error(`[INTERAKT] Request timed out (attempt ${attempt + 1})`);
        lastError = new Error('WhatsApp API request timed out');
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
        continue;
      }

      // Non-retryable errors (our own throws)
      if (err instanceof Error && err.message.startsWith('WhatsApp')) {
        throw err;
      }

      // Network errors are retryable
      console.error(
        `[INTERAKT] Network error (attempt ${attempt + 1}):`,
        err instanceof Error ? err.message : err,
      );
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // All retries exhausted
  console.error('[INTERAKT] All retries exhausted:', lastError);
  throw new Error(
    'Failed to send OTP via WhatsApp after multiple attempts. Please try again later.',
  );
}
