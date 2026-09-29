import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app";

const validPayment = {
  card_number: "1234123412341234",
  expiration_date: "12/26",
  cvv: "543",
  full_name: "Usuario de prueba",
  transaction_amount: 150,
  payer_id: "test-user-001",
  payer_email: "usuario@example.com",
  simulation: "normal",
};

const requiredFields = [
  "id",
  "status",
  "status_detail",
  "transaction_amount",
  "date_created",
  "authorization_code",
  "reference",
  "payer_id",
  "payer_email",
  "card_number",
  "cvv",
];

describe("API de SnailPay", () => {
  it("aprueba una recarga con los datos ficticios correctos", async () => {
    const response = await request(app)
      .post("/api/payments")
      .send(validPayment);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("approved");
    expect(response.body.transaction_amount).toBe(150);
    expect(response.body.payer_id).toBe(validPayment.payer_id);
    expect(response.body.payer_email).toBe(validPayment.payer_email);
    expect(response.body.authorization_code).toEqual(expect.any(String));
    expect(response.body.authorization_code.length).toBeGreaterThan(0);
    expect(response.body.card_number).toBe(validPayment.card_number);
    expect(response.body.cvv).toBe("543");
  });

  it("rechaza la tarjeta ficticia destinada a rechazo", async () => {
    const response = await request(app)
      .post("/api/payments")
      .send({
        ...validPayment,
        card_number: "4000000000000002",
      });

    expect(response.status).toBe(422);
    expect(response.body.status).toBe("rejected");
    expect(response.body.authorization_code).toBeNull();
  });

  it("devuelve un error sin autorización cuando falla el sistema", async () => {
    const response = await request(app)
      .post("/api/payments")
      .send({
        ...validPayment,
        simulation: "system_error",
      });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("error");
    expect(response.body.authorization_code).toBeNull();
  });

  it.each([0, -10, 100001, 1.234, "150", null])(
    "rechaza el monto inválido %s",
    async (amount) => {
      const response = await request(app)
        .post("/api/payments")
        .send({
          ...validPayment,
          transaction_amount: amount,
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("rejected");
      expect(response.body.authorization_code).toBeNull();
    },
  );

  it("rechaza una solicitud sin datos", async () => {
    const response = await request(app).post("/api/payments").send({});

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("rejected");
  });

  it("no devuelve números de tarjeta fuera del catálogo ficticio", async () => {
    const response = await request(app)
      .post("/api/payments")
      .send({
        ...validPayment,
        card_number: "9999999999999999",
      });

    expect(response.status).toBe(400);
    expect(response.body.card_number).toBeNull();
    expect(response.body.cvv).toBeNull();
  });

  it.each([
    ["aprobación", {}],
    ["rechazo", { card_number: "4000000000000002" }],
    ["error del sistema", { simulation: "system_error" }],
  ])(
    "incluye los campos requeridos en una respuesta de %s",
    async (_name, changes) => {
      const response = await request(app)
        .post("/api/payments")
        .send({ ...validPayment, ...changes });

      for (const field of requiredFields) {
        expect(response.body).toHaveProperty(field);
      }

      expect(Number.isNaN(Date.parse(response.body.date_created))).toBe(false);
    },
  );

  it("genera identificadores distintos para operaciones distintas", async () => {
    const first = await request(app).post("/api/payments").send(validPayment);

    const second = await request(app).post("/api/payments").send(validPayment);

    expect(first.body.id).not.toBe(second.body.id);
    expect(first.body.reference).not.toBe(second.body.reference);
  });
});
