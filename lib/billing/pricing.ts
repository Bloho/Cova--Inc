export type BillingRegion = "IN" | "GLOBAL";

export type RegionalPricing = {
  region: BillingRegion;
  currency: "INR" | "USD";
  amount: number;
  amountInSubunits: number;
  formattedPrice: string;
  razorpayPlanId: string;
  source: "verified_account" | "deployment_header" | "user_selection" | "default";
};

type PricingInput = {
  verifiedCountry?: string | null;
  selectedCountry?: string | null;
  headers?: Headers;
};

export function getRegionalPricing({ verifiedCountry, selectedCountry, headers }: PricingInput): RegionalPricing {
  const verified = normalizeCountry(verifiedCountry);
  const deploymentCountry = getDeploymentCountry(headers);
  const selected = normalizeCountry(selectedCountry);
  const country = verified ?? deploymentCountry ?? selected;
  const source = verified
    ? "verified_account"
    : deploymentCountry
      ? "deployment_header"
      : selected
        ? "user_selection"
        : "default";
  const isIndia = country === "IN";
  const planId = isIndia ? process.env.RAZORPAY_PLAN_INR : process.env.RAZORPAY_PLAN_USD;

  if (!planId) {
    throw new Error("Billing plans are not configured on this server.");
  }

  return isIndia
    ? {
        region: "IN",
        currency: "INR",
        amount: 150,
        amountInSubunits: 15000,
        formattedPrice: "₹150",
        razorpayPlanId: planId,
        source
      }
    : {
        region: "GLOBAL",
        currency: "USD",
        amount: 2.39,
        amountInSubunits: 239,
        formattedPrice: "$2.39",
        razorpayPlanId: planId,
        source
      };
}

export function getPriceForCurrency(currency: string | null | undefined) {
  return currency === "INR" ? "₹150" : "$2.39";
}

function getDeploymentCountry(headers?: Headers) {
  if (!headers) return null;

  return normalizeCountry(
    headers.get("x-vercel-ip-country")
      ?? headers.get("cf-ipcountry")
      ?? headers.get("x-geo-country")
  );
}

function normalizeCountry(value?: string | null) {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}
