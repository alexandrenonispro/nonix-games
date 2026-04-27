import { Router } from 'express'
import { verifyToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { supabase } from '../lib/supabase.js'
import { store } from '../lib/store.js'

export const uploadRouter = Router()

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'Token invalide' })
  req.userId = payload.userId
  next()
}

// ─── POST /api/upload/avatar ──────────────────────────────────────────────────
// Reçoit multipart/form-data avec un champ "avatar"

uploadRouter.post('/avatar', requireAuth, async (req: any, res) => {
  // Lire le body manuellement (pas de multer — on stream directement vers Supabase)
  const contentType = req.headers['content-type'] ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'multipart/form-data requis' })
  }

  // Récupérer les chunks du body
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks)

  // Parser le boundary
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/)
  if (!boundaryMatch) return res.status(400).json({ error: 'Boundary manquant' })
  const boundary = boundaryMatch[1]!

  // Extraire le fichier du multipart
  const boundaryBuf = Buffer.from(`--${boundary}`)
  const parts = splitBuffer(raw, boundaryBuf)

  let fileBuffer: Buffer | null = null
  let mimeType = 'image/jpeg'

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headers = part.slice(0, headerEnd).toString()
    if (!headers.includes('filename=')) continue

    const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/)
    if (mimeMatch) mimeType = mimeMatch[1]!.trim()

    // Le corps du fichier (sans le \r\n final)
    fileBuffer = part.slice(headerEnd + 4, part.length - 2)
    break
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier trouvé' })
  }

  // Vérifier le type MIME
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(mimeType)) {
    return res.status(400).json({ error: 'Format non supporté (jpg, png, webp, gif)' })
  }

  // Vérifier la taille (max 5 Mo)
  if (fileBuffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image trop lourde (max 5 Mo)' })
  }

  const ext = mimeType.split('/')[1]!.replace('jpeg', 'jpg')
  const path = `avatar-${req.userId}.${ext}`

  console.log(`[upload] uploading ${path} (${fileBuffer.length} bytes, ${mimeType})`)

  // Debug URL
  console.log('[upload] SUPABASE_URL:', process.env.SUPABASE_URL)

  // Upload vers Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, fileBuffer, { contentType: mimeType, upsert: true })

  if (uploadError) {
    console.error('[upload] Supabase error:', uploadError)
    return res.status(500).json({ error: 'Erreur upload' })
  }

  // URL publique
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}` // cache-bust

  // Sauvegarder en BDD
  await prisma.user.update({
    where: { id: req.userId },
    data: { avatarUrl },
  })

  // Mettre à jour le store en mémoire si le joueur est connecté
  store.updateAvatarUrl(req.userId, avatarUrl)

  return res.json({ avatarUrl })
})

// ─── Helper : split buffer par separator ─────────────────────────────────────

function splitBuffer(buf: Buffer, sep: Buffer): Buffer[] {
  const parts: Buffer[] = []
  let start = 0
  while (true) {
    const idx = buf.indexOf(sep, start)
    if (idx === -1) { parts.push(buf.slice(start)); break }
    parts.push(buf.slice(start, idx))
    start = idx + sep.length
  }
  return parts.filter((p) => p.length > 4)
}
