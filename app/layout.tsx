export const metadata = { title: "SIBI", description: "Should I Buy It" };
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="min-h-screen">
      <div className="max-w-4xl mx-auto p-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">SIBI <span className="text-xs opacity-60">v0.3.6</span></h1>
        </header>
        {children}
      </div>
    </body></html>
  );
}
