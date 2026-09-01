import 'fake-indexeddb/auto';
import * as vue from 'vue';

// 1. Assign Vue core APIs to globalThis FIRST so module evaluation can use them
Object.assign(globalThis, vue);

(globalThis as any).useRuntimeConfig = () => ({
  public: {
    apiBaseUrl: '',
  },
});

// 2. Dynamically import and assign project composables to globalThis in dependency order
Object.assign(globalThis, await import('../app/composables/useToast'));
Object.assign(globalThis, await import('../app/composables/useTheme'));
Object.assign(globalThis, await import('../app/composables/useConfirm'));
Object.assign(globalThis, await import('../app/composables/useDragAndDrop'));
Object.assign(globalThis, await import('../app/composables/useWorkspaceLayout'));
Object.assign(globalThis, await import('../app/composables/useStorageQuota'));
Object.assign(globalThis, await import('../app/composables/useAuth'));
Object.assign(globalThis, await import('../app/composables/useSync'));
Object.assign(globalThis, await import('../app/composables/useFolders'));
Object.assign(globalThis, await import('../app/composables/useNoteFilter'));
Object.assign(globalThis, await import('../app/composables/useAutoSave'));
Object.assign(globalThis, await import('../app/composables/useNotes'));

// Global test setup for Nuxt environment
(globalThis as any).defineNuxtConfig = (fnOrConfig: any) => typeof fnOrConfig === 'function' ? fnOrConfig() : fnOrConfig;
(globalThis as any).defineEventHandler = (fn: any) => fn;


(globalThis as any).getRouterParam = (event: any, name: string) => {
  return event.context?.params?.[name];
};

(globalThis as any).readBody = async (event: any) => {
  return event._body ?? event.node?.req?.body;
};

(globalThis as any).setResponseStatus = (event: any, code: number) => {
  if (event.node?.res) {
    event.node.res.statusCode = code;
  }
};

(globalThis as any).createError = (input: { statusCode?: number; statusMessage?: string }) => {
  const err = new Error(input.statusMessage || 'H3 Error') as any;
  err.statusCode = input.statusCode || 500;
  err.statusMessage = input.statusMessage;
  return err;
};
(globalThis as any).getQuery = (event: any) => {
  if (event?.query) return event.query;
  if (event?.node?.req?.url) {
    const url = new URL(event.node.req.url, 'http://localhost');
    return Object.fromEntries(url.searchParams.entries());
  }
  return {};
};

(globalThis as any).setHeader = (event: any, name: string, value: any) => {
  if (event?.node?.res?.setHeader) {
    event.node.res.setHeader(name, value);
  } else if (event?.node?.res) {
    if (!event.node.res.headers) event.node.res.headers = {};
    event.node.res.headers[name.toLowerCase()] = value;
  }
};

(globalThis as any).setResponseHeader = (globalThis as any).setHeader;

(globalThis as any).getResponseHeader = (event: any, name: string) => {
  if (event?.node?.res?.getHeader) {
    return event.node.res.getHeader(name);
  }
  return event?.node?.res?.headers?.[name.toLowerCase()];
};
