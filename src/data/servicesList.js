// AmazFast Business Services List
export const AMAZFAST_SERVICES = [
  { id: 'us_llc', label: '🏢 US LLC Formation (Wyoming / Delaware / New Mexico)', shortLabel: 'US LLC Formation', icon: '🏢' },
  { id: 'uk_ltd', label: '🇬🇧 UK LTD Company Registration', shortLabel: 'UK LTD Formation', icon: '🇬🇧' },
  { id: 'stripe_gateway', label: '💳 Stripe Payment Gateway (US / UK Verified)', shortLabel: 'Stripe Gateway', icon: '💳' },
  { id: 'paypal_business', label: '🅿️ PayPal Business Account (International)', shortLabel: 'PayPal Business', icon: '🅿️' },
  { id: 'bank_account', label: '🏦 Business Bank (Mercury / Relay / Payoneer / Wise)', shortLabel: 'Business Bank', icon: '🏦' },
  { id: 'amazon_wholesale', label: '📦 Amazon FBA Wholesale & Brand Approval', shortLabel: 'Amazon Wholesale', icon: '📦' },
  { id: 'amazon_pl', label: '🚀 Amazon Private Label (PL) Launch & PPC', shortLabel: 'Amazon PL', icon: '🚀' },
  { id: 'amazon_brand_registry', label: '🏷️ Amazon Brand Registry & Trademark', shortLabel: 'Brand Registry', icon: '🏷️' },
  { id: 'shopify_store', label: '🛍️ Shopify Store Setup & Dropshipping', shortLabel: 'Shopify Store', icon: '🛍️' },
  { id: 'tiktok_shop', label: '📱 TikTok Shop Setup (USA / UK)', shortLabel: 'TikTok Shop', icon: '📱' },
  { id: 'itin_ein_tax', label: '📑 ITIN / EIN Tax ID & Compliance Filing', shortLabel: 'ITIN / EIN Tax', icon: '📑' },
  { id: 'virtual_address', label: '📍 US/UK Virtual Business Address & Mail', shortLabel: 'Virtual Address', icon: '📍' },
  { id: 'general_inquiry', label: '❓ Other / General Service Inquiry', shortLabel: 'General Inquiry', icon: '❓' },
];

export function getServiceMeta(serviceIdOrName) {
  if (!serviceIdOrName) return null;
  const match = AMAZFAST_SERVICES.find(
    s => s.id === serviceIdOrName || s.label === serviceIdOrName || s.shortLabel === serviceIdOrName
  );
  return match || { id: 'other', label: serviceIdOrName, shortLabel: serviceIdOrName, icon: '🏷️' };
}
