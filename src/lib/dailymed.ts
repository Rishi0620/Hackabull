// DailyMed API — NLM structured drug label data
// https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm
// No API key required.

const BASE = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

export type DailyMedLabel = {
  purpose?: string;          // OTC: "Antihistamine. Relieves: sneezing, runny nose..."
  indications?: string;      // Rx: what the drug treats
  dosage?: string;
  warnings?: string;
  activeIngredients?: string;
  setId?: string;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function lookupByName(name: string): Promise<DailyMedLabel | null> {
  const search = await fetchJson<{ data?: { setid: string; title: string }[] }>(
    `${BASE}/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=1`
  );
  const setId = search?.data?.[0]?.setid;
  if (!setId) return null;
  return lookupBySetId(setId);
}

export async function lookupByNdc(ndc: string): Promise<DailyMedLabel | null> {
  const search = await fetchJson<{ data?: { setid: string }[] }>(
    `${BASE}/spls.json?ndc=${encodeURIComponent(ndc)}&pagesize=1`
  );
  const setId = search?.data?.[0]?.setid;
  if (!setId) return null;
  return lookupBySetId(setId);
}

async function lookupBySetId(setId: string): Promise<DailyMedLabel | null> {
  const data = await fetchJson<{ data?: { sections?: { title: string; text: string }[] } }>(
    `${BASE}/spls/${setId}.json`
  );
  if (!data?.data?.sections) return null;

  const get = (titles: string[]): string | undefined => {
    for (const t of titles) {
      const sec = data.data!.sections!.find((s) =>
        s.title?.toLowerCase().includes(t.toLowerCase())
      );
      if (sec?.text) return sec.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
    }
  };

  return {
    purpose: get(['purpose', 'use', 'indication', 'what it is used for']),
    indications: get(['indication', 'use', 'purpose']),
    dosage: get(['dosage', 'directions', 'how to use']),
    warnings: get(['warning', 'precaution']),
    activeIngredients: get(['active ingredient']),
    setId,
  };
}
