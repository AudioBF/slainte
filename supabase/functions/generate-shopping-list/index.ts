import { requireAuthenticatedUser } from '../_shared/auth.ts';
import { handleCors } from '../_shared/cors.ts';
import { generateStructuredJson, toGeminiErrorInfo } from '../_shared/gemini.ts';
import { jsonError, jsonOk, readJson } from '../_shared/http.ts';
import {
  buildShoppingListRequestPrompt,
  consolidateShoppingListItems,
  shoppingListResponseSchema,
  shoppingListSchema,
  validateShoppingListRequest,
} from '../_shared/shopping-list.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  if (req.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'Use POST for shopping list generation.', 405);
  }

  const auth = requireAuthenticatedUser(req);
  if (!auth.ok) {
    return jsonError('UNAUTHORIZED', auth.error, 401);
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return jsonError('BAD_REQUEST', 'Request body must be valid JSON.', 400);
  }

  const request = validateShoppingListRequest(body);
  if (!request.ok) {
    return jsonError('BAD_REQUEST', request.error, 400);
  }

  try {
    const raw = await generateStructuredJson<unknown>({
      task: 'shoppingList',
      prompt: buildShoppingListRequestPrompt(request.value),
      responseSchema: shoppingListResponseSchema,
    });

    const parsed = shoppingListSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError('VALIDATION', 'Gemini returned an invalid shopping list.', 502);
    }

    const items = consolidateShoppingListItems(parsed.data.items);
    return jsonOk({ items });
  } catch (error) {
    const info = toGeminiErrorInfo(error);
    return jsonError(info.code, info.message, info.status);
  }
});
