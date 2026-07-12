import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";
import * as crypto from "crypto";

/** Extract the email domain, e.g. "srmist.edu.in" from "netid@srmist.edu.in". */
export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] || "";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
        grant: { label: "OTP grant", type: "password" },
      },
      async authorize(credentials) {
        const raw = (credentials?.identifier || "").trim().toLowerCase();
        const password = credentials?.password ?? "";
        const grant = credentials?.grant ?? "";
        if (!raw) return null;

        // Accept EITHER an email OR a @username.
        const isEmail = raw.includes("@");
        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: raw } })
          : await prisma.user.findFirst({
              where: { username: raw.replace(/^@/, "") },
            });
        if (!user || !user.passwordHash) return null;
        // Reject password sign-in for accounts whose inbox was never verified.
        // (OTP/passwordless login via /api/login-otp already enforces this.)
        if (!user.emailVerified) return null;

        // Campus is fixed at signup; ensure the account still maps to a known campus.
        const campus = await prisma.campus.findUnique({ where: { id: user.campusId } });
        if (!campus) return null;
        if (user.isBanned) return null;

        // OTP grant path (passwordless): the /api/login-otp route mints a
        // short-lived single-use grant after verifying the emailed code.
        if (grant) {
          const rec = await prisma.otpGrant.findUnique({ where: { email: user.email } });
          const secret = process.env.NEXTAUTH_SECRET || "dev";
          const hash = crypto
            .createHmac("sha256", secret)
            .update(grant)
            .digest("hex");
          if (!rec || rec.grantHash !== hash || rec.expiresAt < new Date()) return null;
          await prisma.otpGrant.delete({ where: { email: user.email } });
          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.username || null,
          };
        }

        if (!password) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
};
