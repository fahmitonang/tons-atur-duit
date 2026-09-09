import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

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
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
};
