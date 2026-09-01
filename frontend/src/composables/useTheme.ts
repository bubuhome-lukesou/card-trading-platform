import { ref, watch } from 'vue'

type Theme = 'dark' | 'light'

const theme = ref<Theme>(localStorage.getItem('theme') as Theme || 'dark')

const applyTheme = (t: Theme) => {
  const html = document.documentElement
  if (t === 'light') {
    html.classList.add('light')
  } else {
    html.classList.remove('light')
  }
}

// Apply on load
applyTheme(theme.value)

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', theme.value)
    applyTheme(theme.value)
  }

  const setTheme = (t: Theme) => {
    theme.value = t
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return { theme, toggleTheme, setTheme }
}