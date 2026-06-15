import JsBarcode from "jsbarcode";
import { normalizeShipmentBarcode } from "@/lib/barcode";

type BarcodeSvgOptions = {
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
};

export function renderShipmentBarcodeSvgString(
  value: string,
  options: BarcodeSvgOptions = {}
) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svg, normalizeShipmentBarcode(value), {
    format: "CODE128",
    displayValue: options.displayValue ?? true,
    fontSize: options.fontSize ?? 12,
    height: options.height ?? 52,
    width: options.width ?? 1.6,
    margin: 4,
    textAlign: "center",
    textMargin: 2,
  });

  return svg.outerHTML;
}
