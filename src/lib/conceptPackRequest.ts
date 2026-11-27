export const CONCEPT_PACK_UNAVAILABLE_MESSAGE =
  "Could not build your Concept Pack. Try again.";

export class ConceptPackRequestError extends Error {}

export async function requestConceptPack<T>(generate: () => Promise<T>): Promise<
  | { ok: true; value: T }
  | { ok: false; message: string }
> {
  try {
    return { ok: true, value: await generate() };
  } catch (error) {
    return { ok: false, message: error instanceof ConceptPackRequestError ? error.message : CONCEPT_PACK_UNAVAILABLE_MESSAGE };
  }
}
