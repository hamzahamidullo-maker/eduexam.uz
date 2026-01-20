interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Fix: Changed 'declare namespace process' to 'declare var process' to resolve the "Duplicate identifier 'process'" error.
// This allows the declaration to merge with existing global 'process' variables instead of conflicting with them.
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  };
};
