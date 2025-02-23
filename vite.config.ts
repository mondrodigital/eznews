import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      fs: {
        allow: ['.']
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        }
      },
      // Ensure Vercel can handle the build
      target: 'esnext',
      minify: 'esbuild'
    },
    // Ensure environment variables are properly replaced
    define: {
      'process.env': Object.keys(env).reduce((acc, key) => {
        acc[key] = JSON.stringify(env[key]);
        return acc;
      }, {} as Record<string, string>)
    }
  };
});
