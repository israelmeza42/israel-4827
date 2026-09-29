import type { PaymentResponse } from "./payments";
export type User = {
  id: string;
  fullName: string;
  email: string;
  salt: string;
  passwordHash: string;
  balance: number;
  payments?: PaymentResponse[];
};

const USER_KEY = "snail-user";
const SESSION_KEY = "snail-session";

// Convierte bytes en texto para poder guardarlos.
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// Deriva un hash de la contraseña con una sal aleatoria.
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 600000,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return toHex(new Uint8Array(bits));
}

export function getUser(): User | null {
  const saved = localStorage.getItem(USER_KEY);

  if (!saved) return null;

  try {
    const user = JSON.parse(saved) as User;

    if (
      typeof user.id !== "string" ||
      typeof user.fullName !== "string" ||
      typeof user.email !== "string" ||
      typeof user.salt !== "string" ||
      typeof user.passwordHash !== "string" ||
      typeof user.balance !== "number" ||
      !Number.isFinite(user.balance) ||
      user.balance < 0
    ) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function getSessionUser(): User | null {
  const user = getUser();
  const session = localStorage.getItem(SESSION_KEY);

  return user && session === user.id ? user : null;
}

export async function register(
  fullName: string,
  email: string,
  password: string,
  confirmation: string,
): Promise<User> {
  const cleanName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName) {
    throw new Error("Escribe tu nombre completo.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Escribe un correo electrónico válido.");
  }

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  if (password !== confirmation) {
    throw new Error("Las contraseñas no coinciden.");
  }

  if (getUser()) {
    throw new Error("Ya existe una cuenta en este navegador. Inicia sesión.");
  }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);

  const user: User = {
    id: crypto.randomUUID(),
    fullName: cleanName,
    email: cleanEmail,
    salt,
    passwordHash,
    balance: 0,
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, user.id);

  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const user = getUser();

  if (!user || user.email !== email.trim().toLowerCase()) {
    throw new Error("Correo o contraseña incorrectos.");
  }

  const passwordHash = await hashPassword(password, user.salt);

  if (passwordHash !== user.passwordHash) {
    throw new Error("Correo o contraseña incorrectos.");
  }

  localStorage.setItem(SESSION_KEY, user.id);

  return user;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
export function applyPayment(payment: PaymentResponse): User {
  const user = getSessionUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para cargar saldo.");
  }

  const amount = payment.transaction_amount;

  if (
    payment.status !== "approved" ||
    !payment.id ||
    !payment.authorization_code ||
    payment.payer_id !== user.id ||
    payment.payer_email !== user.email ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) >= 0.000001 ||
    payment.card_number !== "1234123412341234" ||
    payment.cvv !== "543"
  ) {
    throw new Error("La recarga no tiene una aprobación válida.");
  }

  const payments = user.payments ?? [];

  // Una misma operación nunca se acredita dos veces.
  if (payments.some((item) => item.id === payment.id)) {
    return user;
  }

  const totalCents = Math.round(user.balance * 100) + Math.round(amount * 100);

  if (!Number.isSafeInteger(totalCents)) {
    throw new Error("El saldo supera el límite permitido.");
  }

  const updatedUser: User = {
    ...user,
    balance: totalCents / 100,
    payments: [...payments, payment],
  };

  // Guarda saldo y comprobante juntos, incluyendo los datos ficticios.
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

  return updatedUser;
}
