import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MedSim — Consultation Virtuelle",
  description:
    "Simulateur de consultation médicale virtuelle avec RAG pour l'entraînement au diagnostic clinique.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`dark ${inter.variable} ${outfit.variable}`}>
      <body className="h-dvh overflow-hidden" suppressHydrationWarning>
        <TooltipProvider delay={300}>
          {children}
        </TooltipProvider>
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: "#1A1F2E",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#F1F5F9",
            },
          }}
        />
      </body>
    </html>
  );
}
