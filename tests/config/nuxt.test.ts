import { describe, it, expect } from 'vitest';
import nuxtConfig from '../../nuxt.config';

describe('Nuxt Configuration (nuxt.config.ts)', () => {
  it('should have ssr set to false', () => {
    expect(nuxtConfig.ssr).toBe(false);
  });

  it('should have strict typescript enabled', () => {
    expect(nuxtConfig.typescript?.strict).toBe(true);
  });

  it('should configure runtimeConfig.public.apiBaseUrl with default empty string', () => {
    expect(nuxtConfig.runtimeConfig).toBeDefined();
    expect(nuxtConfig.runtimeConfig?.public).toBeDefined();
    expect(nuxtConfig.runtimeConfig?.public?.apiBaseUrl).toBe(process.env.NUXT_PUBLIC_API_BASE_URL || '');
  });

  it('should configure nitro.devProxy for /api backend proxying', () => {
    expect(nuxtConfig.nitro).toBeDefined();
    expect(nuxtConfig.nitro?.devProxy).toBeDefined();
    expect(nuxtConfig.nitro?.devProxy?.['/api']).toEqual({
      target: process.env.BACKEND_PROXY_URL || 'http://localhost:8080',
      changeOrigin: true,
      credentials: true,
    });
  });
});
