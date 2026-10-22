import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

// Batas waktu sesi:
// - IDLE_TIMEOUT_MS: 6 jam tanpa aktivitas -> sesi berakhir
// - ABSOLUTE_TIMEOUT_MS: Maksimal 24 jam sejak login awal -> wajib login ulang (mencegah sesi abadi berminggu-minggu)
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 jam
export const SESSION_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 jam
export const SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 jam

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "username" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const input = (credentials?.username || (credentials as any)?.email)?.trim()?.toLowerCase();

        if (!input || !credentials?.password) {
          throw new Error("Username dan password wajib diisi");
        }

        // Cari berdasarkan username atau email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: input },
              { email: input }
            ]
          }
        });

        if (!user || !user.password) {
          throw new Error("Username atau password tidak valid");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Username atau password tidak valid");
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 15 * 60, // Perbarui aktivitas token tiap 15 menit
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();

      // Saat pertama kali login
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.loginAt = now;
        token.lastActivity = now;
        token.expired = false;
        return token;
      }

      const loginAt = Number(token.loginAt || 0);
      const lastActivity = Number(token.lastActivity || 0);

      // Invalidate token lama (yang belum memiliki loginAt) atau yang sudah melewati batas idle / batas absolut
      if (
        !loginAt ||
        !lastActivity ||
        now - loginAt > SESSION_ABSOLUTE_TIMEOUT_MS ||
        now - lastActivity > SESSION_IDLE_TIMEOUT_MS
      ) {
        return {
          ...token,
          id: "",
          expired: true,
        };
      }

      token.lastActivity = now;
      return token;
    },
    async session({ session, token }) {
      if (token.expired || !token.id) {
        session.user = { id: "", name: null, email: null, image: null };
        (session as any).expired = true;
        return session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {}
      return baseUrl;
    }
  },
  pages: {
    signIn: "/login",
  },
};
