const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    channel?: string;
    paid_at?: string;
    metadata?: {
      invoiceId?: string;
      paymentMethod?: string;
      [key: string]: unknown;
    };
  };
};

export function getPaystackSecretKey() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return secret;
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error("Failed to communicate with Paystack");
  }

  return payload;
}

export async function initializePaystackTransaction(params: {
  email: string;
  amountInNaira: number;
  callbackUrl: string;
  channels: string[];
  metadata: Record<string, unknown>;
  reference: string;
}) {
  const amountInKobo = Math.round(params.amountInNaira * 100);
  if (amountInKobo <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const response = await paystackRequest<PaystackInitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountInKobo,
      callback_url: params.callbackUrl,
      reference: params.reference,
      channels: params.channels,
      metadata: params.metadata,
      currency: "NGN",
    }),
  });

  if (!response.status || !response.data?.authorization_url) {
    throw new Error(response.message || "Unable to initialize Paystack payment");
  }

  return response.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await paystackRequest<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );

  if (!response.status || !response.data) {
    throw new Error(response.message || "Unable to verify Paystack payment");
  }

  return response.data;
}
