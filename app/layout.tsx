// This layout is not used - all routes go through [locale]/layout.tsx
// This file is kept for compatibility with Next.js App Router

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
