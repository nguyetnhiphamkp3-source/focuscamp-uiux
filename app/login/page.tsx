import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  async function handleGoogleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-body)" }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(60, 45, 20, 0.08)",
        }}
      >
        <Link href="/" className="text-3xl inline-block mb-4">
          🏕️🔥
        </Link>
        <h1
          className="text-2xl font-extrabold mb-2"
          style={{ color: "var(--text-heading)" }}
        >
          Đăng nhập focus.camp
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Dùng tài khoản Google để đăng ký hoặc đăng nhập trong 1 click.
        </p>

        <form action={handleGoogleSignIn}>
          <button
            type="submit"
            className="w-full px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-3"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-heading)",
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-roboto)",
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
          className="text-xs mt-6 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Bằng cách đăng nhập, bạn đồng ý với Điều khoản & Chính sách của focus.camp.
        </p>
      </div>
    </main>
  );
}
