/**
 * Required environment variables that must be present for the server to start.
 * Missing any of these will cause the server to fail immediately with a clear error message.
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'GEMINI_API_KEY',
  'GOOGLE_MAPS_API_KEY',
] as const;

/**
 * Optional environment variables that will log warnings if missing but won't stop the server.
 */
const OPTIONAL_ENV_VARS = [
  'VITE_APP_ID',
  'OAUTH_SERVER_URL',
  'OWNER_OPEN_ID',
  'OWNER_NAME',
  'BUILT_IN_FORGE_API_URL',
  'BUILT_IN_FORGE_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

/**
 * Validate required environment variables on startup.
 * Throws an error if any required variables are missing.
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];
  const warningVars: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Check optional variables (warnings only)
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      warningVars.push(varName);
    }
  }

  // Hard fail if required variables are missing
  if (missingVars.length > 0) {
    const errorMessage = [
      '❌ FATAL: Missing required environment variables!',
      '',
      'The following environment variables are required but not set:',
      ...missingVars.map(v => `  - ${v}`),
      '',
      'Please add these to your .env file and restart the server.',
      'See .env.example for reference.',
    ].join('\n');
    
    console.error('\n' + errorMessage + '\n');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Warn about optional variables
  if (warningVars.length > 0) {
    console.warn('\n⚠️  Warning: Optional environment variables not set:');
    warningVars.forEach(v => console.warn(`  - ${v}`));
    console.warn('Some features may not work correctly.\n');
  }

  // Success message
  console.log('✅ Environment validation passed - all required variables present\n');
}

// Run validation immediately on module load
validateEnvironment();

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.SUPABASE_JWT_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerName: process.env.OWNER_NAME ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // AI & Google APIs
  geminiApiKey: process.env.GEMINI_API_KEY!,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY!,
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
