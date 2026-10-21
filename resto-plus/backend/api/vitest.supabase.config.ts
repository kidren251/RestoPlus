import { defineConfig } from "vitest/config";

// Tests d'intégration sur la base Supabase de dev (lit backend/api/.env).
// Un seul fichier à la fois : ils partagent les mêmes données de démo.
export default defineConfig({
  test: {
    include: ["tests/supabase/**/*.test.ts"],
    setupFiles: ["tests/supabase/env.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
