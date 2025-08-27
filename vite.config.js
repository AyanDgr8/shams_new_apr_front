// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
const env = loadEnv(mode, process.cwd(), "");

return {
plugins: [react()],
server: {
port: Number(env.PORT) || 9086,
strictPort: true,
host: true, // listen on 0.0.0.0
allowedHosts: ["reports.voicemeetme.net", "localhost", "127.0.0.1"],
},
};
});