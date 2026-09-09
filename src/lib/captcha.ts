import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "atur-duit-default-captcha-secret-key-2026";
const EXPIRATION_MS = 5 * 60 * 1000; // 5 menit

interface CaptchaChallenge {
  question: string;
  token: string;
}

interface CaptchaPayload {
  answer: number;
  expiresAt: number;
}

/**
 * Menghasilkan soal matematika sederhana dan token yang ditandatangani HMAC
 */
export function generateCaptcha(): CaptchaChallenge {
  const isAddition = Math.random() > 0.4; // 60% penjumlahan, 40% pengurangan
  let num1: number;
  let num2: number;
  let answer: number;
  let question: string;

  if (isAddition) {
    num1 = Math.floor(Math.random() * 20) + 1; // 1 - 20
    num2 = Math.floor(Math.random() * 20) + 1; // 1 - 20
    answer = num1 + num2;
    question = `Berapa ${num1} + ${num2}?`;
  } else {
    num1 = Math.floor(Math.random() * 25) + 5; // 5 - 29
    num2 = Math.floor(Math.random() * num1) + 1; // 1 - num1 (agar hasil selalu positif)
    answer = num1 - num2;
    question = `Berapa ${num1} - ${num2}?`;
  }

  const payload: CaptchaPayload = {
    answer,
    expiresAt: Date.now() + EXPIRATION_MS,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64url");

  const token = `${payloadB64}.${signature}`;

  return { question, token };
}

/**
 * Memverifikasi jawaban captcha dengan token HMAC
 */
export function verifyCaptcha(
  userAnswer: string | number | undefined,
  token: string | undefined
): { valid: boolean; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token verifikasi keamanan tidak ditemukan" };
  }

  if (userAnswer === undefined || userAnswer === null || String(userAnswer).trim() === "") {
    return { valid: false, error: "Jawaban verifikasi keamanan belum diisi" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Token verifikasi keamanan tidak valid" };
  }

  const [payloadB64, signature] = parts;

  // Verifikasi keaslian signature HMAC
  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, error: "Token verifikasi keamanan telah dimanipulasi" };
  }

  // Parse payload
  let payload: CaptchaPayload;
  try {
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    payload = JSON.parse(payloadStr);
  } catch {
    return { valid: false, error: "Format token keamanan rusak" };
  }

  // Cek waktu kedaluwarsa (5 menit)
  if (Date.now() > payload.expiresAt) {
    return { valid: false, error: "Sesi verifikasi keamanan telah kedaluwarsa, silakan muat ulang soal" };
  }

  // Cek jawaban matematika
  const parsedAnswer = parseInt(String(userAnswer).trim(), 10);
  if (isNaN(parsedAnswer) || parsedAnswer !== payload.answer) {
    return { valid: false, error: "Jawaban hitungan keamanan salah, silakan coba lagi" };
  }

  return { valid: true };
}
