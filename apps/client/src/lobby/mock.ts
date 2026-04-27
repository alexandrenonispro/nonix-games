import type { Player, RoomSummary } from '@game-platform/shared'

export const MOCK_ME: Player = {
  id: 'me',
  username: 'Zerox',
  avatarUrl: null,
  level: 14,
  rank: 'Vétéran',
}

export const MOCK_FRIENDS: (Player & { isOnline: boolean; inRoom?: string })[] = [
  { id: '1', username: 'Noxie', avatarUrl: null, level: 22, rank: 'Expert', isOnline: true },
  { id: '2', username: 'Krypt', avatarUrl: null, level: 8, rank: 'Rookie', isOnline: true, inRoom: 'AB4X2C' },
  { id: '3', username: 'Sylvae', avatarUrl: null, level: 31, rank: 'Légende', isOnline: false },
  { id: '4', username: 'Torken', avatarUrl: null, level: 17, rank: 'Vétéran', isOnline: true },
  { id: '5', username: 'Mivra', avatarUrl: null, level: 5, rank: 'Rookie', isOnline: false },
]

export const MOCK_ROOMS: RoomSummary[] = [
  { code: 'AB4X2C', gameId: 'quiz', playerCount: 3, maxPlayers: 8, status: 'waiting' },
  { code: 'ZZ99QR', gameId: 'skribble', playerCount: 5, maxPlayers: 8, status: 'waiting' },
  { code: 'MNPF4K', gameId: 'loup_garou', playerCount: 7, maxPlayers: 12, status: 'in_game' },
]

export const GAME_META: Record<string, { label: string; emoji: string; color: string }> = {
  quiz:        { label: 'Quiz',       emoji: '🧠', color: '#60a5fa' },
  skribble:    { label: 'Drawnix',    emoji: '🎨', color: '#f472b6' },
  loup_garou:  { label: 'Loup-garou', emoji: '🐺', color: '#a78bfa' },
  blind_test:  { label: 'Blind test', emoji: '🎵', color: '#fb923c' },
  undercover:  { label: 'Undercover', emoji: '🕵️', color: '#34d399' },
}
