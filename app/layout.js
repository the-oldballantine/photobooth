export const metadata = {
  title: "The Long-Distance Photobooth",
  description: "Two skies, one shutter — a synced photobooth for two.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
