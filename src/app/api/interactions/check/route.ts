import { NextRequest, NextResponse } from 'next/server';
import { checkAllAgainst, toInteractionResult } from '@/lib/interactions';

export async function POST(req: NextRequest) {
  try {
    const { ingredients } = await req.json();
    if (!Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'ingredients must be array' }, { status: 400 });
    }
    const results: any[] = [];
    for (let i = 0; i < ingredients.length; i++) {
      const rest = ingredients.filter((_, j) => j !== i);
      const hits = checkAllAgainst(ingredients[i], rest);
      for (const h of hits) {
        results.push({
          a: ingredients[i],
          b: h.ingredient,
          ...toInteractionResult(h.result),
        });
      }
    }
    // dedupe pairs
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const k = [r.a, r.b].sort().join('|');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return NextResponse.json({ interactions: deduped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
