import { db } from "@/lib/db";
import { NotificationType, UserRole } from "@/types/enums";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: NotifyParams) {
  const notification = await db.notification.create({ data: params });

  if (process.env.RESEND_API_KEY) {
    sendEmailNotification(params).catch(console.error);
  }

  return notification;
}

async function sendEmailNotification(params: NotifyParams) {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, firstName: true },
  });
  if (!user?.email) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Oshus Freight <notifications@oshus.com>",
      to: user.email,
      subject: params.title,
      html: `<p>Hi ${user.firstName},</p><p>${params.message}</p>${params.link ? `<p><a href="${process.env.NEXTAUTH_URL}${params.link}">View details</a></p>` : ""}`,
    }),
  });
}

export async function notifyRoleUsers(role: UserRole, params: Omit<NotifyParams, "userId">) {
  const users = await db.user.findMany({
    where: { role, status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(users.map((u) => createNotification({ ...params, userId: u.id })));
}

export async function notifyShipmentCreated(shipment: {
  id: string;
  trackingNumber: string;
  customerId: string;
  origin: string;
  destination: string;
}) {
  const customer = await db.customer.findUnique({
    where: { id: shipment.customerId },
    select: { userId: true, companyName: true },
  });

  if (customer) {
    await createNotification({
      userId: customer.userId,
      type: NotificationType.SHIPMENT_CREATED,
      title: "Shipment Created",
      message: `Your shipment ${shipment.trackingNumber} from ${shipment.origin} to ${shipment.destination} has been created.`,
      link: "/dashboard/shipments",
    });
  }

  await notifyRoleUsers(UserRole.ADMIN, {
    type: NotificationType.SHIPMENT_CREATED,
    title: "New Shipment",
    message: `${customer?.companyName ?? "A customer"} created shipment ${shipment.trackingNumber}.`,
    link: "/dashboard/shipments",
  });

  await notifyRoleUsers(UserRole.DISPATCHER, {
    type: NotificationType.SHIPMENT_CREATED,
    title: "New Shipment to Schedule",
    message: `Shipment ${shipment.trackingNumber} is ready for scheduling.`,
    link: "/dashboard/shipments",
  });
}

export async function notifyShipmentStatusChanged(
  shipment: { id: string; trackingNumber: string; customerId: string; status: string },
  previousStatus: string
) {
  const customer = await db.customer.findUnique({
    where: { id: shipment.customerId },
    select: { userId: true },
  });

  const type =
    shipment.status === "DELIVERED"
      ? NotificationType.SHIPMENT_DELIVERED
      : NotificationType.SHIPMENT_STATUS_CHANGED;

  const title =
    shipment.status === "DELIVERED" ? "Shipment Delivered" : "Shipment Status Updated";

  const message =
    shipment.status === "DELIVERED"
      ? `Your shipment ${shipment.trackingNumber} has been delivered.`
      : `Shipment ${shipment.trackingNumber} updated from ${previousStatus.replace(/_/g, " ")} to ${shipment.status.replace(/_/g, " ")}.`;

  if (customer) {
    await createNotification({
      userId: customer.userId,
      type,
      title,
      message,
      link: `/track?number=${shipment.trackingNumber}`,
    });
  }

  if (shipment.status === "OUT_FOR_DELIVERY") {
    const driver = await db.shipment.findUnique({
      where: { id: shipment.id },
      select: { driver: { select: { userId: true } } },
    });
    if (driver?.driver?.userId) {
      await createNotification({
        userId: driver.driver.userId,
        type: NotificationType.SHIPMENT_STATUS_CHANGED,
        title: "Delivery Assignment",
        message: `Shipment ${shipment.trackingNumber} is out for delivery.`,
        link: "/dashboard/shipments",
      });
    }
  }
}

export async function notifyCustomerCreated(customer: {
  companyName: string;
  userId: string;
}) {
  await notifyRoleUsers(UserRole.ADMIN, {
    type: NotificationType.CUSTOMER_CREATED,
    title: "New Customer Registered",
    message: `${customer.companyName} has been added to the platform.`,
    link: "/dashboard/customers",
  });
}

export async function notifyInvoiceGenerated(invoice: {
  invoiceNumber: string;
  customerUserId: string;
  totalAmount: number;
}) {
  await createNotification({
    userId: invoice.customerUserId,
    type: NotificationType.INVOICE_GENERATED,
    title: "Invoice Ready",
    message: `Invoice ${invoice.invoiceNumber} for $${invoice.totalAmount.toFixed(2)} is ready for payment.`,
    link: "/dashboard/invoices",
  });
}

export async function notifyDriverAssigned(shipment: {
  trackingNumber: string;
  driverUserId: string;
  origin: string;
  destination: string;
}) {
  await createNotification({
    userId: shipment.driverUserId,
    type: NotificationType.SHIPMENT_STATUS_CHANGED,
    title: "New Delivery Assignment",
    message: `You have been assigned shipment ${shipment.trackingNumber} (${shipment.origin} → ${shipment.destination}).`,
    link: "/dashboard/shipments",
  });
}

export async function notifyDispatcherAssigned(shipment: {
  trackingNumber: string;
  dispatcherUserId: string;
  origin: string;
  destination: string;
}) {
  await createNotification({
    userId: shipment.dispatcherUserId,
    type: NotificationType.SHIPMENT_STATUS_CHANGED,
    title: "Shipment Handoff",
    message: `Warehouse assigned shipment ${shipment.trackingNumber} (${shipment.origin} → ${shipment.destination}) to you for dispatch.`,
    link: "/dashboard/shipments",
  });
}

export async function notifyPaymentReceived(payment: {
  invoiceNumber: string;
  amount: number;
  customerUserId: string;
  paidInFull: boolean;
}) {
  await createNotification({
    userId: payment.customerUserId,
    type: NotificationType.PAYMENT_RECEIVED,
    title: payment.paidInFull ? "Payment Complete" : "Payment Received",
    message: payment.paidInFull
      ? `Your payment of $${payment.amount.toFixed(2)} for invoice ${payment.invoiceNumber} was successful. Thank you!`
      : `We received your payment of $${payment.amount.toFixed(2)} for invoice ${payment.invoiceNumber}.`,
    link: "/dashboard/invoices",
  });

  await notifyRoleUsers(UserRole.FINANCE_OFFICER, {
    type: NotificationType.PAYMENT_RECEIVED,
    title: "Payment Received",
    message: `Payment of $${payment.amount.toFixed(2)} received for invoice ${payment.invoiceNumber}.`,
    link: "/dashboard/payments",
  });
}
