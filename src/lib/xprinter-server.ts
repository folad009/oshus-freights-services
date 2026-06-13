import net from "net";
import { buildInvoiceEscPos, invoiceDetailsToPrintData } from "@/lib/escpos";
import { formatDate } from "@/lib/helpers";

export function getXPrinterConfig() {
  const host = process.env.XPRINTER_HOST?.trim();
  const port = Number(process.env.XPRINTER_PORT ?? "9100");

  if (!host) return null;

  return { host, port: Number.isFinite(port) ? port : 9100 };
}

export async function sendEscPosToNetworkPrinter(host: string, port: number, data: Uint8Array) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(3000);

    socket.on("timeout", () => {
      fail(
        new Error(
          `Could not reach XPrinter at ${host}:${port}. Confirm the printer IP, WiFi connection, and that raw printing on port ${port} is enabled.`
        )
      );
    });

    socket.on("error", (error) => {
      const code = "code" in error ? String(error.code) : "";
      if (code === "ECONNREFUSED") {
        fail(
          new Error(
            `XPrinter refused the connection at ${host}:${port}. Check the IP address and port.`
          )
        );
        return;
      }
      if (code === "EHOSTUNREACH" || code === "ENETUNREACH") {
        fail(
          new Error(
            `XPrinter at ${host}:${port} is unreachable from this server. Use USB printing or run the app on the same network as the printer.`
          )
        );
        return;
      }
      fail(error instanceof Error ? error : new Error("Network print failed"));
    });

    socket.connect(port, host, () => {
      socket.write(Buffer.from(data), (error) => {
        if (settled) return;
        settled = true;
        socket.end();
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

export async function printInvoiceEscPosToNetwork(invoice: {
  invoiceNumber: string;
  serviceType: string;
  status: string;
  createdAt: Date | string;
  dueDate: Date | string;
  customer: { companyName: string };
  shipment: { trackingNumber: string; weight: number } | null;
}) {
  const config = getXPrinterConfig();
  if (!config) {
    return { ok: false as const, code: "PRINTER_NOT_CONFIGURED" as const };
  }

  const payload = buildInvoiceEscPos(
    invoiceDetailsToPrintData({
      invoiceNumber: invoice.invoiceNumber,
      serviceType: invoice.serviceType,
      status: invoice.status,
      createdAt: formatDate(invoice.createdAt),
      dueDate: formatDate(invoice.dueDate),
      customer: invoice.customer,
      shipment: invoice.shipment,
    })
  );

  try {
    await sendEscPosToNetworkPrinter(config.host, config.port, payload);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      code: "NETWORK_PRINT_FAILED" as const,
      message: error instanceof Error ? error.message : "Network print failed",
    };
  }
}
