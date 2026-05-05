import 'dotenv/config'
import { createServer } from 'http'
import { app } from './api/app.js'
import { initSocketIO } from './socket/index.js'

const PORT = process.env.PORT ?? 3001
const httpServer = createServer(app)

initSocketIO(httpServer)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
