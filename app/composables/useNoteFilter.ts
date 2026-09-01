import type { Ref } from 'vue';
import type { Note, FolderInfo } from '../../shared/types/note';

// Singleton filter state
const searchQuery = ref('');
const selectedTag = ref<string | null>(null);

let boundNotes: Ref<Note[]> | null = null;
let boundFolders: Ref<FolderInfo[]> | null = null;
let boundExpandedFolders: Ref<string[]> | null = null;
let boundSelectedFolder: Ref<string | null> | null = null;

export interface UseNoteFilterOptions {
  notes?: Ref<Note[]>;
  folders?: Ref<FolderInfo[]>;
  expandedFolders?: Ref<string[]>;
  selectedFolder?: Ref<string | null>;
}

export function useNoteFilter(options?: UseNoteFilterOptions) {
  if (options?.notes) boundNotes = options.notes;
  if (options?.folders) boundFolders = options.folders;
  if (options?.expandedFolders) boundExpandedFolders = options.expandedFolders;
  if (options?.selectedFolder) boundSelectedFolder = options.selectedFolder;

  const notesRef = options?.notes || boundNotes || ref<Note[]>([]);
  const foldersRef = options?.folders || boundFolders || ref<FolderInfo[]>([]);
  const expandedFoldersRef = options?.expandedFolders || boundExpandedFolders || ref<string[]>([]);
  const selectedFolderRef = options?.selectedFolder || boundSelectedFolder || ref<string | null>(null);

  const allTags = computed<string[]>(() => {
    const tagsSet = new Set<string>();
    for (const note of notesRef.value) {
      if (Array.isArray(note.tags)) {
        for (const tag of note.tags) {
          if (tag.trim()) tagsSet.add(tag.trim());
        }
      }
    }
    return Array.from(tagsSet).sort();
  });

  const searchAndTagFilteredNotes = computed<Note[]>(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const tagFilter = selectedTag.value;

    return notesRef.value.filter((note) => {
      // Tag filter
      if (tagFilter && (!note.tags || !note.tags.includes(tagFilter))) {
        return false;
      }

      // Search query filter (matches title, content, tags, or folder)
      if (!query) return true;

      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content.toLowerCase().includes(query);
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(query));
      const folderMatch = note.folder?.toLowerCase().includes(query);

      return titleMatch || contentMatch || tagMatch || folderMatch;
    });
  });

  const notesByFolder = computed<Record<string, Note[]>>(() => {
    const map: Record<string, Note[]> = {};
    for (const folder of foldersRef.value) {
      map[folder.name] = [];
    }
    for (const note of searchAndTagFilteredNotes.value) {
      if (note.folder) {
        const targetList = map[note.folder] || (map[note.folder] = []);
        targetList.push(note);
      }
    }
    return map;
  });

  const rootNotes = computed<Note[]>(() => {
    return searchAndTagFilteredNotes.value.filter((note) => !note.folder);
  });

  const filteredNotes = computed<Note[]>(() => {
    const base = searchAndTagFilteredNotes.value;
    if (!selectedFolderRef.value) {
      return base;
    }
    if (selectedFolderRef.value === '__root__') {
      return base.filter((note) => !note.folder);
    }
    return base.filter((note) => note.folder === selectedFolderRef.value);
  });

  // Auto-expand parent and child folders when searching/filtering
  watch([searchQuery, selectedTag], ([q, tag]) => {
    if (q || tag) {
      for (const note of searchAndTagFilteredNotes.value) {
        if (note.folder) {
          const segs = note.folder.split('/');
          let cur = '';
          for (const seg of segs) {
            cur = cur ? `${cur}/${seg}` : seg;
            if (!expandedFoldersRef.value.includes(cur)) {
              expandedFoldersRef.value.push(cur);
            }
          }
        }
      }
      if (q) {
        for (const folder of foldersRef.value) {
          if (folder.name.toLowerCase().includes(q.toLowerCase())) {
            const segs = folder.name.split('/');
            let cur = '';
            for (const seg of segs) {
              cur = cur ? `${cur}/${seg}` : seg;
              if (!expandedFoldersRef.value.includes(cur)) {
                expandedFoldersRef.value.push(cur);
              }
            }
          }
        }
      }
    }
  });

  function toggleTagFilter(tag: string): void {
    if (selectedTag.value === tag) {
      selectedTag.value = null;
    } else {
      selectedTag.value = tag;
    }
  }

  function clearFilters(): void {
    searchQuery.value = '';
    selectedTag.value = null;
  }

  return {
    searchQuery,
    selectedTag,
    allTags,
    searchAndTagFilteredNotes,
    filteredNotes,
    notesByFolder,
    rootNotes,
    toggleTagFilter,
    clearFilters,
  };
}
