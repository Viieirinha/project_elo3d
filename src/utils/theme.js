const THEME_KEY = 'elo3d-theme-v1'

export function getTheme() {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem(THEME_KEY, theme)
}
