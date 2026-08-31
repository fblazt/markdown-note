// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NoteCard from '../../app/components/common/NoteCard.vue';
import type { Note } from '../../shared/types/note';

describe('Component: NoteCard (app/components/common/NoteCard.vue)', () => {
  const mockNote: Note = {
    id: 'note-card-1',
    title: 'Testing NoteCard Component',
    content: '# Introduction\n\nThis is a sample markdown note content.',
    tags: ['vue', 'vitest', 'testing', 'pinia'],
    folder: 'Tests',
    createdAt: '2026-08-30T10:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
  };

  it('renders note title, preview snippet, formatted date, and tag chips', () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: mockNote,
        isSelected: false,
        isDragging: false,
      },
    });

    expect(wrapper.find('.note-item-title').text()).toBe('Testing NoteCard Component');
    expect(wrapper.find('.note-item-preview').text()).toContain('Introduction');
    expect(wrapper.find('.note-date').text()).toBeTruthy();

    const tagChips = wrapper.findAll('.tag-chip');
    expect(tagChips).toHaveLength(2);
    expect(tagChips[0]?.text()).toBe('#vue');
    expect(tagChips[1]?.text()).toBe('#vitest');

    const moreChip = wrapper.find('.tag-chip-more');
    expect(moreChip.exists()).toBe(true);
    expect(moreChip.text()).toBe('+2');
  });

  it('displays fallback title when note title is empty', () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: { ...mockNote, title: '' },
      },
    });

    expect(wrapper.find('.note-item-title').text()).toBe('Untitled Note');
  });

  it('applies active and is-dragging classes when props are true', () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: mockNote,
        isSelected: true,
        isDragging: true,
      },
    });

    expect(wrapper.classes()).toContain('active');
    expect(wrapper.classes()).toContain('is-dragging');
  });

  it('emits open event when clicked', async () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: mockNote,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toBeTruthy();
    expect(wrapper.emitted('open')?.[0]).toEqual(['note-card-1']);
  });

  it('emits delete event when delete button is clicked without bubbling open', async () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: mockNote,
      },
    });

    const deleteBtn = wrapper.find('.btn-delete-note');
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger('click');

    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')?.[0]).toEqual(['note-card-1', 'Testing NoteCard Component']);
  });
});
