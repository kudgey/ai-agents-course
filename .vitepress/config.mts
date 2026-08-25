import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Прикладні ШІ-агенти',
  description: 'Магістерський курс: прикладні ШІ-агенти та системи на основі великих мовних моделей. КПІ, спеціальність 122.',
  lang: 'uk-UA',
  // GitHub Pages у підкаталозі вимагає base='/<репозиторій>/'.
  // Задається змінною оточення, тому той самий код працює і на власному домені.
  base: process.env.BASE ?? '/',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    math: true,
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'github-dark' },
    image: { lazyLoading: true }
  },
  head: [
    ['meta', { name: 'theme-color', content: '#3D4EC4' }],
    ['meta', { property: 'og:title', content: 'Прикладні ШІ-агенти та системи на основі LLM' }],
  ],
  themeConfig: {
    outline: { level: [2, 3], label: 'На цій сторінці' },
    nav: [
      { text: 'Лекції', link: '/lectures/01' },
      { text: 'Лабораторні', link: '/labs' },
      { text: 'Про курс', link: '/about' }
    ],
    sidebar: [
      { text: 'Курс', items: [
        { text: 'Огляд і структура', link: '/' },
        { text: 'Лабораторні роботи', link: '/labs' },
        { text: 'Про курс і джерела', link: '/about' }
      ]},
    {
      text: "Блок A · Модель як компонент системи",
      collapsed: false,
      items: [
        { text: "01 · Велика мовна модель: архітектура Transformer і…", link: "/lectures/01" },
        { text: "02 · Токени, embeddings і attention: що модель бачить на…", link: "/lectures/02" },
        { text: "03 · Як навчають модель: pre-training, вирівнювання та…", link: "/lectures/03" },
        { text: "04 · Промпт-інженерія та керування контекстом", link: "/lectures/04" },
        { text: "05 · Structured outputs: як зробити відповідь моделі…", link: "/lectures/05" }
      ]
    },
    {
      text: "Блок B · Знання поза вагами: RAG",
      collapsed: false,
      items: [
        { text: "06 · Векторний пошук: як знайти потрібний фрагмент серед…", link: "/lectures/06" },
        { text: "07 · Архітектура RAG: від документа до відповіді з цитатою", link: "/lectures/07" },
        { text: "08 · Якість RAG: переписування запиту, реранкування та…", link: "/lectures/08" }
      ]
    },
    {
      text: "Блок C · Де і за скільки виконується",
      collapsed: false,
      items: [
        { text: "09 · Локальні та відкриті моделі: пам'ять, квантизація,…", link: "/lectures/09" },
        { text: "10 · Production-архітектура LLM-сервісу: потужність, кеші,…", link: "/lectures/10" }
      ]
    },
    {
      text: "Блок D · Агент як керований цикл",
      collapsed: false,
      items: [
        { text: "11 · Агент як керований цикл: стан, бюджети, межа автономії", link: "/lectures/11" },
        { text: "12 · Tool use і ReAct: як модель просить систему діяти", link: "/lectures/12" },
        { text: "13 · MCP і A2A: спільний протокол замість власних…", link: "/lectures/13" },
        { text: "14 · Пам'ять агента і довготривалі процеси", link: "/lectures/14" },
        { text: "15 · Графові агенти: явний стан, checkpoint і людина в…", link: "/lectures/15" }
      ]
    },
    {
      text: "Блок E · Масштаб, докази, ризик",
      collapsed: false,
      items: [
        { text: "16 · Мультиагентні системи: коли другий агент окупається", link: "/lectures/16" },
        { text: "17 · Оцінювання та observability agentic-систем", link: "/lectures/17" },
        { text: "18 · Безпека агентів і доказ готовності системи", link: "/lectures/18" }
      ]
    }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kudgey/ai-agents-course-figures' }
    ],
    docFooter: { prev: 'Попередня лекція', next: 'Наступна лекція' },
    darkModeSwitchLabel: 'Тема',
    lightModeSwitchTitle: 'Світла тема',
    darkModeSwitchTitle: 'Темна тема',
    sidebarMenuLabel: 'Розділи',
    returnToTopLabel: 'Догори',
    lastUpdatedText: 'Оновлено',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Пошук', buttonAriaLabel: 'Пошук' },
          modal: {
            noResultsText: 'Нічого не знайдено',
            resetButtonTitle: 'Очистити',
            footer: { selectText: 'вибрати', navigateText: 'навігація', closeText: 'закрити' }
          }
        }
      }
    },
    footer: {
      message: 'Матеріали курсу. Схеми з зовнішніх джерел належать їхнім авторам — посилання під кожною ілюстрацією.',
      copyright: 'КПІ ім. Ігоря Сікорського · спеціальність 122 · 2026/2027'
    }
  },
  vite: { server: { fs: { allow: ['..'] } } }
})
