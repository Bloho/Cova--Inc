import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env.local");

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) {
  console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local before creating plans.");
  process.exit(1);
}

const plans = [
  { envName: "RAZORPAY_PLAN_INR", name: "Cova Monthly INR", amount: 15000, currency: "INR" },
  { envName: "RAZORPAY_PLAN_USD", name: "Cova Monthly USD", amount: 239, currency: "USD" }
];

for (const plan of plans) {
  if (process.env[plan.envName]) {
    console.log(`${plan.envName} is already set: ${process.env[plan.envName]}`);
    continue;
  }

  const response = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: plan.name,
        description: "Cova monthly subscription",
        amount: plan.amount,
        currency: plan.currency
      },
      notes: { product: "cova" }
    })
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.id) {
    console.error(`Could not create ${plan.currency} plan:`, body?.error?.description ?? response.statusText);
    process.exitCode = 1;
    continue;
  }

  console.log(`${plan.envName}=${body.id}`);
}

function loadEnvFile(filename) {
  if (!existsSync(filename)) return;
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}
