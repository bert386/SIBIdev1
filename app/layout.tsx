import './globals.css';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'SIBI — Should I Buy It',
  description: 'Identify and value bulk lots using OpenAI + eBay last solds',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="brand">
            <Image src="/logo.png" alt="SIBI" width={36} height={36} />
            <span className="title">SIBI</span>
          </div>
          <div className="slogan">Should I Buy It</div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">v0.2.6</footer>
      </body>
    </html>
  );
}
