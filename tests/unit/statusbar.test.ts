import { describe, it, expect } from 'vitest';
import { getWordCount, getCharCount, getReadingTime } from '../../app/utils/markdown';

describe('Global Status Bar Logic & Statistics', () => {
  describe('Word Count Calculations & Pluralization', () => {
    it('returns 0 for empty content and null/undefined values', () => {
      expect(getWordCount('')).toBe(0);
      expect(getWordCount('   \n\t  ')).toBe(0);
    });

    it('correctly calculates single and multiple words', () => {
      const singleWord = 'Hello';
      const wordCount1 = getWordCount(singleWord);
      expect(wordCount1).toBe(1);
      expect(`${wordCount1} ${wordCount1 === 1 ? 'word' : 'words'}`).toBe('1 word');

      const multiWords = 'Hello world from global status bar!';
      const wordCountMulti = getWordCount(multiWords);
      expect(wordCountMulti).toBe(6);
      expect(`${wordCountMulti} ${wordCountMulti === 1 ? 'word' : 'words'}`).toBe('6 words');
    });
  });

  describe('Character Count Calculations & Pluralization', () => {
    it('calculates character count properly', () => {
      expect(getCharCount('')).toBe(0);

      const singleChar = 'a';
      const charCount1 = getCharCount(singleChar);
      expect(charCount1).toBe(1);
      expect(`${charCount1} ${charCount1 === 1 ? 'char' : 'chars'}`).toBe('1 char');

      const multiChars = 'abc 123';
      const charCountMulti = getCharCount(multiChars);
      expect(charCountMulti).toBe(7);
      expect(`${charCountMulti} ${charCountMulti === 1 ? 'char' : 'chars'}`).toBe('7 chars');
    });
  });

  describe('Reading Time Estimation', () => {
    it('returns 0 for empty text', () => {
      expect(getReadingTime('')).toBe(0);
    });

    it('estimates 1 minute for short content', () => {
      expect(getReadingTime('A quick note with five words.')).toBe(1);
    });

    it('estimates higher reading times for longer content', () => {
      const largeContent = Array(650).fill('markdown').join(' ');
      expect(getReadingTime(largeContent)).toBe(4);
    });
  });

  describe('Status Bar Active View State Matrix', () => {
    function computeActiveStates(isMobile: boolean, isSidebarOpen: boolean, effectiveViewMode: 'editor' | 'split' | 'preview') {
      const isEditorActive = isMobile
        ? !isSidebarOpen && effectiveViewMode === 'editor'
        : effectiveViewMode === 'split' || effectiveViewMode === 'editor';

      const isPreviewActive = isMobile
        ? !isSidebarOpen && effectiveViewMode === 'preview'
        : effectiveViewMode === 'split' || effectiveViewMode === 'preview';

      return { isEditorActive, isPreviewActive };
    }

    it('evaluates desktop split view correctly (both editor and preview active)', () => {
      const { isEditorActive, isPreviewActive } = computeActiveStates(false, true, 'split');
      expect(isEditorActive).toBe(true);
      expect(isPreviewActive).toBe(true);
    });

    it('evaluates desktop editor-only view correctly', () => {
      const { isEditorActive, isPreviewActive } = computeActiveStates(false, true, 'editor');
      expect(isEditorActive).toBe(true);
      expect(isPreviewActive).toBe(false);
    });

    it('evaluates desktop preview-only view correctly', () => {
      const { isEditorActive, isPreviewActive } = computeActiveStates(false, true, 'preview');
      expect(isEditorActive).toBe(false);
      expect(isPreviewActive).toBe(true);
    });

    it('evaluates mobile editor view when sidebar is closed', () => {
      const { isEditorActive, isPreviewActive } = computeActiveStates(true, false, 'editor');
      expect(isEditorActive).toBe(true);
      expect(isPreviewActive).toBe(false);
    });

    it('evaluates mobile preview view when sidebar is closed', () => {
      const { isEditorActive, isPreviewActive } = computeActiveStates(true, false, 'preview');
      expect(isEditorActive).toBe(false);
      expect(isPreviewActive).toBe(true);
    });

    it('evaluates mobile sidebar open (workspace hidden)', () => {
      const { isEditorActive, isPreviewActive } = computeActiveStates(true, true, 'editor');
      expect(isEditorActive).toBe(false);
      expect(isPreviewActive).toBe(false);
    });
  });

  describe('Status Bar Telemetry Presentation', () => {
    it('formats document stats strings correctly for active notes', () => {
      const content = 'Hello world! This is a test markdown document.';
      const words = getWordCount(content);
      const chars = getCharCount(content);
      const readTime = getReadingTime(content);

      const wordLabel = `${words} ${words === 1 ? 'word' : 'words'}`;
      const charLabel = `${chars} ${chars === 1 ? 'char' : 'chars'}`;
      const readLabel = `~${readTime} min read`;

      expect(wordLabel).toBe('8 words');
      expect(charLabel).toBe('46 chars');
      expect(readLabel).toBe('~1 min read');
    });

    it('formats total note count correctly', () => {
      const formatNotesTotal = (count: number) => `${count} notes`;
      expect(formatNotesTotal(0)).toBe('0 notes');
      expect(formatNotesTotal(1)).toBe('1 notes');
      expect(formatNotesTotal(42)).toBe('42 notes');
    });

    it('formats storage quota summary badge correctly', () => {
      const quota = {
        formattedUsage: '2.5 MB',
        formattedQuota: '100 MB',
        percentage: 2.5,
      };
      const summaryText = `${quota.formattedUsage} / ${quota.formattedQuota} (${Math.round(quota.percentage)}%)`;
      expect(summaryText).toBe('2.5 MB / 100 MB (3%)');
    });
  });
});
