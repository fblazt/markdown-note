// Global test setup for Nitro / H3 / Nuxt environment
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

