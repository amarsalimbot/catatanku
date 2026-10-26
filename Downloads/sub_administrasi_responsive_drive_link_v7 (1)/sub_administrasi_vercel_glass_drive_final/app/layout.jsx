import './globals.css';
import BackgroundRuntime from '@/components/BackgroundRuntime';

export const metadata = {
  title: 'Drive Tanah Bumbu',
  description: 'Manajemen file Google Drive SUB ADMINISTRASI PEMBANGUNAN dengan spatial UI modern.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body><BackgroundRuntime />{children}</body>
    </html>
  );
}
