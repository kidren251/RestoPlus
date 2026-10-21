import { defineConfig } from "vitest/config";

// `yarn test` : tests en mémoire uniquement. Les tests d'intégration Supabase
// (tests/supabase/) écrivent dans la base de dev : ils se lancent à part,
// avec `yarn test:supabase` (vitest.supabase.config.ts).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/supabase/**", "node_modules/**"],
  },
});
