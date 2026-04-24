#!/usr/bin/env node
/**
 * GitHub Webhook Receiver for Card Auction Platform
 * Listens for push events and automatically deploys latest code.
 */

const http = require('http')
const { execSync } = require('child_process')
const crypto = require('crypto')

const PORT = 8999
const WEBHOOK_SECRET = process.env.DEPLOY_SECRET || 'card-auction-webhook-secret-2026'
const PROJECT_DIR = '/var/www/card-auction-platform'

// Verify webhook signature
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256']
  if (!signature) return false

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const digest = 'sha256=' + hmac.update(req.body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

const server = http.createServer((req, res) => {
  // Only accept POST to /webhook (nginx strips /webhook/prefix → /)
  if (req.method !== 'POST' || req.url !== '/') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  let body = []

  req.on('data', chunk => body.push(chunk))
  req.on('end', () => {
    req.body = Buffer.concat(body).toString()

    // Verify signature
    if (!verifySignature(req)) {
      console.error('[WEBHOOK] Invalid signature')
      res.writeHead(401)
      res.end('Unauthorized')
      return
    }

    // Parse payload
    let payload
    try {
      payload = JSON.parse(req.body)
    } catch {
      res.writeHead(400)
      res.end('Bad payload')
      return
    }

    const branch = payload.ref?.split('/').pop()
    const repo = payload.repository?.full_name
    const pusher = payload.pusher?.name

    console.log(`[WEBHOOK] Received push to ${branch} by ${pusher} from ${repo}`)

    if (branch !== 'main') {
      console.log('[WEBHOOK] Not main branch, skipping deploy')
      res.writeHead(200)
      res.end('OK (not main branch)')
      return
    }

    // Deploy
    console.log('[WEBHOOK] Deploying...')

    try {
      // Use HTTPS with GitHub token from environment to avoid exposing secrets
      const GITHUB_TOKEN = process.env.GH_DEPLOY_TOKEN
      if (!GITHUB_TOKEN) {
        console.error('[WEBHOOK] GH_DEPLOY_TOKEN not set')
        throw new Error('GH_DEPLOY_TOKEN not configured')
      }
      const env = { ...process.env, GIT_ASKPASS: 'echo' }
      execSync(`git remote set-url origin https://${GITHUB_TOKEN}@github.com/bubuhome-lukesou/card-trading-platform.git`, { cwd: PROJECT_DIR, stdio: 'pipe', env })
      execSync('git checkout -- backend/ frontend/', { cwd: PROJECT_DIR, stdio: 'pipe', env })
      execSync('git clean -fd backend/ frontend/', { cwd: PROJECT_DIR, stdio: 'pipe', env })
      const pullResult = execSync('git pull origin main', { cwd: PROJECT_DIR, stdio: 'pipe', env })
      console.log('[WEBHOOK] Git pull output:', pullResult.toString())
      console.log('[WEBHOOK] ✓ Git pull done')

      // Rebuild backend
      execSync('npm run build', { cwd: `${PROJECT_DIR}/backend`, stdio: 'inherit' })
      console.log('[WEBHOOK] ✓ Backend build done')

      // Rebuild frontend
      execSync('npm run build', { cwd: `${PROJECT_DIR}/frontend`, stdio: 'inherit' })
      console.log('[WEBHOOK] ✓ Frontend build done')

      // Sync frontend dist to nginx
      execSync('rsync -az --delete dist/ /var/www/card-auction-platform/frontend/dist/', {
        cwd: `${PROJECT_DIR}/frontend`,
        stdio: 'inherit'
      })
      console.log('[WEBHOOK] ✓ Frontend dist synced')

      // Restart PM2
      execSync('pm2 restart card-auction-backend', { stdio: 'inherit' })
      console.log('[WEBHOOK] ✓ PM2 restarted')

      console.log('[WEBHOOK] === Deploy complete ===')
    } catch (err) {
      console.error('[WEBHOOK] Deploy failed:', err.message)
      res.writeHead(500)
      res.end('Deploy failed')
      return
    }

    res.writeHead(200)
    res.end('Deployed successfully')
  })
})

server.listen(PORT, () => {
  console.log(`[WEBHOOK] Listening on port ${PORT}`)
})
