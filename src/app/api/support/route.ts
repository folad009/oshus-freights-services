import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createTicketSchema } from "@/lib/validations";
import { getCustomerIdForUser } from "@/lib/helpers";

export async function GET() {
  try {
    const user = await getAuthContext("support:read");
    const where: Record<string, unknown> = {};

    if (user.role === UserRole.CUSTOMER) {
      const cid = await getCustomerIdForUser(user.id);
      if (!cid) return successResponse([]);
      where.customerId = cid;
    }

    const tickets = await db.supportTicket.findMany({
      where,
      include: {
        customer: { select: { companyName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(tickets);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("support:write");
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    let customerId = body.customerId as string | undefined;
    if (user.role === UserRole.CUSTOMER) {
      customerId = (await getCustomerIdForUser(user.id)) ?? undefined;
      if (!customerId) return errorResponse("Customer profile not found", 404);
    }
    if (!customerId) return errorResponse("Customer ID is required");

    const ticket = await db.supportTicket.create({
      data: {
        ...parsed.data,
        customerId,
        createdById: user.id,
      },
    });

    return successResponse(ticket, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
