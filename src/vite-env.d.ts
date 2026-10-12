/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Optional: when unset, the Meta Pixel never loads.
  readonly VITE_META_PIXEL_ID?: string;
}

// When the site was built (ms since 1970), from vite.config.ts.
declare const __BUILD_TIME__: number;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
