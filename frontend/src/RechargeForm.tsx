import { useState } from "react";
import type { FormEvent } from "react";
import { applyPayment } from "./auth";
import type { User } from "./auth";
import { requestPayment } from "./payments";
import type { PaymentRequest } from "./payments";
import "./RechargeForm.css";

type RechargeFormProps = {
  user: User;
  onBalanceUpdated: (user: User) => void;
};

export default function RechargeForm({
  user,
  onBalanceUpdated,
}: RechargeFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const payment: PaymentRequest = {
        card_number: String(data.get("card")),
        expiration_date: "12/26",
        cvv: "543",
        full_name: String(data.get("holder")).trim(),
        transaction_amount: Number(data.get("amount")),
        payer_id: user.id,
        payer_email: user.email,
        simulation: String(
          data.get("simulation"),
        ) as PaymentRequest["simulation"],
      };

      const result = await requestPayment(payment);

      if (result.status !== "approved") {
        setMessage(result.status_detail);
        return;
      }

      const updatedUser = applyPayment(result);

      onBalanceUpdated(updatedUser);
      setSuccess(true);
      setMessage(`Recarga aprobada. Referencia: ${result.reference}`);
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo completar la recarga.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="recharge-card" aria-labelledby="recharge-title">
      <header>
        <p className="eyebrow">PASARELA SIMULADA</p>
        <h2 id="recharge-title">Carga saldo con SnailPay</h2>
        <p>
          Utiliza únicamente las tarjetas ficticias disponibles. No se realizan
          cobros reales.
        </p>
      </header>

      <form onSubmit={handleSubmit} aria-busy={loading}>
        <fieldset disabled={loading} className="recharge-fields">
          <legend className="recharge-legend">Datos de la recarga</legend>

          <div className="form-field">
            <label htmlFor="holder">Nombre del titular</label>
            <input
              id="holder"
              name="holder"
              type="text"
              defaultValue={user.fullName}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="card">Tarjeta ficticia</label>
            <select id="card" name="card" defaultValue="1234123412341234">
              <option value="1234123412341234">
                1234 1234 1234 1234 — Aprobación
              </option>
              <option value="4000000000000002">
                4000 0000 0000 0002 — Rechazo
              </option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="expiration">Vencimiento de prueba</label>
            <input id="expiration" value="12/26" readOnly />
          </div>

          <div className="form-field">
            <label htmlFor="cvv">CVV ficticio</label>
            <input id="cvv" value="543" readOnly />
          </div>

          <div className="form-field">
            <label htmlFor="amount">Monto en MXN</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              placeholder="Ejemplo: 150.00"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="simulation">Escenario del servicio</label>
            <select id="simulation" name="simulation" defaultValue="normal">
              <option value="normal">Funcionamiento normal</option>
              <option value="system_error">Simular error del sistema</option>
              <option value="timeout">Simular tiempo de espera agotado</option>
            </select>
          </div>
        </fieldset>

        <p className="recharge-note">
          Máximo $100,000 por operación. El saldo solo aumenta cuando se recibe
          una aprobación válida.
        </p>

        <button type="submit" className="recharge-button" disabled={loading}>
          {loading ? "Procesando recarga…" : "Cargar saldo ficticio"}
        </button>

        {message && (
          <p
            className={`payment-message ${success ? "payment-success" : "payment-error"}`}
            role={success ? "status" : "alert"}
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
