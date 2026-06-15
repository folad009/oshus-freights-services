"use client";

import {
  formatManifestDimensions,
  getTrackUrl,
  manifestSummaryLine,
  type ShipmentManifestData,
} from "@/lib/shipment-manifest";
import {
  getClientXPrinterPaperConfig,
  getThermalLabelPadding,
  getThermalLabelWidth,
  getThermalPageSize,
} from "@/lib/xprinter-paper";
import { ShipmentBarcode } from "@/components/shipment-barcode";
import { renderShipmentBarcodeSvgString } from "@/lib/barcode-svg";

type ShipmentManifestLabelProps = {
  manifest: ShipmentManifestData;
  className?: string;
};

function getLabelStyles() {
  const paper = getClientXPrinterPaperConfig();

  return {
    paper,
    label: {
      width: getThermalLabelWidth(paper),
      minHeight: "auto" as const,
      padding: getThermalLabelPadding(paper),
      fontFamily: "Arial, Helvetica, sans-serif",
      color: "#000",
      background: "#fff",
      boxSizing: "border-box" as const,
    },
    brand: {
      fontSize: paper.fontSize.brand,
      fontWeight: 700,
      letterSpacing: "0.06em",
    },
    subtitle: {
      fontSize: paper.fontSize.subtitle,
      fontWeight: 600,
      marginTop: "2px",
    },
    tracking: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: paper.fontSize.tracking,
      fontWeight: 700,
      letterSpacing: "0.03em",
      lineHeight: 1.2,
      wordBreak: "break-all" as const,
    },
    body: {
      fontSize: paper.fontSize.body,
      lineHeight: 1.45,
    },
    footer: {
      fontSize: paper.fontSize.footer,
    },
  };
}

export function ShipmentManifestLabel({ manifest, className }: ShipmentManifestLabelProps) {
  const dimensions = formatManifestDimensions(manifest);
  const styles = getLabelStyles();

  return (
    <div className={className} style={styles.label}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "8px" }}>
        <div style={styles.brand}>OSHUS FREIGHT SERVICES</div>
        <div style={styles.subtitle}>PACKAGE MANIFEST</div>
      </div>

      <div style={{ textAlign: "center", margin: "10px 0 8px" }}>
        <ShipmentBarcode value={manifest.trackingNumber} />
        <div style={{ ...styles.tracking, marginTop: "6px" }}>{manifest.trackingNumber}</div>
      </div>

      <div
        style={{
          border: "1px solid #000",
          padding: "6px",
          marginBottom: "8px",
          ...styles.body,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "4px" }}>ROUTE</div>
        <div>
          <strong>FROM:</strong> {manifest.origin}
        </div>
        <div style={{ marginTop: "2px" }}>
          <strong>TO:</strong> {manifest.destination}
        </div>
      </div>

      <div style={styles.body}>
        <div>
          <strong>Customer:</strong> {manifest.customer.companyName}
        </div>
        <div>
          <strong>Contact:</strong> {manifest.customer.contactPerson}
        </div>
        <div>
          <strong>Phone:</strong> {manifest.customer.phone}
        </div>
        <div>
          <strong>Type:</strong> {manifest.shipmentType}
        </div>
        <div>
          <strong>Packages:</strong> {manifest.packageCount}
        </div>
        <div>
          <strong>Weight / CBM:</strong> {manifestSummaryLine(manifest)}
        </div>
        {dimensions && (
          <div>
            <strong>Dimensions:</strong> {dimensions}
          </div>
        )}
        {manifest.warehouse && (
          <div>
            <strong>Branch:</strong> {manifest.warehouse.code} · {manifest.warehouse.name}
          </div>
        )}
        <div>
          <strong>Created:</strong> {manifest.createdAt}
        </div>
      </div>

      <div
        style={{
          marginTop: "8px",
          paddingTop: "6px",
          borderTop: "1px dashed #000",
          textAlign: "center",
          ...styles.footer,
          wordBreak: "break-all",
        }}
      >
        Track: {getTrackUrl(manifest.trackingNumber)}
      </div>
    </div>
  );
}

export function printManifestLabel(manifest: ShipmentManifestData) {
  const trackUrl = getTrackUrl(manifest.trackingNumber);
  const dimensions = formatManifestDimensions(manifest);
  const summary = manifestSummaryLine(manifest);
  const styles = getLabelStyles();
  const paper = styles.paper;
  const pageSize = getThermalPageSize(paper);
  const labelWidth = getThermalLabelWidth(paper);
  const labelPadding = getThermalLabelPadding(paper);
  const barcodeSvg = renderShipmentBarcodeSvgString(manifest.trackingNumber, {
    height: paper.widthMm >= 80 ? 52 : 44,
    width: paper.widthMm >= 80 ? 1.6 : 1.3,
    fontSize: paper.widthMm >= 80 ? 12 : 10,
  });

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Manifest ${manifest.trackingNumber}</title>
    <style>
      @page { size: ${pageSize}; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .label {
        width: ${labelWidth};
        min-height: auto;
        padding: ${labelPadding};
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 8px;
      }
      .brand { font-size: ${paper.fontSize.brand}; font-weight: 700; letter-spacing: 0.06em; }
      .subtitle { font-size: ${paper.fontSize.subtitle}; font-weight: 600; margin-top: 2px; }
      .tracking {
        text-align: center;
        margin-top: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: ${paper.fontSize.tracking};
        font-weight: 700;
        letter-spacing: 0.03em;
        word-break: break-all;
      }
      .barcode {
        text-align: center;
        margin: 10px 0 4px;
      }
      .barcode svg {
        max-width: 100%;
        height: auto;
      }
      .route {
        border: 1px solid #000;
        padding: 6px;
        margin-bottom: 8px;
        font-size: ${paper.fontSize.body};
      }
      .route-title { font-weight: 700; margin-bottom: 4px; }
      .details { font-size: ${paper.fontSize.body}; line-height: 1.45; }
      .footer {
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px dashed #000;
        font-size: ${paper.fontSize.footer};
        text-align: center;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <div class="label">
      <div class="header">
        <div class="brand">OSHUS FREIGHT SERVICES</div>
        <div class="subtitle">PACKAGE MANIFEST</div>
      </div>
      <div class="barcode">${barcodeSvg}</div>
      <div class="tracking">${escapeHtml(manifest.trackingNumber)}</div>
      <div class="route">
        <div class="route-title">ROUTE</div>
        <div><strong>FROM:</strong> ${escapeHtml(manifest.origin)}</div>
        <div><strong>TO:</strong> ${escapeHtml(manifest.destination)}</div>
      </div>
      <div class="details">
        <div><strong>Customer:</strong> ${escapeHtml(manifest.customer.companyName)}</div>
        <div><strong>Contact:</strong> ${escapeHtml(manifest.customer.contactPerson)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(manifest.customer.phone)}</div>
        <div><strong>Type:</strong> ${escapeHtml(manifest.shipmentType)}</div>
        <div><strong>Packages:</strong> ${manifest.packageCount}</div>
        <div><strong>Weight / CBM:</strong> ${escapeHtml(summary)}</div>
        ${dimensions ? `<div><strong>Dimensions:</strong> ${escapeHtml(dimensions)}</div>` : ""}
        ${
          manifest.warehouse
            ? `<div><strong>Branch:</strong> ${escapeHtml(manifest.warehouse.code)} · ${escapeHtml(manifest.warehouse.name)}</div>`
            : ""
        }
        <div><strong>Created:</strong> ${escapeHtml(manifest.createdAt)}</div>
      </div>
      <div class="footer">Track: ${escapeHtml(trackUrl)}</div>
    </div>
    <script>
      window.onload = function () {
        window.focus();
        window.print();
        window.onafterprint = function () { window.close(); };
      };
    </script>
  </body>
</html>`;

  const printWindow = window.open("", "_blank", `width=${paper.previewWidthPx},height=720`);
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to print the manifest label.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
