// Chargé avant les fichiers de test (setupFiles) : src/supabase.ts lit les variables
// d'environnement à son import, il faut donc que .env soit chargé avant.
process.loadEnvFile(".env");
