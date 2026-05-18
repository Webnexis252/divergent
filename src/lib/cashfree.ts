// Shared Cashfree SDK instance (singleton)
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree();
cashfree.XClientId = process.env.CASHFREE_APP_ID!;
cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
cashfree.XEnvironment =
  process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;
cashfree.XApiVersion = "2023-08-01";

export default cashfree;

