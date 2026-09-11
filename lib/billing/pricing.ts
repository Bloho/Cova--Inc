export type BillingRegion = "IN" | "GLOBAL";

export type RegionalPricing = {
  region: BillingRegion;
  currency: "INR" | "USD";
  amount: number;
  amountInSubunits: number;
  formattedPrice: string;
  dodoProductId: string;
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
  const productId = isIndia ? process.env.DODO_PAYMENTS_PRODUCT_INR : process.env.DODO_PAYMENTS_PRODUCT_USD;

  if (!productId || !/^pdt_[A-Za-z0-9]+$/.test(productId)) {
    throw new Error("Dodo Payments products are not configured on this server.");
  }

  return isIndia
    ? {
        region: "IN",
        currency: "INR",
        amount: 99,
        amountInSubunits: 9900,
        formattedPrice: "₹99",
        dodoProductId: productId,
        source
      }
    : {
        region: "GLOBAL",
        currency: "USD",
        amount: 1.99,
        amountInSubunits: 199,
        formattedPrice: "$1.99",
        dodoProductId: productId,
        source
      };
}

export function getPriceForCurrency(currency: string | null | undefined) {
  return currency === "INR" ? "₹99" : "$1.99";
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
