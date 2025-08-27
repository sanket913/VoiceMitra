import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VoiceMitra - AI-Powered Multilingual Learning',
  description: 'Learn in your native language with AI-powered tutoring, instant explanations, and personalized quizzes',
  icons: {
    icon: '/brow.png', // put your favicon.png in public folder
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
