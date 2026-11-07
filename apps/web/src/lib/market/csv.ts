/** Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v !== "")) rows.push(row);
  }
  return rows;
}

/** Rows as objects keyed by the header row, headers trimmed. */
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      o[h] = (r[i] ?? "").trim();
    });
    return o;
  });
}

/**
 * Normalise an Assessor's Parcel Number for matching: digits only.
 * Orange County APNs are written 123-456-78 and sometimes with spaces or
 * extra text. Returns null when fewer than 6 digits remain, since a
 * fragment would match too much. Free text with several APNs returns null.
 */
export function normalizeApn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Drop parenthetical notes ("(Lot E)", "(Unit 1234)"), split on anything that
  // joins several APNs, then keep groups with 6+ digits.
  const groups = raw
    .replace(/\([^)]*\)|\([^)]*$/g, " ")
    .split(/[&,;/+]|\band\b/i)
    .map((part) => part.replace(/\D/g, ""))
    .filter((digits) => digits.length >= 6);
  // Exactly one APN-sized group, or we refuse to match rather than risk the wrong parcel.
  return groups.length === 1 ? groups[0] : null;
}
