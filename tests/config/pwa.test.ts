import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Provide global defineNuxtConfig if not defined in test environment
if (typeof (globalThis as any).defineNuxtConfig === 'undefined') {
  (globalThis as any).defineNuxtConfig = (config: any) => config;
}

import nuxtConfig from '../../nuxt.config';

describe('PWA Configuration and Assets', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const publicDir = path.resolve(rootDir, 'public');

  describe('Icon assets in public directory', () => {
    const requiredIcons = [
      'pwa-192x192.png',
      'pwa-512x512.png',
      'apple-touch-icon-180x180.png',
      'pwa-64x64.png',
    ];

    for (const icon of requiredIcons) {
      it(`should have ${icon} present and non-empty`, () => {
        const filePath = path.join(publicDir, icon);
        expect(fs.existsSync(filePath)).toBe(true);
        const stats = fs.statSync(filePath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      });
    }
  });

  describe('Nuxt PWA configuration', () => {
    it('should include @vite-pwa/nuxt in modules', () => {
      expect(nuxtConfig.modules).toContain('@vite-pwa/nuxt');
    });

    it('should configure PWA with correct options', () => {
      const pwa = nuxtConfig.pwa;
      expect(pwa).toBeDefined();
      expect(pwa.registerType).toBe('autoUpdate');
      expect(pwa.client).toEqual({ installPrompt: true });
      expect(pwa.devOptions).toEqual({ enabled: false });
      expect(pwa.workbox).toEqual({
        navigateFallback: '/',
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
      });
    });

    it('should configure PWA manifest correctly', () => {
      const manifest = nuxtConfig.pwa?.manifest;
      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('Markdown Note App');
      expect(manifest.short_name).toBe('Markdown Notes');
      expect(manifest.description).toBe(
        'Modern offline-first markdown note editor with live preview and flowchart diagrams'
      );
      expect(manifest.theme_color).toBe('#181616');
      expect(manifest.background_color).toBe('#181616');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('any');
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');

      expect(manifest.icons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          }),
          expect.objectContaining({
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          }),
          expect.objectContaining({
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          }),
        ])
      );
    });

    it('should configure meta and link tags for PWA in app.head', () => {
      const head = nuxtConfig.app?.head;
      expect(head).toBeDefined();

      const meta = head.meta || [];
      expect(meta).toEqual(
        expect.arrayContaining([
          { name: 'theme-color', content: '#181616' },
          { name: 'mobile-web-app-capable', content: 'yes' },
          { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
          { name: 'apple-mobile-web-app-title', content: 'Markdown Notes' },
        ])
      );

      const link = head.link || [];
      expect(link).toEqual(
        expect.arrayContaining([
          { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
        ])
      );
    });
  });
});
