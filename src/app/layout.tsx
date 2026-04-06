import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'osu! Collection Hub',
    template: '%s · osu! Collection Hub',
  },
  description: 'Upload, browse, compare, and merge osu! stable collections with friends.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Anti-flash: apply dark class before first paint. Dark is default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(!t||t==='dark')document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen dark:bg-slate-900 dark:text-slate-100 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
