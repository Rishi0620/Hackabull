import staticInteractions from '@/data/interactions-top200.json';
import type { InteractionResult } from './schema';

export type StaticInteraction = {
  pair: [string, string];
  severity: 'info' | 'caution' | 'danger';
  summary: string;
  plainLanguage: string;
};

const list = staticInteractions as StaticInteraction[];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function checkPairStatic(a: string, b: string): StaticInteraction | null {
  const na = normalize(a);
  const nb = normalize(b);
  for (const item of list) {
    const [x, y] = item.pair.map(normalize);
    if ((x === na && y === nb) || (x === nb && y === na)) return item;
    if (na.includes(x) && nb.includes(y)) return item;
    if (nb.includes(x) && na.includes(y)) return item;
  }
  return null;
}

export function checkAllAgainst(
  newIngredient: string,
  existingIngredients: string[]
): { ingredient: string; result: StaticInteraction }[] {
  const hits: { ingredient: string; result: StaticInteraction }[] = [];
  for (const ing of existingIngredients) {
    const res = checkPairStatic(newIngredient, ing);
    if (res) hits.push({ ingredient: ing, result: res });
  }
  return hits;
}

export function toInteractionResult(s: StaticInteraction): InteractionResult {
  return {
    severity: s.severity,
    summary: s.summary,
    plainLanguage: s.plainLanguage,
  };
}
