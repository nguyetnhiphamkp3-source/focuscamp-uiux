import type { Metadata } from "next";
import { Roboto, Playfair_Display } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-roboto",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
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
    <html lang="vi" className={`${roboto.variable} ${playfair.variable} h-full antialiased`}>
      <body>{children}</body>
    </html>
  );
}
