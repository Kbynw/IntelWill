
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface LibraryItem {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  createdAt: number;
  fileName?: string;
  mimeType?: string;
  fileData?: string; // Base64 encoded file data for PDF or other binaries
}

export interface ModalState {
  isOpen: boolean;
  type: 'add_category' | 'edit_category' | 'delete_category' | 'move_item' | 'alert' | 'delete_item';
  title: string;
  message?: string;
  data?: any;
}
