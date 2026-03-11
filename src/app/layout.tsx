import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ViralCut — AI YouTube Shorts Factory",
  description: "Turn any YouTube video into viral Shorts using AI. Analyze, clip, caption, and export 9:16 Shorts in your browser.",
  keywords: "youtube shorts, ai video editor, viral content, shorts factory, groq ai",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vc-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
