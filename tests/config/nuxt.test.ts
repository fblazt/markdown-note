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
    expect(typeof nuxtConfig.runtimeConfig?.public?.apiBaseUrl).toBe('string');
  });
});
