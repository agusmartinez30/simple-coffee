/** Comparable form of a name: no accents, trimmed, lower case and single spaces ("  Cafés " → "cafes"). */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Slug of the name ("Tostadas dulces" → "tostadas-dulces"), suffixed when taken ("cafes-2"). */
export function uniqueSlug(name: string, taken: readonly string[], fallback: string): string {
  const base =
    normalizeName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback;
  const used = new Set(taken);
  let slug = base;
  for (let suffix = 2; used.has(slug); suffix += 1) slug = `${base}-${suffix}`;
  return slug;
}
