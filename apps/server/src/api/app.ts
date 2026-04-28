import express from 'express'
import cors from 'cors'
import { authRouter } from './auth.routes.js'
import { usersRouter } from './users.routes.js'
import { dmRouter } from './dm.routes.js'
import { uploadRouter } from './upload.routes.js'

export const app = express()

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/dm', dmRouter)
app.use('/api/upload', uploadRouter)
