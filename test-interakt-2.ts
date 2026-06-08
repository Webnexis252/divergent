import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

async function test(cc: string) {
  const payload = {
    countryCode: cc,
    phoneNumber: "7061736650",
    type: 'Template',
    template: {
      name: "otp_verification",
      languageCode: 'en',
      bodyValues: ["123456"],
    },
    callbackData: `otp_send_${Date.now()}`,
  };

  const response = await fetch(INTERAKT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${process.env.INTERAKT_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  console.log(`For CC ${cc}:`, json);
}

test("+91").then(() => test("91"));
