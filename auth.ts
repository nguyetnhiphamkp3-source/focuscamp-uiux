import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Fired the first time a user signs in (PrismaAdapter creates the User row).
      if (!user.email) return;
      try {
        await sendEmail({
          to: user.email,
          ...welcomeEmail({ name: user.name || "" }),
        });
      } catch (err) {
        logger.warn({ err, email: user.email }, "[auth] welcome email failed");
      }
      // Affiliate referral attribution from cookie
      try {
        const { cookies } = await import("next/headers");
        const c = await cookies();
        const ref = c.get("fc_ref")?.value;
        if (ref && user.id) {
          const { attributeReferralOnSignup } = await import(
            "@/lib/services/affiliate"
          );
          await attributeReferralOnSignup({
            referredUserId: user.id,
            refCode: ref,
          });
        }
      } catch (err) {
        logger.warn({ err }, "[auth] affiliate attribution failed");
      }
    },
  },
});
