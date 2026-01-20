
/**
 * Global type definitions for the environment.
 * We manually define ImportMeta and Process interfaces to avoid dependency on 
 * missing type files and to prevent redeclaration conflicts with existing Node.js types.
 */

interface ProcessEnv {
  API_KEY: string;
  [key: string]: string | undefined;
}

interface Process {
  env: ProcessEnv;
}

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
