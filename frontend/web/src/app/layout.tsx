import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Yuding — Réservation de Voyages, Hébergements, Vols & Activités',
  description: 'Votre plateforme de voyage complète : réservez vos hôtels, maisons de vacances, billets d’avion, taxis et activités au meilleur prix.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
