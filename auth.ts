import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeEmail, magicLinkEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Safe here: both providers (Google + magic-link) verify email ownership,
      // so same verified email = same person. Merges Google login into an
      // existing magic-link account (and vice versa) instead of erroring.
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
      // Magic-link signups arrive without a name (unlike Google). Default the
      // name to the email local-part (before "@") so they aren't shown as
      // "Ẩn danh". Only fills when empty — Google users keep their real name.
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
        await sendEmail({
          to: user.email,
          ...welcomeEmail({ name }),
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
