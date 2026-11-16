import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NOVA SYNC — Better Together",
    template: "%s · NOVA SYNC",
  },
  description:
    "One workspace for your team, tasks, meetings and deadlines. NOVA SYNC is the collaboration platform for student group projects at NOVA University Lisbon.",
  applicationName: "NOVA SYNC",
};

export const viewport: Viewport = {
  themeColor: "#101828",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans">
        <WorkspaceProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
