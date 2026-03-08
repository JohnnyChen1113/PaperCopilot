import { handle } from 'hono/vercel'

import { app } from '../apps/proxy/src/app'

export const runtime = 'nodejs'

export default handle(app)
