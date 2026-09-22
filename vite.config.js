import {defineConfig} from 'vite';

export default defineConfig({
  base: '/adc-voice-demo/',
  build: {rollupOptions: {input: {main: 'index.html', behind: 'behind.html'}}},
});
