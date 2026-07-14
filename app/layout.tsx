import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "IVORY ENERGIES CI — ERP Stations",
  description: "Progiciel de suivi d'activité des stations-service",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${jakarta.className} h-full bg-slate-50`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
