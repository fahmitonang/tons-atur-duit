import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Nama lengkap wajib diisi" }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ message: "Email wajib diisi" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ message: "Password wajib diisi" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password minimal 8 karakter" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Email sudah terdaftar" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user along with default wallet (Tunai) and standard categories
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        accounts: {
          create: [
            { name: "Tunai", type: "CASH", balance: 0 }
          ]
        },
        categories: {
          create: [
            { name: "Makanan & Minuman", type: "EXPENSE" },
            { name: "Transportasi", type: "EXPENSE" },
            { name: "Belanja Kebutuhan", type: "EXPENSE" },
            { name: "Tagihan & Utilitas", type: "EXPENSE" },
            { name: "Hiburan & Rekreasi", type: "EXPENSE" },
            { name: "Kesehatan", type: "EXPENSE" },
            { name: "Gaji Pokok", type: "INCOME" },
            { name: "Bonus & THR", type: "INCOME" },
            { name: "Investasi & Lainnya", type: "INCOME" }
          ]
        }
      },
    });

    return NextResponse.json(
      { message: "Akun berhasil dibuat", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
