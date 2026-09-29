// @vitest-environment jsdom
/// <reference types="node" />
import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPayment,
  getSessionUser,
  getUser,
  login,
  logout,
  register,
} from "./auth";
import type { User } from "./auth";
import type { PaymentResponse } from "./payments";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
});

function createAccount() {
  return register(
    "Usuario de prueba",
    "usuario@example.com",
    "ClavePrueba123",
    "ClavePrueba123",
  );
}

function approvedPayment(user: User): PaymentResponse {
  return {
    id: "operation-001",
    status: "approved",
    status_detail: "Recarga aprobada",
    transaction_amount: 150,
    date_created: new Date().toISOString(),
    authorization_code: "test-authorization",
    reference: "SIM-operation-001",
    payer_id: user.id,
    payer_email: user.email,
    card_number: "1234123412341234",
    cvv: "543",
  };
}

describe("Registro y sesión", () => {
  it("registra al usuario con saldo cero y contraseña protegida", async () => {
    const user = await createAccount();

    expect(user.balance).toBe(0);
    expect(user.passwordHash).not.toBe("ClavePrueba123");
    expect(user.passwordHash).toHaveLength(64);
    expect(user.salt).toHaveLength(32);
    expect(localStorage.getItem("snail-user")).not.toContain("ClavePrueba123");
    expect(getSessionUser()?.id).toBe(user.id);
  });

  it("rechaza contraseñas que no coinciden sin crear una cuenta", async () => {
    await expect(
      register(
        "Usuario",
        "usuario@example.com",
        "ClavePrueba123",
        "OtraClave123",
      ),
    ).rejects.toThrow("Las contraseñas no coinciden.");

    expect(getUser()).toBeNull();
    expect(getSessionUser()).toBeNull();
  });

  it("permite cerrar sesión y volver a entrar", async () => {
    const user = await createAccount();

    logout();

    expect(getSessionUser()).toBeNull();
    expect(getUser()?.id).toBe(user.id);

    await login("usuario@example.com", "ClavePrueba123");

    expect(getSessionUser()?.id).toBe(user.id);
  });

  it("rechaza una contraseña incorrecta sin abrir una sesión", async () => {
    await createAccount();
    logout();

    await expect(login("usuario@example.com", "Incorrecta123")).rejects.toThrow(
      "Correo o contraseña incorrectos.",
    );

    expect(getSessionUser()).toBeNull();
  });

  it("no sobrescribe una cuenta existente", async () => {
    const original = await createAccount();

    await expect(createAccount()).rejects.toThrow("Ya existe una cuenta");

    expect(getUser()?.id).toBe(original.id);
  });
});

describe("Saldo y recargas", () => {
  it("guarda el saldo actualizado y el comprobante ficticio", async () => {
    const user = await createAccount();
    const payment = approvedPayment(user);

    const updated = applyPayment(payment);

    expect(updated.balance).toBe(150);
    expect(getUser()?.balance).toBe(150);
    expect(getUser()?.payments?.[0].card_number).toBe("1234123412341234");
    expect(getUser()?.payments?.[0].cvv).toBe("543");

    logout();
    await login("usuario@example.com", "ClavePrueba123");

    expect(getSessionUser()?.balance).toBe(150);
  });

  it("no acredita dos veces la misma operación", async () => {
    const user = await createAccount();
    const payment = approvedPayment(user);

    applyPayment(payment);
    applyPayment(payment);

    expect(getUser()?.balance).toBe(150);
    expect(getUser()?.payments).toHaveLength(1);
  });

  it.each(["rejected", "error"] as const)(
    "no modifica el saldo ante una respuesta %s",
    async (status) => {
      const user = await createAccount();
      const payment = {
        ...approvedPayment(user),
        status,
        authorization_code: null,
      };

      expect(() => applyPayment(payment)).toThrow();
      expect(getUser()?.balance).toBe(0);
    },
  );

  it("rechaza una recarga aprobada para otro usuario", async () => {
    const user = await createAccount();
    const payment = {
      ...approvedPayment(user),
      payer_id: "other-user",
    };

    expect(() => applyPayment(payment)).toThrow();
    expect(getUser()?.balance).toBe(0);
  });

  it("no permite aplicar recargas sin sesión", async () => {
    const user = await createAccount();
    logout();

    expect(() => applyPayment(approvedPayment(user))).toThrow(
      "Debes iniciar sesión",
    );

    expect(getUser()?.balance).toBe(0);
  });

  it("suma cantidades decimales sin acumular errores de precisión", async () => {
    const user = await createAccount();
    const payment = approvedPayment(user);

    applyPayment({
      ...payment,
      id: "decimal-001",
      transaction_amount: 0.1,
    });

    applyPayment({
      ...payment,
      id: "decimal-002",
      transaction_amount: 0.2,
    });

    expect(getUser()?.balance).toBe(0.3);
  });
});
