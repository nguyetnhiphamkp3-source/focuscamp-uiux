import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeEmail, magicLinkEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

// When DEMO_PASSWORD is set, use JWT strategy so sessions don't need DB.
const isDemoMode = !!process.env.DEMO_PASSWORD;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: isDemoMode ? "jwt" : "database" },
  providers: [
    // Demo credentials login — only active when DEMO_PASSWORD env var is set.
    // Lets reviewers browse the UI without Google OAuth or a live database.
    ...(isDemoMode
      ? [
          Credentials({
            name: "Demo",
            credentials: {
              password: { label: "Mật khẩu demo", type: "password" },
            },
            async authorize(credentials) {
              if (credentials?.password === process.env.DEMO_PASSWORD) {
                return {
                  id: "demo-admin",
                  name: "Admin (Demo)",
                  email: process.env.DEMO_ADMIN_EMAIL || "admin@focus.camp",
                  image: null,
                };
              }
              return null;
            },
          }),
        ]
      : []),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
      profile(profile) {
        const cleanName = (profile.name ?? "").replace(/\s*\([^)]*\)/g, "").trim();
        return {
          id: profile.sub,
          name: cleanName || (profile.name ?? null),
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM || "focus.camp <noreply@focus.camp>",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        try {
          await sendEmail({ to: email, ...magicLinkEmail({ url, email }) });
        } catch (err) {
          logger.error({ err, email }, "[auth] magic link email failed");
          throw new Error("magic_link_email_failed");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // JWT mode: id from token; database mode: id from user
        session.user.id = (isDemoMode ? token?.id : user?.id) as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      let name = (user.name ?? "").trim();
      if (!name) {
        name = user.email.split("@")[0];
        try {
          await prisma.user.update({ where: { id: user.id }, data: { name } });
        } catch (err) {
          logger.warn({ err, userId: user.id }, "[auth] default name from email failed");
        }
      }
      try {
        await sendEmail({ to: user.email, ...welcomeEmail({ name }) });
      } catch (err) {
        logger.warn({ err, email: user.email }, "[auth] welcome email failed");
      }
      try {
        const { cookies } = await import("next/headers");
        const c = await cookies();
        const ref = c.get("fc_ref")?.value;
        if (ref && user.id) {
          const { attributeReferralOnSignup } = await import("@/lib/services/affiliate");
          await attributeReferralOnSignup({ referredUserId: user.id, refCode: ref });
        }
      } catch (err) {
        logger.warn({ err }, "[auth] affiliate attribution failed");
      }
    },
  },
});
