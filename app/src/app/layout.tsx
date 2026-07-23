import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strobe.",
  description: "An ADHD-friendly freelance PM + email console.",
};

// Set data-mode before paint so there's no flash of the wrong palette.
const modeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("strobe-mode");
    var mode = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "calm" : "acid");
    document.documentElement.setAttribute("data-mode", mode);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
