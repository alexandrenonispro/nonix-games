import type { RoomMember, Message } from '@game-platform/shared'

export const MOCK_ROOM_MEMBERS: RoomMember[] = [
  { id: 'me',  username: 'Zerox',  avatarUrl: null, level: 14, rank: 'Vétéran', isReady: false, joinedAt: new Date().toISOString() },
  { id: '1',   username: 'Noxie',  avatarUrl: null, level: 22, rank: 'Expert',  isReady: true,  joinedAt: new Date().toISOString() },
  { id: '2',   username: 'Krypt',  avatarUrl: null, level: 8,  rank: 'Rookie',  isReady: true,  joinedAt: new Date().toISOString() },
  { id: '3',   username: 'Torken', avatarUrl: null, level: 17, rank: 'Vétéran', isReady: false, joinedAt: new Date().toISOString() },
]

export const MOCK_MESSAGES: Message[] = [
  { id: '1', author: null,                                                                   content: 'Torken a rejoint la room',   type: 'system', sentAt: new Date(Date.now() - 120000).toISOString() },
  { id: '2', author: { id: '1', username: 'Noxie',  avatarUrl: null, level: 22, rank: '' }, content: 'let\'s gooo 🔥',             type: 'text',   sentAt: new Date(Date.now() - 90000).toISOString() },
  { id: '3', author: { id: '2', username: 'Krypt',  avatarUrl: null, level: 8,  rank: '' }, content: 'prêt quand vous voulez',     type: 'text',   sentAt: new Date(Date.now() - 60000).toISOString() },
  { id: '4', author: { id: '3', username: 'Torken', avatarUrl: null, level: 17, rank: '' }, content: 'encore 2 min j\'arrive',     type: 'text',   sentAt: new Date(Date.now() - 30000).toISOString() },
]
