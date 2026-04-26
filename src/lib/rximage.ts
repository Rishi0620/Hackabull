// RxImage API — NLM pill identification by imprint/color/shape
// https://rximage.nlm.nih.gov/docs/
// No API key required.

const BASE = 'https://rximage.nlm.nih.gov/api/rximage/1';

// RxImage color codes (numeric IDs)
const COLOR_MAP: Record<string, string> = {
  white: '1', yellow: '2', orange: '4', pink: '5', red: '6',
  brown: '7', blue: '9', green: '10', purple: '11', black: '12',
  gray: '14', turquoise: '15', beige: '16', tan: '17', lavender: '18',
  amber: '3', peach: '3',
};

// RxImage shape codes
const SHAPE_MAP: Record<string, string> = {
  round: '1', oval: '2', oblong: '3', capsule: '4', cylinder: '5',
  pentagon: '6', diamond: '7', rectangle: '8', hexagon: '9', square: '10',
  triangle: '11', other: '13',
};

export type RxImageResult = {
  ndc11: string;
  rxcui: string;
  name: string;
  labeler: string;
  imageUrl: string;
  confidence: number;
};

export async function lookupByImprint(
  imprint: string,
  color?: string,
  shape?: string
): Promise<RxImageResult | null> {
  try {
    const params = new URLSearchParams();
    if (imprint) params.set('imprint', imprint.toUpperCase().replace(/\s+/g, ''));
    if (color) {
      const colorId = COLOR_MAP[color.toLowerCase().split(/[\s/]/)[0]];
      if (colorId) params.set('color', colorId);
    }
    if (shape) {
      const shapeId = SHAPE_MAP[shape.toLowerCase()];
      if (shapeId) params.set('shape', shapeId);
    }
    params.set('size', '1');

    const url = `${BASE}/rxnav?${params.toString()}`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { replyStatus?: { success: boolean; count: number }; nlmRxImages?: any[] };
    if (!data.replyStatus?.success || !data.nlmRxImages?.length) return null;

    const hit = data.nlmRxImages[0];
    return {
      ndc11: hit.ndc11 ?? '',
      rxcui: hit.rxcui ?? '',
      name: hit.name ?? '',
      labeler: hit.labeler ?? '',
      imageUrl: hit.imageUrl ?? '',
      confidence: data.replyStatus.count === 1 ? 0.95 : 0.75,
    };
  } catch (e) {
    console.error('RxImage error', e);
    return null;
  }
}

// Also try by brand/generic name when no imprint available
export async function lookupByName(name: string): Promise<RxImageResult | null> {
  try {
    const params = new URLSearchParams({ name, size: '1' });
    const url = `${BASE}/rxnav?${params.toString()}`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { replyStatus?: { success: boolean }; nlmRxImages?: any[] };
    if (!data.replyStatus?.success || !data.nlmRxImages?.length) return null;
    const hit = data.nlmRxImages[0];
    return {
      ndc11: hit.ndc11 ?? '',
      rxcui: hit.rxcui ?? '',
      name: hit.name ?? '',
      labeler: hit.labeler ?? '',
      imageUrl: hit.imageUrl ?? '',
      confidence: 0.7,
    };
  } catch {
    return null;
  }
}
