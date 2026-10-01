import process from 'node:process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Content-Security-Policy and other security headers for the built site.
 * `connect-src` includes the API origin from VITE_API_URL, so the policy
 * always matches the deployment it was built for.
 */
function securityHeaders(apiUrl) {
  let apiOrigin = ''
  try {
    apiOrigin = apiUrl ? new URL(apiUrl).origin : ''
  } catch {
    throw new Error(`VITE_API_URL is not a valid URL: ${apiUrl}`)
  }
  const csp = [
    "default-src 'self'",
    // Razorpay checkout is the only third-party script.
    "script-src 'self' https://checkout.razorpay.com",
    // React style={{...}} attributes need 'unsafe-inline' for styles (not scripts).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.razorpay.com",
    `connect-src 'self' ${apiOrigin} https://*.razorpay.com`.replace(/\s+/g, ' '),
    'frame-src https://*.razorpay.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')

  return {
    'Content-Security-Policy': csp,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}

/** Writes dist/_headers (Netlify / Cloudflare Pages format) at build time. */
function headersFile(headers) {
  return {
    name: 'security-headers-file',
    apply: 'build',
    closeBundle() {
      const lines = ['/*', ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`), '']
      // Hashed build assets never change, so they can be cached for a year.
      lines.push('/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '')
      writeFileSync(resolve('dist', '_headers'), lines.join('\n'))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const headers = securityHeaders(env.VITE_API_URL)
  const proxy = {
    '/api': {
      target: process.env.API_URL || 'http://localhost:3000', // Axum backend
      changeOrigin: true,
    },
  }

  return {
    plugins: [react(), headersFile(headers)],
    // No CSP on the dev server: Vite's hot reload injects inline scripts.
    server: { proxy },
    // `npm run preview` serves the production build with the same headers.
    preview: { proxy, headers },
  }
})
