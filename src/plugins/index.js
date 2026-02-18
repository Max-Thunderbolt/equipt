/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins (Pinia first so router guards can use stores)
import pinia from '@/stores/pinia'
import router from '@/router'
import vuetify from './vuetify'

export function registerPlugins (app) {
  app
    .use(pinia)
    .use(router)
    .use(vuetify)
}
