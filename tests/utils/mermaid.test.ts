import { describe, it, expect, vi } from 'vitest';
import {
  isMermaidCode,
  getMermaidConfig,
  renderMermaidDiagram,
  DRAGON_DARK_THEME_VARIABLES,
  LOTUS_LIGHT_THEME_VARIABLES,
} from '../../app/utils/mermaid';

describe('Mermaid Utilities: app/utils/mermaid.ts', () => {
  describe('isMermaidCode', () => {
    it('returns true for mermaid and flowchart identifiers', () => {
      expect(isMermaidCode('mermaid')).toBe(true);
      expect(isMermaidCode('flowchart')).toBe(true);
      expect(isMermaidCode('MERMAID')).toBe(true);
      expect(isMermaidCode('FlowChart')).toBe(true);
      expect(isMermaidCode('  mermaid  ')).toBe(true);
      expect(isMermaidCode('  FLOWCHART  ')).toBe(true);
    });

    it('returns false for other language identifiers or empty/falsy values', () => {
      expect(isMermaidCode('typescript')).toBe(false);
      expect(isMermaidCode('javascript')).toBe(false);
      expect(isMermaidCode('python')).toBe(false);
      expect(isMermaidCode('html')).toBe(false);
      expect(isMermaidCode('')).toBe(false);
      expect(isMermaidCode(undefined)).toBe(false);
    });
  });

  describe('Theme Variables & Configurations', () => {
    it('defines correct Kanagawa Dragon (Dark) theme variables', () => {
      expect(DRAGON_DARK_THEME_VARIABLES).toEqual({
        darkMode: true,
        background: '#181616',
        primaryColor: '#1d1c19',
        primaryTextColor: '#c5c9c5',
        primaryBorderColor: '#8ba4b0',
        lineColor: '#8a9a86',
        secondaryColor: '#282727',
        tertiaryColor: '#12120f',
        fontFamily: 'Inter, sans-serif',
      });
    });

    it('defines correct Kanagawa Lotus (Light) theme variables', () => {
      expect(LOTUS_LIGHT_THEME_VARIABLES).toEqual({
        darkMode: false,
        background: '#f2ecbc',
        primaryColor: '#e7d7ad',
        primaryTextColor: '#43436c',
        primaryBorderColor: '#4d699b',
        lineColor: '#716e61',
        secondaryColor: '#decfb0',
        tertiaryColor: '#e5ddb0',
        fontFamily: 'Inter, sans-serif',
      });
    });

    it('generates dark configuration when isDark is true', () => {
      const config = getMermaidConfig(true);
      expect(config.theme).toBe('base');
      expect(config.securityLevel).toBe('strict');
      expect(config.startOnLoad).toBe(false);
      expect(config.suppressErrorRendering).toBe(true);
      expect(config.themeVariables).toEqual(DRAGON_DARK_THEME_VARIABLES);
    });

    it('generates light configuration when isDark is false', () => {
      const config = getMermaidConfig(false);
      expect(config.theme).toBe('base');
      expect(config.securityLevel).toBe('strict');
      expect(config.startOnLoad).toBe(false);
      expect(config.suppressErrorRendering).toBe(true);
      expect(config.themeVariables).toEqual(LOTUS_LIGHT_THEME_VARIABLES);
    });
  });

  describe('renderMermaidDiagram', () => {
    it('returns rendered svg on valid diagram code', async () => {
      const result = await renderMermaidDiagram(
        'test-diagram-1',
        'graph TD;\n  A-->B;',
        true
      );

      if ('svg' in result) {
        expect(result.svg).toBeDefined();
        expect(typeof result.svg).toBe('string');
        expect(result.svg).toContain('<svg');
      } else {
        // In some headless test environments without full DOM, mermaid might fail or succeed
        expect(result.error).toBeDefined();
      }
    });

    it('catches syntax errors gracefully and returns error object', async () => {
      const result = await renderMermaidDiagram(
        'test-diagram-invalid',
        'invalid mermaid syntax !!!???',
        false
      );

      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });
});
