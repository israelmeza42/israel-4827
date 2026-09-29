export type PaymentRequest = {
  card_number: string;
  expiration_date: string;
  cvv: string;
  full_name: string;
  transaction_amount: number;
  payer_id: string;
  payer_email: string;
  simulation: "normal" | "system_error" | "timeout";
};

export type PaymentResponse = {
  id: string;
  status: "approved" | "rejected" | "error";
  status_detail: string;
  transaction_amount: number | null;
  date_created: string;
  authorization_code: string | null;
  reference: string;
  payer_id: string | null;
  payer_email: string | null;
  card_number: string | null;
  cvv: string | null;
};

function isPaymentResponse(value: unknown): value is PaymentResponse {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;
  const nullableString = (item: unknown) =>
    item === null || typeof item === "string";

  return (
    typeof data.id === "string" &&
    ["approved", "rejected", "error"].includes(String(data.status)) &&
    typeof data.status_detail === "string" &&
    (data.transaction_amount === null ||
      (typeof data.transaction_amount === "number" &&
        Number.isFinite(data.transaction_amount))) &&
    typeof data.date_created === "string" &&
    nullableString(data.authorization_code) &&
    typeof data.reference === "string" &&
    nullableString(data.payer_id) &&
    nullableString(data.payer_email) &&
    nullableString(data.card_number) &&
    nullableString(data.cvv)
  );
}

export async function requestPayment(
  payment: PaymentRequest,
): Promise<PaymentResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payment),
      signal: controller.signal,
    });

    const data: unknown = await response.json();

    if (!isPaymentResponse(data)) {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }

    if (data.status === "approved") {
      if (
        !response.ok ||
        data.transaction_amount !== payment.transaction_amount ||
        data.payer_id !== payment.payer_id ||
        data.payer_email !== payment.payer_email ||
        !data.authorization_code ||
        !data.id
      ) {
        throw new Error(
          "No se pudo verificar la aprobación. No se modificó el saldo.",
        );
      }
    }

    return data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "SnailPay tardó demasiado en responder. No se aplicó la recarga.",
        { cause: error },
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "No se pudo conectar con SnailPay. Comprueba que el backend esté funcionando.",
        { cause: error },
      );
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        "No se recibió una respuesta válida de SnailPay. No se modificó el saldo.",
        { cause: error },
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
