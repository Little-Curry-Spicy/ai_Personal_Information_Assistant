/** 按固定字符窗口切分文本，重叠若干字符以保留上下文边界。 */
export function chunkText(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const t = text.replace(/\r\n/g, '\n').trim();
  if (!t) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(i + chunkSize, t.length);
    chunks.push(t.slice(i, end));
    if (end >= t.length) break;
    const next = end - overlap;
    i = next > i ? next : end;
  }
  return chunks;
}
