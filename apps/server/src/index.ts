import 'dotenv/config'
import { createServer } from 'http'
import { app } from './api/app.js'
import { initSocketIO } from './socket/index.js'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const httpServer = createServer(app)

initSocketIO(httpServer)

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
