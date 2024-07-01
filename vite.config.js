import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(import.meta.dirname, 'lib/binarypack.ts'),
      name: 'BinaryPack',
      // the proper extensions will be added
      fileName: 'binarypack',
    },
  },
})