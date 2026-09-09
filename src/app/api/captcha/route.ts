import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const allowRegistration = process.env.ALLOW_REGISTRATION !== "false";

  if (!allowRegistration) {
    return NextResponse.json(
      {
        registrationAllowed: false,
        message: "Pendaftaran akun baru saat ini dinonaktifkan.",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  const { question, token } = generateCaptcha();

  return NextResponse.json(
    {
      registrationAllowed: true,
      question,
      token,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
