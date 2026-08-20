import 'fake-indexeddb/auto';

// Global test setup for Nuxt environment
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
