// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorToolbar from '../../app/components/editor/EditorToolbar.vue';

describe('Component: EditorToolbar (app/components/editor/EditorToolbar.vue)', () => {
  it('renders all formatting buttons and emits format event on click', async () => {
    const wrapper = mount(EditorToolbar);

    const buttons = wrapper.findAll('.toolbar-btn');
    expect(buttons).toHaveLength(12);

    const formatTypes = [
      'bold',
      'italic',
      'strikethrough',
      'h1',
      'h2',
      'h3',
      'code',
      'link',
      'bullet-list',
      'task-list',
      'blockquote',
      'table',
    ];

    for (let i = 0; i < buttons.length; i++) {
      await buttons[i]?.trigger('click');
      expect(wrapper.emitted('format')?.[i]).toEqual([formatTypes[i]]);
    }
  });
});
