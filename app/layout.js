import { Kalam, Inter } from "next/font/google";
import "./globals.css";

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-chalk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Family Pick'em Pool",
  description: "Weekly NFL pick'em pool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${kalam.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
