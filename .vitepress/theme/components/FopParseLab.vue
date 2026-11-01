<script setup lang="ts">
/**
 * Парсинг роз'яснення ДПС: що повернув pypdf, що прибрало очищення і як пункт списку
 * стає самодостатнім реченням. Текст — справжній вивід pypdf, який пише gen_lec07.py
 * у lec07.json; правила шуму ті самі, що в коді лекції (NOISE).
 */
import { ref, computed } from 'vue'
import data from '../../data/lec07.json'

const RAW: string = data.widget.hero_raw
const LINES = RAW.split('\n')

/** Та сама регулярка NOISE, що в коді 2.2, — і пояснення, звідки рядок узявся. */
function why(line: string): string | null {
  const s = line.trim()
  if (/^\d{2}\.\d{2}\.\d{4} /.test(s)) return 'поле друку браузера: дата і назва сторінки'
  if (/https?:\/\//.test(s)) return s.endsWith('1/1') ? 'поле друку браузера: адреса і номер аркуша' : 'підвал сайту: адреса сторінки'
  if (/^©/.test(s)) return 'підвал сайту'
  if (/Офіційний портал$/.test(s)) return 'шаблон сайту'
  return null
}

const MODES = [
  { id: 'raw', label: '1 · Що повернув pypdf' },
  { id: 'clean', label: '2 · Після очищення' },
  { id: 'list', label: '3 · Пункт списку → речення' },
]
const mode = ref('raw')

const rows = computed(() => {
  if (mode.value === 'raw') return LINES.map((s) => ({ s, tag: why(s) }))
  const clean = LINES.filter((s) => !why(s))
  if (mode.value === 'clean') return clean.map((s) => ({ s, tag: null }))
  let group = ''
  return clean.map((s) => {
    const m = s.match(/ФОП (\d) група:/)
    if (m) { group = `ФОП ${m[1]} група: `; return { s, tag: null, head: true } }
    const item = group && s.trim() && /^(ліміт|єдиний|ЄСВ|військовий)/.test(s.trim())
    return item ? { s: group + s.trim(), tag: null, added: group } : { s, tag: null }
  })
})

const dropped = computed(() => LINES.filter((s) => why(s)).length)
const hit = (s: string) => s.includes('10 091 049')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Парсинг роз'яснення ДПС: до і після</div>
        <div class="lab__sub">
          Справжній текст, який бібліотека pypdf дістала з PDF, збереженого з сайту ДПС.
          Перемикайте етапи й дивіться, що прибирає очищення і як пункт списку стає реченням.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="m in MODES" :key="m.id" class="lab__pill" :class="{ 'is-on': mode === m.id }" @click="mode = m.id">
        {{ m.label }}
      </button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ LINES.length }}</b><span>рядків повернув парсер</span></div>
      <div class="lab__stat is-warm"><b>{{ dropped }}</b><span>рядків шуму: шаблон сайту і поля друку</span></div>
      <div class="lab__stat is-green"><b>{{ LINES.length - dropped }}</b><span>рядків змісту</span></div>
    </div>

    <div class="fp__doc">
      <div v-for="(r, i) in rows" :key="i" class="fp__line" :class="{ 'is-noise': r.tag, 'is-hit': hit(r.s), 'is-head': r.head }">
        <span class="fp__text"><b v-if="r.added" class="fp__added">{{ r.added }}</b>{{ r.added ? r.s.slice(r.added.length) : r.s || ' ' }}</span>
        <span v-if="r.tag" class="fp__tag">{{ r.tag }}</span>
      </div>
    </div>

    <p class="lab__note" v-if="mode === 'raw'">
      Червоним — рядки, яких немає в самому роз'ясненні: їх додали шаблон сайту і браузер під час друку.
    </p>
    <p class="lab__note" v-else-if="mode === 'clean'">
      Документ односторінковий, тому правило «рядок, що повторюється на всіх сторінках» не спрацює:
      шум прибирають правилами шаблону конкретного сайту. Рядок із числом підсвічено — номера групи в ньому немає.
    </p>
    <p class="lab__note" v-else>
      Кожен пункт списку отримав свій заголовок: тепер рядок «ФОП 3 група: ліміт річного доходу — 10 091 049 грн»
      зрозумілий сам по собі, де б не пройшла межа чанка. У прикладі лекції цього кроку не застосовано
      (межа чанка пройшла після списку); у сервісі з тисячами документів його роблять завжди.
    </p>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.fp__doc {
  margin-top: 1rem;
  border: 1px solid var(--uk-line);
  border-radius: 10px;
  padding: 0.6rem 0.2rem;
  background: var(--uk-fill);
  max-height: 26rem;
  overflow-y: auto;
}
.fp__line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.6rem;
  align-items: baseline;
  padding: 0.12rem 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  line-height: 1.55;
}
.fp__line.is-noise { background: var(--uk-warm-soft); }
.fp__line.is-noise .fp__text { text-decoration: line-through; color: var(--uk-warm); }
.fp__line.is-hit { background: var(--uk-accent-soft); }
.fp__line.is-head .fp__text { font-weight: 700; }
.fp__tag {
  font-family: var(--vp-font-family-base);
  font-size: 0.7rem;
  color: var(--uk-warm);
  border: 1px solid var(--uk-warm);
  border-radius: 999px;
  padding: 0 0.45rem;
}
.fp__added { color: var(--uk-green); }
</style>
