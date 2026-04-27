const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1 pour éviter la confusion

export function generateRoomCode(length = 6): string {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}
