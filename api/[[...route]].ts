import { Hono } from 'hono'

import { app } from '../apps/proxy/src/app'

const apiApp = new Hono()

apiApp.route('/api', app)

export default apiApp
