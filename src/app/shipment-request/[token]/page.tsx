import { ShipmentIntakePageShell } from "@/components/forms/shipment-intake-form";

export default async function ShipmentRequestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ShipmentIntakePageShell token={token} />;
}
