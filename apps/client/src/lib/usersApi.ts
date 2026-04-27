const API = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

async function req(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur réseau')
  return data
}

export const usersApi = {
  search: (q: string, token: string) =>
    req('GET', `/api/users/search?q=${encodeURIComponent(q)}`, token),

  getProfile: (id: string, token: string) =>
    req('GET', `/api/users/${id}`, token),

  getFriends: (token: string) =>
    req('GET', `/api/users/friends/list`, token),

  sendFriendRequest: (targetId: string, token: string) =>
    req('POST', `/api/users/friends/request`, token, { targetId }),

  respondToRequest: (friendshipId: string, accept: boolean, token: string) =>
    req('POST', `/api/users/friends/respond`, token, { friendshipId, accept }),

  getNotifications: (token: string) =>
    req('GET', `/api/users/notifications`, token),

  markNotificationRead: (id: string, token: string) =>
    req('POST', `/api/users/notifications/read`, token, { id }),

  getHistory: (userId: string, token: string) =>
    req('GET', `/api/users/${userId}/history`, token),
}

export interface FriendUser {
  id: string
  username: string
  avatarUrl: string | null
  level: number
  rank: string
}

export interface AppNotification {
  id: string
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED'
  data: Record<string, any>
  read: boolean
  createdAt: string
  sender: { id: string; username: string; avatarUrl: string | null } | null
}

export const uploadApi = {
  avatar: async (file: File, token: string): Promise<{ avatarUrl: string }> => {
    const form = new FormData()
    form.append('avatar', file)
    const res = await fetch(`${API}/api/upload/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erreur upload')
    return data
  },
}
