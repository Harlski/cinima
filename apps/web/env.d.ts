/// <reference types="vite/client" />
/// <reference types="@nimiq/mini-app-sdk" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_TREASURY_ADDRESS?: string;
  readonly VITE_ALLOW_DEV_BYPASS?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_SITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
