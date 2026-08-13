import { MetadataRoute } from 'next';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sahakari App",
    short_name: "Sahakari App",
    description: APP_DESCRIPTION,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#020617', // dark slate color to match the app theme
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
