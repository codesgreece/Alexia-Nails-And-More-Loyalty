import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    sequence: { concurrent: false }
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared')
    }
  }
})
