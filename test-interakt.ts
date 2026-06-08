import { sendWhatsAppOtp } from './src/lib/interakt.js';
import * as dotenv from 'dotenv';
dotenv.config();

sendWhatsAppOtp("+917061736650", "123456").then(() => console.log("Success")).catch(e => console.error("Error:", e));
