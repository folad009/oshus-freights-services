export type XPrinterPaperWidthMm = 58 | 80;

export type XPrinterPaperConfig = {
  widthMm: XPrinterPaperWidthMm;
  paddingMm: number;
  charsPerLine: number;
  separator: string;
  dotsPerMm: number;
  printWidthDots: number;
  previewWidthPx: number;
  fontSize: {
    brand: string;
    subtitle: string;
    tracking: string;
    body: string;
    footer: string;
  };
};

const PAPER_PRESETS: Record<XPrinterPaperWidthMm, XPrinterPaperConfig> = {
  58: {
    widthMm: 58,
    paddingMm: 2,
    charsPerLine: 32,
    separator: "--------------------------------",
    dotsPerMm: 8,
    printWidthDots: 464,
    previewWidthPx: 220,
    fontSize: {
      brand: "11px",
      subtitle: "9px",
      tracking: "14px",
      body: "9px",
      footer: "8px",
    },
  },
  80: {
    widthMm: 80,
    paddingMm: 2,
    charsPerLine: 48,
    separator: "------------------------------------------------",
    dotsPerMm: 8,
    printWidthDots: 640,
    previewWidthPx: 302,
    fontSize: {
      brand: "13px",
      subtitle: "10px",
      tracking: "17px",
      body: "10px",
      footer: "9px",
    },
  },
};

function parsePaperWidth(value: string | undefined): XPrinterPaperWidthMm {
  return value === "58" ? 58 : 80;
}

export function getXPrinterPaperConfig(): XPrinterPaperConfig {
  const width = parsePaperWidth(
    typeof process !== "undefined" ? process.env.XPRINTER_PAPER_WIDTH : undefined
  );
  return PAPER_PRESETS[width];
}

export function getClientXPrinterPaperConfig(): XPrinterPaperConfig {
  const width = parsePaperWidth(
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_XPRINTER_PAPER_WIDTH : undefined
  );
  return PAPER_PRESETS[width];
}

export function getThermalPageSize(config: XPrinterPaperConfig = getClientXPrinterPaperConfig()) {
  return `${config.widthMm}mm auto`;
}

export function getThermalLabelWidth(config: XPrinterPaperConfig = getClientXPrinterPaperConfig()) {
  return `${config.widthMm}mm`;
}

export function getThermalLabelPadding(config: XPrinterPaperConfig = getClientXPrinterPaperConfig()) {
  return `${config.paddingMm}mm`;
}

export function wrapThermalText(text: string, charsPerLine: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= charsPerLine) {
      current = next;
      continue;
    }

    if (current) lines.push(current);

    if (word.length <= charsPerLine) {
      current = word;
      continue;
    }

    for (let i = 0; i < word.length; i += charsPerLine) {
      lines.push(word.slice(i, i + charsPerLine));
    }
    current = "";
  }

  if (current) lines.push(current);
  return lines;
}

export function formatThermalPaperLabel(config: XPrinterPaperConfig = getClientXPrinterPaperConfig()) {
  return `${config.widthMm}mm thermal roll`;
}
