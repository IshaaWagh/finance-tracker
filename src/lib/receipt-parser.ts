export interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  date: string | null; // ISO yyyy-mm-dd
  rawText: string;
}

const TOTAL_LINE_PATTERN =
  /(grand\s*total|total\s*due|total\s*amount|amount\s*due|total|balance\s*due)\s*[:-]?\s*\$?₹?€?£?\s*([\d,]+\.\d{2}|[\d,]+)/i;

const CURRENCY_AMOUNT_PATTERN = /(?:₹|\$|€|£|rs\.?|inr|usd)\s*([\d,]+\.\d{2}|[\d,]+)/gi;

const DATE_PATTERNS: RegExp[] = [
  /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/, // DD/MM/YYYY or MM/DD/YYYY
  /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, // YYYY-MM-DD
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i,
];

function normalizeAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

function extractAmount(text: string): number | null {
  const totalMatch = text.match(TOTAL_LINE_PATTERN);
  if (totalMatch) {
    const value = normalizeAmount(totalMatch[2]!);
    if (!Number.isNaN(value)) return value;
  }

  // Fall back to the largest currency-looking figure on the receipt,
  // since the grand total is usually the largest line item.
  const matches = Array.from(text.matchAll(CURRENCY_AMOUNT_PATTERN))
    .map((m) => normalizeAmount(m[1]!))
    .filter((n) => !Number.isNaN(n));

  if (matches.length > 0) return Math.max(...matches);
  return null;
}

function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    try {
      let year: number, month: number, day: number;
      if (pattern === DATE_PATTERNS[0]) {
        // Ambiguous DD/MM vs MM/DD - assume DD/MM if first part > 12
        const a = parseInt(match[1]!, 10);
        const b = parseInt(match[2]!, 10);
        day = a > 12 ? a : b;
        month = a > 12 ? b : a;
        year = parseInt(match[3]!, 10);
        if (year < 100) year += 2000;
      } else if (pattern === DATE_PATTERNS[1]) {
        year = parseInt(match[1]!, 10);
        month = parseInt(match[2]!, 10);
        day = parseInt(match[3]!, 10);
      } else {
        const months = [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "nov",
          "dec",
        ];
        month = months.indexOf(match[1]!.toLowerCase().slice(0, 3)) + 1;
        day = parseInt(match[2]!, 10);
        year = parseInt(match[3]!, 10);
      }
      if (month < 1 || month > 12 || day < 1 || day > 31) continue;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return iso;
    } catch {
      continue;
    }
  }
  return null;
}

function extractMerchant(text: string): string | null {
  // The merchant name is almost always one of the first non-empty lines,
  // and rarely contains digits or currency symbols.
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  for (const line of lines.slice(0, 6)) {
    const digitRatio = (line.match(/\d/g)?.length ?? 0) / line.length;
    const looksLikeAddressOrPhone = /\d{3,}/.test(line) && digitRatio > 0.3;
    const looksLikeTotalLine = /total|amount|date|receipt|invoice|#/i.test(line);
    if (!looksLikeAddressOrPhone && !looksLikeTotalLine && line.length >= 3) {
      return line.replace(/[^a-zA-Z0-9&'.,\- ]/g, "").trim() || null;
    }
  }
  return null;
}

/** Parses raw OCR text from a receipt into structured fields. */
export function parseReceiptText(rawText: string): ParsedReceipt {
  return {
    merchant: extractMerchant(rawText),
    amount: extractAmount(rawText),
    date: extractDate(rawText),
    rawText,
  };
}
