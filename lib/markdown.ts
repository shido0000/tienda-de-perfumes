/**
 * Renderizador de Markdown mínimo y seguro para los textos legales editables.
 *
 * Admite solo: `## Título`, párrafos, listas (`- ` y `1. `) y **negrita**.
 * No hay HTML en la salida — el resultado son estructuras de datos que el
 * componente React convierte en elementos, así que no hace falta
 * dangerouslySetInnerHTML y un texto malicioso guardado en los ajustes no puede
 * inyectar scripts.
 */
export type InlineNode = { text: string; bold: boolean };
export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; spans: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

/** Divide un texto en tramos normales y en negrita. */
export function parseInline(text: string): InlineNode[] {
  const spans: InlineNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index), bold: false });
    spans.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last), bold: false });
  return spans.length ? spans : [{ text, bold: false }];
}

/** Convierte el texto de un ajuste legal en bloques renderizables. */
export function parseLegalText(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", spans: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({
      type: "list",
      ordered: list.ordered,
      items: list.items.map((item) => parseInline(item)),
    });
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1].trim() });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (list && list.ordered) flushList();
      list ??= { ordered: false, items: [] };
      list.items.push(bullet[1].trim());
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (list && !list.ordered) flushList();
      list ??= { ordered: true, items: [] };
      list.items.push(numbered[1].trim());
      continue;
    }
    if (list) flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
