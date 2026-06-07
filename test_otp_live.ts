import * as dotenv from 'dotenv';
dotenv.config();

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

async function testInterakt() {
  const apiKey = process.env.INTERAKT_API_KEY;
  const templateName = process.env.INTERAKT_OTP_TEMPLATE_NAME;

  console.log("API Key:", apiKey);
  console.log("Template:", templateName);

  const payload = {
    countryCode: "+91",
    phoneNumber: "7761865075", // Testing with the number they used in screenshot
    type: "Template",
    template: {
      name: templateName,
      languageCode: "en",
      bodyValues: ["123456"],
      buttonValues: {
        "0": ["123456"]
      }
    },
    callbackData: `otp_send_${Date.now()}`,
  };

  try {
    const response = await fetch(INTERAKT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testInterakt();
