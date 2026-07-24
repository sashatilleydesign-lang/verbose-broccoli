import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strobe.",
  description: "An ADHD-friendly freelance PM + email console.",
};

// Set data-theme before paint so there's no flash of the wrong palette.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("strobe-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
