import { create } from 'zustand'
import type { Room, RoomMember, Message, Score, GamePayload } from '@game-platform/shared'

interface RoomState {
  room: Room | null
  members: RoomMember[]
  chat: Message[]
  scores: Score[]
  gamePayload: GamePayload | null
  timeLeft: number | null
  phase: string | null

  // Actions
  setRoom: (room: Room) => void
  setMembers: (members: RoomMember[]) => void
  addMember: (member: RoomMember) => void
  removeMember: (userId: string) => void
  setMemberReady: (userId: string, isReady: boolean) => void
  addMessage: (message: Message) => void
  setGameState: (payload: { phase: string; scores: Score[]; payload: GamePayload }) => void
  setTimeLeft: (timeLeft: number) => void
  reset: () => void
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  members: [],
  chat: [],
  scores: [],
  gamePayload: null,
  timeLeft: null,
  phase: null,

  setRoom: (room) => set({ room }),
  setMembers: (members) => set({ members }),
  addMember: (member) => set((s) => ({ members: [...s.members, member] })),
  removeMember: (userId) =>
    set((s) => ({ members: s.members.filter((m) => m.id !== userId) })),
  setMemberReady: (userId, isReady) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === userId ? { ...m, isReady } : m)),
    })),
  addMessage: (message) => set((s) => ({ chat: [...s.chat, message] })),
  setGameState: ({ phase, scores, payload }) =>
    set({ phase, scores, gamePayload: payload }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  reset: () =>
    set({ room: null, members: [], chat: [], scores: [], gamePayload: null, timeLeft: null, phase: null }),
}))
