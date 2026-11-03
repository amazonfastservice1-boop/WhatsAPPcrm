// AmazFast Business Services List (6 Exclusive Core Services)
export const AMAZFAST_SERVICES = [
  {
    id: 'amazon_account',
    label: '🛒 Amazon Account Creation',
    shortLabel: 'Amazon Account Creation',
    icon: '🛒',
    colorName: 'amber',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'llc',
    label: '🏢 LLC',
    shortLabel: 'LLC',
    icon: '🏢',
    colorName: 'blue',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'bank_creation',
    label: '🏦 Bank Creation',
    shortLabel: 'Bank Creation',
    icon: '🏦',
    colorName: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'combo',
    label: '⚡ Combo',
    shortLabel: 'Combo',
    icon: '⚡',
    colorName: 'purple',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'brand_approval',
    label: '🏷️ Brand Approval',
    shortLabel: 'Brand Approval',
    icon: '🏷️',
    colorName: 'rose',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'amazon_wholesale',
    label: '📦 Amazon Wholesale',
    shortLabel: 'Amazon Wholesale',
    icon: '📦',
    colorName: 'teal',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
    dotColor: 'bg-teal-500',
  },
];

export function getServiceMeta(serviceIdOrName) {
  if (!serviceIdOrName) return null;
  const raw = String(serviceIdOrName).trim().toLowerCase();

  // Smart matching with aliases
  if (raw.includes('amazon acc') || raw.includes('account creation') || raw.includes('amazon_account')) {
    return AMAZFAST_SERVICES[0];
  }
  if (raw.includes('llc') || raw.includes('us_llc') || raw.includes('wyoming') || raw.includes('delaware')) {
    return AMAZFAST_SERVICES[1];
  }
  if (raw.includes('bank') || raw.includes('mercury') || raw.includes('relay') || raw.includes('bank_account') || raw.includes('bank_creation')) {
    return AMAZFAST_SERVICES[2];
  }
  if (raw.includes('combo')) {
    return AMAZFAST_SERVICES[3];
  }
  if (raw.includes('brand') || raw.includes('approval') || raw.includes('registry') || raw.includes('trademark')) {
    return AMAZFAST_SERVICES[4];
  }
  if (raw.includes('wholesale') || raw.includes('fba') || raw.includes('whols')) {
    return AMAZFAST_SERVICES[5];
  }

  const exact = AMAZFAST_SERVICES.find(
    (s) => s.id === serviceIdOrName || s.label === serviceIdOrName || s.shortLabel === serviceIdOrName
  );
  if (exact) return exact;

  return {
    id: 'other',
    label: serviceIdOrName,
    shortLabel: serviceIdOrName,
    icon: '💼',
    colorName: 'slate',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    dotColor: 'bg-slate-500',
  };
}
