import "./globals.css";

export const metadata = {
  title: "Lorry Fuel Tracker — Tek Wee Hardware & Logistic Sdn Bhd",
  description: "Fleet fuel log with per-card monthly subsidy tracking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
