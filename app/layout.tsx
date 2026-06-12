import type { Metadata } from "next";
import localFont from "next/font/local";
import { ScrollbarAutohide } from "@/components/shell/scrollbar-autohide";
import "./globals.css";

// SF Pro Display — subset + bundled in app/fonts (woff2), shipped via git so
// every environment renders identically. One family for the whole UI.
const sfPro = localFont({
  src: [
    { path: "./fonts/SFProDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SFProDisplay-Italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/SFProDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SFProDisplay-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/SFProDisplay-SemiboldItalic.woff2", weight: "600", style: "italic" },
    // Bold (700/800) deliberately maps to Semibold: default "bold" renders lighter.
    // Real Bold is reserved at weight 900 — use only when explicitly requested.
    { path: "./fonts/SFProDisplay-Semibold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/SFProDisplay-SemiboldItalic.woff2", weight: "700", style: "italic" },
    { path: "./fonts/SFProDisplay-Semibold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/SFProDisplay-Bold.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-sf",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "focus.camp — Cộng đồng challenge-first cho creator Việt",
    template: "%s | focus.camp",
  },
  description:
    "Nền tảng SaaS cho creator/coach build cộng đồng challenge-first. Học bằng challenges 21-90 ngày, đồng hành cùng AI Agent, ship sản phẩm thực.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://focus.camp"
  ),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "focus.camp",
    title: "focus.camp — Cộng đồng challenge-first cho creator Việt",
    description:
      "Build cộng đồng riêng. Bán gói. Có AI Agent đồng hành. Thanh toán VietQR.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "focus.camp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "focus.camp",
    description:
      "Cộng đồng challenge-first với AI Agent. Build, bán, ship.",
    images: ["/og-default.png"],
  },
  // Icons auto-discovered from app/favicon.ico, app/icon.png, app/apple-icon.png.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${sfPro.variable} h-full antialiased`}>
      <body>
        <ScrollbarAutohide />
        {children}
      </body>
    </html>
  );
}
