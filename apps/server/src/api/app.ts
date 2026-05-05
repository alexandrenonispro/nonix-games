import express from 'express'
import cors from 'cors'
import { authRouter } from './auth.routes.js'
import { usersRouter } from './users.routes.js'
import { dmRouter } from './dm.routes.js'
import { uploadRouter } from './upload.routes.js'
import { adminRouter } from './routes/admin.js'

export const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://192.168.1.176:5173', process.env.CLIENT_URL].filter(Boolean) as string[], credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/dm', dmRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/admin', adminRouter)
