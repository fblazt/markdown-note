import type { Ref } from 'vue';
import type { FolderInfo, FolderTreeNode, Note } from '../../shared/types/note';
import {
  getAllFolders,
  createFolder as dbCreateFolder,
  renameFolder as dbRenameFolder,
  deleteFolder as dbDeleteFolder,
  moveFolder as dbMoveFolder,
} from '../utils/db';

export interface FlattenedFolderOption {
  name: string;
  path: string;
  depth: number;
  label: string;
}

const getInitialExpandedFolders = (): string[] => {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('markdown-note-expanded-folders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
          return parsed;
        }
      }
    } catch {}
  }
  return ['Guides', 'Projects', 'Code'];
};

// Singleton refs for folder state
const folders = ref<FolderInfo[]>([]);
const expandedFolders = ref<string[]>(getInitialExpandedFolders());
const selectedFolder = ref<string | null>(null);

// Watch expandedFolders to persist in localStorage
watch(
  expandedFolders,
  (val) => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('markdown-note-expanded-folders', JSON.stringify(val));
      } catch {}
    }
  },
  { deep: true }
);

export function buildFolderTree(folderList: FolderInfo[], notesList: Note[] = []): FolderTreeNode[] {
  const allPaths = new Set<string>();
  for (const f of folderList) {
    if (!f.name) continue;
    const segs = f.name.split('/').filter(Boolean);
    let cur = '';
    for (const seg of segs) {
      cur = cur ? `${cur}/${seg}` : seg;
      allPaths.add(cur);
    }
  }

  const nodeMap = new Map<string, FolderTreeNode>();
  const sortedPaths = Array.from(allPaths).sort((a, b) => a.localeCompare(b));

  for (const path of sortedPaths) {
    const segs = path.split('/');
    const name = segs[segs.length - 1]!;
    const depth = segs.length - 1;
    const noteCount = notesList.filter((n) => n.folder === path).length;

    nodeMap.set(path, {
      name,
      path,
      depth,
      noteCount,
      children: [],
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const path of sortedPaths) {
    const node = nodeMap.get(path)!;
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      roots.push(node);
    } else {
      const parentPath = path.substring(0, lastSlash);
      const parentNode = nodeMap.get(parentPath);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}

export function flattenFolderTree(nodes: FolderTreeNode[]): FlattenedFolderOption[] {
  const result: FlattenedFolderOption[] = [];
  function traverse(nodeList: FolderTreeNode[]) {
    for (const node of nodeList) {
      const indent = '  '.repeat(node.depth);
      const prefix = node.depth > 0 ? `${indent}↳ ` : '';
      result.push({
        name: node.name,
        path: node.path,
        depth: node.depth,
        label: `${prefix}${node.name}`,
      });
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return result;
}

// Module-level reference to notes for cross-composable synchronization
let sharedNotesRef: Ref<Note[]> | null = null;
let sharedSelectedNoteIdRef: Ref<string | null> | null = null;

export function registerSharedNotes(notesRef: Ref<Note[]>, selectedNoteIdRef?: Ref<string | null>) {
  sharedNotesRef = notesRef;
  if (selectedNoteIdRef) {
    sharedSelectedNoteIdRef = selectedNoteIdRef;
  }
}

export function useFolders(notesRef?: Ref<Note[]>, selectedNoteIdRef?: Ref<string | null>) {
  if (notesRef) sharedNotesRef = notesRef;
  if (selectedNoteIdRef) sharedSelectedNoteIdRef = selectedNoteIdRef;

  const currentNotes = notesRef || sharedNotesRef;
  const currentSelectedId = selectedNoteIdRef || sharedSelectedNoteIdRef;

  const folderList = computed<FolderInfo[]>(() => {
    return [...folders.value].sort((a, b) => a.name.localeCompare(b.name));
  });

  const folderTree = computed<FolderTreeNode[]>(() => {
    return buildFolderTree(folders.value, currentNotes?.value || []);
  });

  function isFolderExpanded(folderName: string): boolean {
    if (folderName === '__uncategorized__') {
      return expandedFolders.value.includes('__uncategorized__') || expandedFolders.value.includes('Uncategorized');
    }
    return expandedFolders.value.includes(folderName);
  }

  async function fetchFolders(): Promise<void> {
    try {
      const data = await getAllFolders();
      folders.value = data;
      const validNames = new Set(data.map((f) => f.name));
      expandedFolders.value = expandedFolders.value.filter(
        (name) => validNames.has(name) || name === '__uncategorized__'
      );
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  }

  function toggleFolder(folderName: string): void {
    const index = expandedFolders.value.indexOf(folderName);
    if (index === -1) {
      expandedFolders.value.push(folderName);
    } else {
      expandedFolders.value.splice(index, 1);
    }
  }

  function expandAllFolders(): void {
    expandedFolders.value = folders.value.map((f) => f.name);
  }

  function collapseAllFolders(): void {
    expandedFolders.value = [];
  }

  async function createFolder(name: string): Promise<boolean> {
    const trimmed = name?.trim();
    if (!trimmed) return false;
    try {
      const success = await dbCreateFolder(trimmed);
      if (!success) return false;
      await fetchFolders();

      // Auto-expand created folder and its ancestor folders
      const segs = trimmed.split('/');
      let cur = '';
      for (const seg of segs) {
        cur = cur ? `${cur}/${seg}` : seg;
        if (!expandedFolders.value.includes(cur)) {
          expandedFolders.value.push(cur);
        }
      }

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return true;
    } catch (err) {
      console.error('Failed to create folder:', err);
      return false;
    }
  }

  async function createSubfolder(parentPath: string, subfolderName: string): Promise<boolean> {
    const trimmedSub = subfolderName?.trim();
    if (!trimmedSub) return false;
    const parent = parentPath?.trim();
    const fullPath = parent ? `${parent}/${trimmedSub}` : trimmedSub;
    return await createFolder(fullPath);
  }

  async function renameFolder(oldName: string, newName: string): Promise<boolean> {
    const trimmedNew = newName?.trim();
    if (!trimmedNew || trimmedNew === oldName) return false;
    try {
      const success = await dbRenameFolder(oldName, trimmedNew);
      if (!success) return false;

      if (currentNotes?.value) {
        currentNotes.value.forEach((n) => {
          if (n.folder === oldName) {
            n.folder = trimmedNew;
          } else if (n.folder && n.folder.startsWith(oldName + '/')) {
            n.folder = trimmedNew + n.folder.slice(oldName.length);
          }
        });
      }

      const updatedExpanded: string[] = [];
      for (const exp of expandedFolders.value) {
        if (exp === oldName) {
          updatedExpanded.push(trimmedNew);
        } else if (exp.startsWith(oldName + '/')) {
          updatedExpanded.push(trimmedNew + exp.slice(oldName.length));
        } else {
          updatedExpanded.push(exp);
        }
      }
      expandedFolders.value = updatedExpanded;

      if (selectedFolder.value === oldName) {
        selectedFolder.value = trimmedNew;
      } else if (selectedFolder.value && selectedFolder.value.startsWith(oldName + '/')) {
        selectedFolder.value = trimmedNew + selectedFolder.value.slice(oldName.length);
      }

      await fetchFolders();

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return true;
    } catch (err) {
      console.error(`Failed to rename folder "${oldName}" to "${newName}":`, err);
      return false;
    }
  }

  async function moveFolder(sourcePath: string, targetParentPath?: string): Promise<boolean> {
    const trimmedSource = sourcePath?.trim();
    if (!trimmedSource) return false;
    const trimmedTarget = targetParentPath?.trim() || '';

    if (trimmedTarget && (trimmedTarget === trimmedSource || trimmedTarget.startsWith(trimmedSource + '/'))) {
      return false;
    }

    try {
      const success = await dbMoveFolder(trimmedSource, trimmedTarget);
      if (!success) return false;

      const baseName = trimmedSource.split('/').pop()!;
      const newPath = trimmedTarget ? `${trimmedTarget}/${baseName}` : baseName;

      if (currentNotes?.value) {
        currentNotes.value.forEach((n) => {
          if (n.folder === trimmedSource) {
            n.folder = newPath;
          } else if (n.folder && n.folder.startsWith(trimmedSource + '/')) {
            n.folder = newPath + n.folder.slice(trimmedSource.length);
          }
        });
      }

      const updatedExpanded: string[] = [];
      for (const exp of expandedFolders.value) {
        if (exp === trimmedSource) {
          updatedExpanded.push(newPath);
        } else if (exp.startsWith(trimmedSource + '/')) {
          updatedExpanded.push(newPath + exp.slice(trimmedSource.length));
        } else {
          updatedExpanded.push(exp);
        }
      }
      if (newPath && !updatedExpanded.includes(newPath)) {
        updatedExpanded.push(newPath);
      }
      if (trimmedTarget && !updatedExpanded.includes(trimmedTarget)) {
        updatedExpanded.push(trimmedTarget);
      }
      expandedFolders.value = updatedExpanded;

      if (selectedFolder.value === trimmedSource) {
        selectedFolder.value = newPath;
      } else if (selectedFolder.value && selectedFolder.value.startsWith(trimmedSource + '/')) {
        selectedFolder.value = newPath + selectedFolder.value.slice(trimmedSource.length);
      }

      await fetchFolders();

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return true;
    } catch (err) {
      console.error(`Failed to move folder "${sourcePath}" to "${targetParentPath}":`, err);
      return false;
    }
  }

  async function deleteFolder(name: string, deleteNotes = false): Promise<boolean> {
    try {
      const success = await dbDeleteFolder(name, deleteNotes);
      if (!success) return false;

      if (deleteNotes) {
        if (currentNotes?.value) {
          const deletedNoteIds = currentNotes.value
            .filter((n) => n.folder === name || (n.folder && n.folder.startsWith(name + '/')))
            .map((n) => n.id);
          if (typeof localStorage !== 'undefined') {
            for (const dId of deletedNoteIds) {
              try {
                localStorage.removeItem(`markdown-note-draft-${dId}`);
              } catch {}
            }
          }

          currentNotes.value = currentNotes.value.filter(
            (n) => !(n.folder === name || (n.folder && n.folder.startsWith(name + '/')))
          );

          if (currentSelectedId && currentSelectedId.value) {
            const activeNoteInFolder = !currentNotes.value.some((n) => n.id === currentSelectedId.value);
            if (activeNoteInFolder) {
              const nextId = currentNotes.value[0]?.id || null;
              currentSelectedId.value = nextId;
              if (typeof localStorage !== 'undefined') {
                try {
                  if (nextId) {
                    localStorage.setItem('markdown-note-active-note-id', nextId);
                  } else {
                    localStorage.removeItem('markdown-note-active-note-id');
                  }
                } catch {}
              }
            }
          }
        }
      } else {
        if (currentNotes?.value) {
          currentNotes.value.forEach((n) => {
            if (n.folder === name || (n.folder && n.folder.startsWith(name + '/'))) {
              delete n.folder;
            }
          });
        }
      }

      expandedFolders.value = expandedFolders.value.filter(
        (f) => !(f === name || f.startsWith(name + '/'))
      );
      if (selectedFolder.value === name || (selectedFolder.value && selectedFolder.value.startsWith(name + '/'))) {
        selectedFolder.value = null;
      }
      await fetchFolders();

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return true;
    } catch (err) {
      console.error(`Failed to delete folder "${name}":`, err);
      return false;
    }
  }

  return {
    folders,
    expandedFolders,
    selectedFolder,
    folderList,
    folderTree,
    fetchFolders,
    toggleFolder,
    expandAllFolders,
    collapseAllFolders,
    createFolder,
    createSubfolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    isFolderExpanded,
    buildFolderTree,
    flattenFolderTree,
  };
}
