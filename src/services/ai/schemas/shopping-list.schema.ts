import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';

export const shoppingListSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
    }),
  ),
});

export type ShoppingListResult = z.infer<typeof shoppingListSchema>;

export const shoppingListResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.STRING },
        },
        required: ['name', 'quantity'],
      },
    },
  },
  required: ['items'],
};
