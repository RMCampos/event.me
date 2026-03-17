import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma.server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event.me - Simple Scheduling",
  description: "Schedule meetings with ease",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;

  let theme: "light" | "dark" | "system" =
    themeCookie === "dark"
      ? "dark"
      : themeCookie === "light"
        ? "light"
        : "system";

  // If no theme cookie yet (e.g. first load after login), fetch from DB once
  if (theme === "system") {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { theme: true },
      });
      if (user?.theme === "dark" || user?.theme === "light") {
        theme = user.theme;
      }
    }
  }

  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : ""}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {theme === "system" ? (
          <Script id="theme-system-fallback" strategy="beforeInteractive">
            {`(function(){
  var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark);
})();`}
          </Script>
        ) : null}
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
