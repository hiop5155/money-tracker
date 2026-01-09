import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const targetUrl = env.VITE_API_URL ? env.VITE_API_URL.replace('/api', '') : 'http://127.0.0.1:5001';

    return {
        plugins: [react(), tailwindcss()],
        server: {
            allowedHosts: ['your-domain.com', 'www.your-domain.com'],
            host: true,
            port: 5173,
            proxy: {
                '/api': {
                    target: targetUrl,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
