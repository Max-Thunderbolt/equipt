import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'equipt',
    themes: {
      equipt: {
        dark: true,
        colors: {
          background: '#000000',
          surface: '#0a0a0a',
          primary: '#ED963E',
          'primary-darken-1': '#d9822e',
          secondary: '#7979b7',
          error: '#ef4444',
          info: '#7dd3fc',
          success: '#22c55e',
          warning: '#f59e0b',
        },
      },
    },
  },
  typography: {
    fontFamily: "'Atkinson Hyperlegible', sans-serif",
  },
})
