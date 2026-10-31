import type { ReactNode } from "react";

export const metadata = { title: "MarginLog API" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
