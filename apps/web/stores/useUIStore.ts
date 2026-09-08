import { create } from 'zustand';

type UIState = {
  isMobileMenuOpen: boolean;
  isSidebarOpen: boolean;
  searchOpen: boolean;
  isCartOpen: boolean;
  toggleMobileMenu: () => void;
  toggleSidebar: () => void;
  toggleSearch: () => void;
  closeMobileMenu: () => void;
  closeSearch: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

export const useUIStore = create<UIState>()((set) => ({
  isMobileMenuOpen: false,
  isSidebarOpen: true,
  searchOpen: false,
  isCartOpen: false,

  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),
}));
