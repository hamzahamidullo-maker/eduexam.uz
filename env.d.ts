interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Augment the global Process and ProcessEnv interfaces to include API_KEY.
 * This resolves the "Subsequent variable declarations must have the same type" error
 * by ensuring that the 'process' variable (which is already declared as type 'Process'
 * in the environment) has the correct properties available.
 */
interface ProcessEnv {
  API_KEY: string;
  [key: string]: string | undefined;
}

interface Process {
  env: ProcessEnv;
}
