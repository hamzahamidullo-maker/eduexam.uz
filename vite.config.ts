
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We set the third parameter to '' to load all envs regardless of the `VITE_` prefix
  // so we can fallback to standard API_KEY if VITE_GEMINI_API_KEY isn't found.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // We shim process.env.API_KEY globally. This satisfies the SDK's hard requirement
      // for the `process.env.API_KEY` syntax while actually using your Vite env vars.
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY),
    },
    server: {
      port: 3000,
    },
  };
});
