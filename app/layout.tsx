import './globals.css';
import React from 'react';
export const metadata = { title: 'SIBI', description: 'Should I Buy It' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}>
          <b>SIBI</b><span>v0.3.5</span>
        </header>
        <main style={{padding:16, maxWidth:1000, margin:'0 auto'}}>{children}</main>
      </body>
    </html>
  );
}
