import { create } from 'zustand';

interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  activeThreadId: string | null;
  
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
  setMinimized: (isMinimized: boolean) => void;
  setActiveThread: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  isMinimized: false,
  activeThreadId: null,

  toggleOpen: () => set((state) => ({ 
    isOpen: !state.isOpen,
    isMinimized: false 
  })),

  setOpen: (isOpen) => set({ 
    isOpen, 
    isMinimized: false 
  }),

  setMinimized: (isMinimized) => set({ isMinimized }),

  setActiveThread: (id) => set({ activeThreadId: id }),
}));
