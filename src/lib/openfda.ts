const BASE = 'https://api.fda.gov';
const apiKey = process.env.OPENFDA_API_KEY;

function withKey(url: string): string {
  if (!apiKey) return url;
  return url + (url.includes('?') ? '&' : '?') + `api_key=${apiKey}`;
}

export type FdaLabel = {
  brand_name?: string[];
  generic_name?: string[];
  dosage_and_administration?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  drug_interactions?: string[];
  active_ingredient?: string[];
  purpose?: string[];
  indications_and_usage?: string[];
};

export async function lookupLabelByName(name: string): Promise<FdaLabel | null> {
  const q = encodeURIComponent(`openfda.brand_name:"${name}" OR openfda.generic_name:"${name}"`);
  const url = withKey(`${BASE}/drug/label.json?search=${q}&limit=1`);
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: FdaLabel[] };
    return data.results?.[0] || null;
  } catch (err) {
    console.error('OpenFDA error', err);
    return null;
  }
}

export async function lookupLabelByNdc(ndc: string): Promise<FdaLabel | null> {
  const q = encodeURIComponent(`openfda.product_ndc:"${ndc}"`);
  const url = withKey(`${BASE}/drug/label.json?search=${q}&limit=1`);
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: FdaLabel[] };
    return data.results?.[0] || null;
  } catch (err) {
    console.error('OpenFDA NDC error', err);
    return null;
  }
}

export type VerificationResult = {
  verified: boolean;
  conflicts: string[];
  fdaWarnings: string[];
};

export function compareWithFda(
  extractedDosage: string,
  extractedWarnings: string[],
  fda: FdaLabel | null
): VerificationResult {
  if (!fda) return { verified: false, conflicts: [], fdaWarnings: [] };
  const fdaWarnings = [
    ...(fda.warnings || []),
    ...(fda.warnings_and_cautions || []),
  ].slice(0, 5);
  const conflicts: string[] = [];
  // Lightweight: if FDA has warnings the label scan missed entirely, surface them.
  if (fdaWarnings.length > 0 && extractedWarnings.length === 0) {
    conflicts.push('Label warnings missing — FDA has additional warnings.');
  }
  return {
    verified: true,
    conflicts,
    fdaWarnings,
  };
}
