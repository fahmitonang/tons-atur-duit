import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, username, email, password } = await req.json();

    if (!username || !username.trim()) {
      return NextResponse.json({ message: "Username wajib diisi" }, { status: 400 });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Validasi format username (3-30 karakter, alfanumerik, titik, strip, underscore)
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(normalizedUsername)) {
      return NextResponse.json(
        { message: "Username harus 3-30 karakter dan hanya boleh berisi huruf, angka, titik, strip, atau garis bawah" },
        { status: 400 }
      );
    }

    // Cek ketersediaan username
    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUsername) {
      return NextResponse.json({ message: "Username sudah digunakan, silakan pilih username lain" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ message: "Password wajib diisi" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password minimal 8 karakter" }, { status: 400 });
    }

    // Email opsional, namun jika diisi harus unik
    let normalizedEmail: string | undefined = undefined;
    if (email && typeof email === "string" && email.trim()) {
      normalizedEmail = email.trim().toLowerCase();
      const existingEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingEmail) {
        return NextResponse.json({ message: "Email sudah terdaftar" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user bersamaan dengan dompet default (Tunai) dan kategori standar
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        name: name && name.trim() ? name.trim() : normalizedUsername,
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
      { message: "Akun berhasil dibuat", user: { id: user.id, username: user.username, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
