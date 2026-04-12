/**
 * Proxy reverso para a API do PJE (comunicaapi.pje.jus.br)
 *
 * Roda localmente em um PC residencial (IP não bloqueado pelo PJE) e expõe
 * um endpoint HTTP que o Railway/backend usa no lugar de chamar o PJE direto.
 *
 * Uso:
 *   node index.js
 *
 * Variáveis de ambiente (opcionais):
 *   PORT=3333          Porta local do proxy (padrão: 3333)
 *   ALLOWED_ORIGIN=*   Origem permitida no CORS (padrão: *)
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')

const TARGET_HOST = 'comunicaapi.pje.jus.br'
const TARGET_BASE = `https://${TARGET_HOST}`
const PORT = Number(process.env.PORT) || 3333

// Headers que nunca devem ser repassados ao PJE (são do cliente → proxy)
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  // identifica o IP real do Railway — remove para não vazar
  'x-forwarded-for',
  'x-real-ip',
  'x-forwarded-host',
  'x-forwarded-proto',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
])

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

const server = http.createServer((req, res) => {
  // Health check — útil para o Railway saber se o proxy está vivo
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', target: TARGET_BASE }))
    return
  }

  let target_url
  try {
    target_url = new URL(req.url, TARGET_BASE)
  } catch {
    res.writeHead(400)
    res.end('URL inválida')
    return
  }

  // Filtra headers hop-by-hop e sobrescreve os críticos
  const forwarded_headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      forwarded_headers[key] = value
    }
  }
  forwarded_headers['host'] = TARGET_HOST
  forwarded_headers['user-agent'] = USER_AGENT
  forwarded_headers['accept'] = 'application/json'
  forwarded_headers['accept-language'] = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: target_url.pathname + target_url.search,
    method: req.method,
    headers: forwarded_headers,
    timeout: 30_000,
  }

  log(`→ ${req.method} ${options.path}`)

  const proxy_req = https.request(options, (proxy_res) => {
    log(`← ${proxy_res.statusCode} ${options.path}`)

    // Repassa CORS para que o backend consiga consumir normalmente
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    res.writeHead(proxy_res.statusCode, proxy_res.headers)
    proxy_res.pipe(res, { end: true })
  })

  proxy_req.on('timeout', () => {
    log(`✗ timeout ${options.path}`)
    proxy_req.destroy()
    if (!res.headersSent) {
      res.writeHead(504)
      res.end('Gateway Timeout')
    }
  })

  proxy_req.on('error', (err) => {
    log(`✗ erro ${options.path}: ${err.message}`)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end('Bad Gateway')
    }
  })

  req.pipe(proxy_req, { end: true })
})

server.listen(PORT, () => {
  log(`PJE proxy ouvindo em http://localhost:${PORT}`)
  log(`Alvo: ${TARGET_BASE}`)
  log(`Health check: http://localhost:${PORT}/health`)
})
