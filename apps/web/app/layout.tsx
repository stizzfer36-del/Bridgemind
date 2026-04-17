export const metadata = {
  title: "Forge",
  description: "Open-core AI orchestrator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
