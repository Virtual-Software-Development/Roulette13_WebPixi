const required = ['VITE_API_URL', 'VITE_API_KEY'] as const

for (const key of required) {
  if (!import.meta.env[key]) {
    console.error(`Missing required environment variable: ${key}. Copy .env.example to .env and fill in a value.`)
  }
}

export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  apiKey: import.meta.env.VITE_API_KEY,
} as const
