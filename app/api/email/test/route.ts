import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Only the community owner can trigger
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const owner = await prisma.user.findFirst({
    where: { email: process.env.SEED_OWNER_EMAIL ?? undefined },
  });
  if (!owner || owner.email !== session.user.email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Cap at 5 sends / 5 min — defense-in-depth if owner account is compromised
  const rl = await rateLimit({
    key: `email-test:${session.user.id}`,
    limit: 5,
    windowSec: 300,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const to =
    req.nextUrl.searchParams.get("to") || session.user.email!;

  const result = await sendEmail({
    to,
    subject: "focus.camp — Email test",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#faf8f1;border-radius:12px;">
        <div style="font-size:32px;margin-bottom:8px;">🏕️🔥</div>
        <h1 style="color:#191919;margin:0 0 8px;font-size:22px;">focus.camp — Email works!</h1>
        <p style="color:#484645;line-height:1.5;">
          Nếu bạn đọc được email này, Resend đã kết nối thành công.
        </p>
        <p style="color:#6b655a;font-size:13px;margin-top:20px;">
          Sent from <a href="https://focus.camp" style="color:#1B9E75;">focus.camp</a> · ${new Date().toISOString()}
        </p>
      </div>
    `,
    text: `focus.camp — Email test\n\nResend đã kết nối. Sent at ${new Date().toISOString()}.`,
  });

  return NextResponse.json(result);
}
