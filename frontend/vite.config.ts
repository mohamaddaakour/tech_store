import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,

    /**
     * Fail loudly if 5173 is already taken, instead of quietly starting on 5174.
     *
     * This is not a style preference — the silent fallback causes a genuinely
     * baffling bug. The backend's CORS allowlist (`app.cors.allowed-origins` in
     * application.yml) permits exactly `http://localhost:5173`. Start the dev server
     * on any other port and every API call is blocked by the browser before it is
     * sent. Axios cannot distinguish a CORS block from an unreachable host — both
     * arrive with no `response` object — so the UI reports "Cannot reach the server.
     * Is the backend running?" while the backend is running perfectly and answering
     * curl just fine.
     *
     * With `strictPort`, a stale dev server in another terminal produces an immediate,
     * obvious "Port 5173 is already in use" instead of a phantom backend outage.
     *
     * If you genuinely need a different port, add that origin to
     * `app.cors.allowed-origins` on the backend as well — the two must agree.
     */
    strictPort: true,
  },
})
