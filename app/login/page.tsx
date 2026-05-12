import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function safeRedirect(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return "/";
  // Only allow relative URLs starting with single "/"
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo: redirectParam } = await searchParams;
  const redirectTo = safeRedirect(redirectParam);

  const session = await auth();
  if (session?.user) redirect(redirectTo);

  async function handleGoogleSignIn(formData: FormData) {
    "use server";
    const target = safeRedirect(formData.get("redirectTo") as string | undefined);
    await signIn("google", { redirectTo: target });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        background: "var(--bg-body)",
      }}
    >
      <div
        style={{
          width: "min(100%, 420px)",
          borderRadius: "var(--r-lg)",
          padding: "var(--space-8)",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(60, 45, 20, 0.08)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginBottom: "var(--space-4)",
            fontSize: "var(--text-3xl)",
            lineHeight: 1,
            textDecoration: "none",
          }}
        >
          🔥🏕️
        </Link>
        <h1
          style={{
            margin: "0 0 var(--space-2)",
            color: "var(--text-heading)",
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-2xl)",
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          Đăng nhập focus.camp
        </h1>
        <p
          style={{
            margin: "0 0 var(--space-8)",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.5,
          }}
        >
          Dùng tài khoản Google để đăng ký hoặc đăng nhập trong 1 click.
        </p>

        <form action={handleGoogleSignIn}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            style={{
              width: "100%",
              minHeight: 44,
              padding: "0 var(--space-6)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-elevated)",
              color: "var(--text-heading)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-md)",
              fontWeight: 700,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
            Tiếp tục với Google
          </button>
        </form>

        <p
          style={{
            margin: "var(--space-6) 0 0",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
            lineHeight: 1.45,
            textAlign: "center",
          }}
        >
          Bằng cách đăng nhập, bạn đồng ý với Điều khoản & Chính sách của focus.camp.
        </p>
      </div>
    </main>
  );
}
