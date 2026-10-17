import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// 允许在含有企业自签证书或开发代理的环境中正常连通
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function llmProxyPlugin(): Plugin {

  return {
    name: 'llm-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/llm-proxy', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', '*')
          res.statusCode = 200
          res.end()
          return
        }

        const targetUrl = (req.headers['x-target-url'] as string) || ''
        if (!targetUrl) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing x-target-url header' }))
          return
        }

        try {
          const auth = req.headers['authorization'] || ''
          const anthropicKey = req.headers['x-api-key'] || ''
          const anthropicVer = req.headers['anthropic-version'] || ''

          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }
          const body = Buffer.concat(chunks)

          const forwardHeaders: Record<string, string> = {
            'Content-Type': (req.headers['content-type'] as string) || 'application/json',
          }
          if (auth) forwardHeaders['Authorization'] = auth as string
          if (anthropicKey) forwardHeaders['x-api-key'] = anthropicKey as string
          if (anthropicVer) forwardHeaders['anthropic-version'] = anthropicVer as string

          const upstreamRes = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
          })

          res.statusCode = upstreamRes.status
          upstreamRes.headers.forEach((val, key) => {
            if (key.toLowerCase() !== 'content-encoding') {
              res.setHeader(key, val)
            }
          })
          res.setHeader('Access-Control-Allow-Origin', '*')

          if (upstreamRes.body) {
            const reader = upstreamRes.body.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err)
          res.statusCode = 502
          res.end(JSON.stringify({ error: errMsg || 'Proxy Error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), llmProxyPlugin()],
})
