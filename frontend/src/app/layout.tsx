import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Synapse - Synaptic Social Network",
  description: "Goal-driven, anti-scroll social network connecting people based on semantic interests and physical proximity",
  keywords: ["social network", "goals", "productivity", "matching", "AI"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bionic-bg text-bionic-text min-h-screen`}>
        <Providers>
          <div className="relative min-h-screen">
            {/* Background gradient effects */}
            <div className="fixed inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-bionic-accent/5 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-bionic-accent/3 rounded-full blur-3xl" />
            </div>

            {/* Main content */}
            <main className="relative z-10 pb-24">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
