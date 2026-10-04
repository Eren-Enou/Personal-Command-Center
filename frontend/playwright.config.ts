import { defineConfig } from "@playwright/test";
import { platform } from "node:os";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        platform() === "win32"
          ? "..\\backend\\.venv\\Scripts\\python.exe ..\\scripts\\e2e_backend.py"
          : "../backend/.venv/bin/python ../scripts/e2e_backend.py",
      url: "http://127.0.0.1:8010/api/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --strictPort",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
    },
  ],
});
