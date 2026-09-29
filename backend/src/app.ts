import express from "express";
import { randomUUID } from "node:crypto";

const app = express();

app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "SnailPay está funcionando",
  });
});

app.post("/api/payments", async (req, res) => {
  const body = req.body ?? {};

  const {
    card_number,
    expiration_date,
    cvv,
    full_name,
    transaction_amount,
    payer_id,
    payer_email,
    simulation = "normal",
  } = body;

  // Solo estas tarjetas ficticias están permitidas.
  const testCards = ["1234123412341234", "4000000000000002"];

  const isTestCard =
    typeof card_number === "string" && testCards.includes(card_number);

  const isTestCvv = cvv === "543";

  const validAmount =
    typeof transaction_amount === "number" &&
    Number.isFinite(transaction_amount) &&
    transaction_amount > 0 &&
    transaction_amount <= 100000 &&
    Math.abs(transaction_amount * 100 - Math.round(transaction_amount * 100)) <
      0.000001;

  const operationId = randomUUID();

  // Todas las respuestas utilizan la misma estructura.
  function response(status: "approved" | "rejected" | "error", detail: string) {
    return {
      id: operationId,
      status,
      status_detail: detail,
      transaction_amount:
        typeof transaction_amount === "number" &&
        Number.isFinite(transaction_amount)
          ? transaction_amount
          : null,
      date_created: new Date().toISOString(),
      authorization_code: status === "approved" ? randomUUID() : null,
      reference: `SIM-${operationId}`,
      payer_id: typeof payer_id === "string" ? payer_id : null,
      payer_email: typeof payer_email === "string" ? payer_email : null,

      // Nunca devolvemos datos de tarjetas fuera del catálogo ficticio.
      card_number: isTestCard ? card_number : null,
      cvv: isTestCard && isTestCvv ? cvv : null,
    };
  }

  if (
    !isTestCard ||
    !isTestCvv ||
    expiration_date !== "12/26" ||
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof payer_id !== "string" ||
    !payer_id.trim() ||
    typeof payer_email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer_email) ||
    !validAmount ||
    !["normal", "system_error", "timeout"].includes(simulation)
  ) {
    res
      .status(400)
      .json(
        response(
          "rejected",
          "Datos inválidos. Usa los datos ficticios indicados y un monto de hasta $100,000 con máximo dos decimales.",
        ),
      );
    return;
  }

  if (simulation === "system_error") {
    res
      .status(503)
      .json(
        response(
          "error",
          "SnailPay no está disponible. No se aplicó ninguna recarga.",
        ),
      );
    return;
  }

  if (simulation === "timeout") {
    // El frontend tendrá un límite de espera menor a 10 segundos.
    await new Promise((resolve) => setTimeout(resolve, 10000));

    if (!res.destroyed) {
      res
        .status(504)
        .json(
          response(
            "error",
            "Se agotó el tiempo de espera. No se aplicó ninguna recarga.",
          ),
        );
    }

    return;
  }

  if (card_number === "4000000000000002") {
    res
      .status(422)
      .json(
        response(
          "rejected",
          "Tarjeta de prueba rechazada. No se aplicó ninguna recarga.",
        ),
      );
    return;
  }

  res.status(200).json(response("approved", "Recarga aprobada correctamente."));
});

export default app;
