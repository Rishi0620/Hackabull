import { z } from 'zod';

export const BottleExtractionSchema = z.object({
  brandName: z.string().nullable().optional().transform((v) => v || 'Unknown Medication'),
  genericName: z.string().nullable().optional(),
  activeIngredients: z
    .array(z.object({ name: z.string(), strength: z.string() }))
    .nullable()
    .optional()
    .transform((v) => v || []),
  ndc: z.string().nullable().optional(),
  rxNumber: z.string().nullable().optional(),
  prescriber: z.string().nullable().optional(),
  pharmacy: z.string().nullable().optional(),
  dosageInstructions: z.string().nullable().optional().transform((v) => v || 'See label for dosage instructions.'),
  warnings: z.array(z.string()).nullable().optional().transform((v) => v || []),
  refillsRemaining: z.number().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('low'),
});

export type BottleExtraction = z.infer<typeof BottleExtractionSchema>;

export const PillIdentificationSchema = z.object({
  pills: z
    .array(
      z.object({
        shape: z.string().nullable().optional().transform((v) => v || 'unknown'),
        color: z.string().nullable().optional().transform((v) => v || 'unknown'),
        secondaryColor: z.string().nullable().optional(),
        imprint: z.string().nullable().optional(),
        approximateSize: z.string().nullable().optional().transform((v) => v || 'medium'),
        scoreLine: z.boolean().nullable().optional().transform((v) => v ?? false),
        match: z.object({
          medicationName: z.string().nullable().optional().transform((v) => v || null),
          confidence: z.number().nullable().optional().transform((v) => v ?? 0),
        }),
      })
    )
    .nullable()
    .optional()
    .transform((v) => v || []),
});

export type PillIdentification = z.infer<typeof PillIdentificationSchema>;

export const PlainLanguageSchema = z.object({
  whatItDoes: z.string().nullable().optional().transform((v) => v || 'Ask your pharmacist what this medication is for.'),
  howToTake: z.string().nullable().optional().transform((v) => v || 'Follow the directions on the label.'),
  watchOutFor: z.string().nullable().optional().transform((v) => v || 'Read the warning label carefully.'),
});

export type PlainLanguage = z.infer<typeof PlainLanguageSchema>;

export const InteractionResultSchema = z.object({
  severity: z.enum(['info', 'caution', 'danger', 'none']),
  summary: z.string(),
  plainLanguage: z.string(),
});

export type InteractionResult = z.infer<typeof InteractionResultSchema>;
