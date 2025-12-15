import { create } from 'zustand';

interface BookingState {
  selectedCourt: number | null;
  selectedDate: Date | null;
  setSelectedCourt: (courtId: number | null) => void;
  setSelectedDate: (date: Date | null) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedCourt: null,
  selectedDate: null,
  setSelectedCourt: (courtId) => set({ selectedCourt: courtId }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
