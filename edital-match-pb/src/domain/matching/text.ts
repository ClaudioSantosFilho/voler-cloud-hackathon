/** Minúsculas, sem acentos e sem pontuação, para comparar termos. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Verifica se `term` aparece como palavra (ou prefixo de palavra) no texto já normalizado. */
export function containsTerm(normalizedText: string, term: string): boolean {
  const needle = normalizeText(term);
  if (!needle) return false;
  return ` ${normalizedText} `.includes(` ${needle}`);
}
