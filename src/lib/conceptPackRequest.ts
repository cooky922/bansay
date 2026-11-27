export const CONCEPT_PACK_UNAVAILABLE_MESSAGE =
  "This pack is unavailable. Request a mentor-prepared pack.";

export async function requestConceptPack<T>(generate: () => Promise<T>): Promise<
  | { ok: true; value: T }
  | { ok: false; message: string }
> {
  try {
    return { ok: true, value: await generate() };
  } catch {
    return { ok: false, message: CONCEPT_PACK_UNAVAILABLE_MESSAGE };
  }
}
