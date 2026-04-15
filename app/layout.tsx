import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "focus.camp — Community platform with challenges + AI",
  description:
    "Platform cộng đồng: học, làm thử thách, mua power-ups, cùng AI Agent đồng hành.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${roboto.variable} h-full antialiased`}>
      <body>{children}</body>
    </html>
  );
}
