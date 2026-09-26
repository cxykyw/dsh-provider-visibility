/**
 * Browser client bundle for DSH web plugins — mirrors the harness
 * `tsdown.client.ts` preset for standalone (out-of-repo) plugins, same as
 * dsh-opencode-go-stats.
 *
 * DSH's web client-module loader expects the plugin client bundle to call
 * `window.__ModuleLoader__.load({ id, factory })` with a CJS closure, and to
 * resolve shared platform modules through the injected `require` (the loader
 * module table) — NOT through bundler inlining.
 */
import { defineConfig } from 'tsdown'

/** Shared browser platform modules (must match the shell's frozen module table). */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

/** Documented runtime store exemption (see harness tsdown.client.ts). */
const RUNTIME_STORE_EXEMPTION = '@deepseek-ai/dsh-client-runtime/client'

const CLIENT_EXTERNALS = [...PLATFORM_MODULES, RUNTIME_STORE_EXEMPTION]

export default defineConfig({
  name: 'dsh-provider-visibility/client',
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  clean: false,
  sourcemap: true,
  external: CLIENT_EXTERNALS,
  noExternal: (id) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-provider-visibility", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
