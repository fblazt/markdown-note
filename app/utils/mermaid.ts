/**
 * Mermaid diagram preview support with Kanagawa theme mapping.
 * Lazy loads Mermaid to minimize initial bundle size.
 */

export interface MermaidThemeVariables {
  darkMode: boolean;
  background: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  lineColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  fontFamily: string;
}

export interface MermaidConfig {
  theme: 'base';
  themeVariables: MermaidThemeVariables;
  securityLevel: 'strict';
  startOnLoad: boolean;
  suppressErrorRendering: boolean;
}

export const DRAGON_DARK_THEME_VARIABLES: MermaidThemeVariables = {
  darkMode: true,
  background: '#181616',
  primaryColor: '#1d1c19',
  primaryTextColor: '#c5c9c5',
  primaryBorderColor: '#8ba4b0',
  lineColor: '#8a9a86',
  secondaryColor: '#282727',
  tertiaryColor: '#12120f',
  fontFamily: 'Inter, sans-serif',
};

export const LOTUS_LIGHT_THEME_VARIABLES: MermaidThemeVariables = {
  darkMode: false,
  background: '#f2ecbc',
  primaryColor: '#e7d7ad',
  primaryTextColor: '#43436c',
  primaryBorderColor: '#4d699b',
  lineColor: '#716e61',
  secondaryColor: '#decfb0',
  tertiaryColor: '#e5ddb0',
  fontFamily: 'Inter, sans-serif',
};

export function getMermaidConfig(isDark: boolean): MermaidConfig {
  return {
    theme: 'base',
    themeVariables: isDark ? { ...DRAGON_DARK_THEME_VARIABLES } : { ...LOTUS_LIGHT_THEME_VARIABLES },
    securityLevel: 'strict',
    startOnLoad: false,
    suppressErrorRendering: true,
  };
}

let mermaidPromise: Promise<any> | null = null;

export async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default || m);
  }
  return mermaidPromise;
}

/**
 * Checks if the given code block language identifier represents Mermaid diagrams.
 */
export function isMermaidCode(lang?: string): boolean {
  if (!lang) return false;
  const clean = lang.trim().toLowerCase();
  return clean === 'mermaid' || clean === 'flowchart';
}

/**
 * Renders Mermaid diagram code into an SVG string.
 * Catches any syntax or rendering errors and returns an error object safely.
 */
export async function renderMermaidDiagram(
  id: string,
  code: string,
  isDark: boolean
): Promise<{ svg: string } | { error: string }> {
  try {
    const mermaid = await getMermaid();
    mermaid.initialize(getMermaidConfig(isDark));
    const result = await mermaid.render(id, code);
    return { svg: result.svg };
  } catch (err: any) {
    return { error: err && err.message ? err.message : 'Syntax error' };
  }
}
