<script setup lang="ts">
/**
 * Пошук BM25 по корпусу лекції 07 (10 чанків: роз'яснення ДПС, ПКУ, закон про бюджет).
 * Формула — спільна lib/bm25.js; gen_lec07.py --check викликає її через node і звіряє
 * з Python, тож на канонічному питанні тут ті самі 4.363, 3.485, 2.367, що в табл. 3.
 * Фільтр за роком прибирає чанки іншого року ДО пошуку — так само, як код 2.1.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec07.json'
import { buildIndex, score, tokenize } from '../lib/bm25.js'

type Chunk = { chunk_id: string; doc_id: string; section: string; version: number; text: string }
const CORPUS = data.widget.search_corpus as Chunk[]
const PRESETS = data.widget.presets as string[]
const K1 = data.widget.k1, B = data.widget.b

const query = ref(PRESETS[0])
const filter = ref(true)
const k = ref(5)
const open = ref<string | null>(null)

const year = computed(() => Number((query.value.match(/\b(20\d\d)\b/) || [])[1]) || 2026)
const pool = computed(() => (filter.value ? CORPUS.filter((c) => c.version === year.value) : CORPUS))
const outside = computed(() => CORPUS.filter((c) => !pool.value.includes(c)))
// кожне слово запиту рахується один раз — як у генераторі
const terms = computed(() => [...new Set(tokenize(query.value))])
const COLORS = ['#B4531F', '#2E6B4F', '#3D4EC4', '#7A4BB0', '#2C8C99', '#9A9AA8', '#C0892B', '#5B7A99', '#A0567A', '#6B8E23']
const color = (t: string) => COLORS[terms.value.indexOf(t) % COLORS.length]

const ranked = computed(() => {
  const idx = buildIndex(pool.value.map((c) => c.text))
  return score(idx, terms.value.join(' '), K1, B)
    .map((r) => ({ ...r, c: pool.value[r.i] }))
    .sort((x, y) => y.score - x.score)
})
const maxScore = computed(() => Math.max(...ranked.value.map((r) => r.score), 1e-9))

function snippet(text: string) {
  return text.split(/([\p{L}\p{N}_]+)/u).map((w) => ({ w, t: terms.value.includes(w.toLowerCase()) ? w.toLowerCase() : null }))
}
const short = (c: Chunk) => (c.section === 'без номера пункту' ? c.doc_id : `${c.doc_id}, ${c.section}`)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Пошук BM25 по документах ФОП</div>
        <div class="lab__sub">
          Оберіть питання або напишіть своє. Смуга — score чанка, кольори — внесок кожного слова
          запиту; перші k чанків ідуть у промпт. Вимкніть фільтр за роком — і побачите,
          куди стане роз'яснення 2025 року.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p" class="lab__pill" :class="{ 'is-on': query === p }" @click="query = p">{{ p }}</button>
    </div>
    <div class="lab__controls">
      <label class="lab__ctl fs__q">
        <span>Питання</span>
        <input v-model="query" type="text" />
      </label>
      <label class="lab__ctl">
        <span>Фільтр до пошуку: <b>{{ filter ? `version == ${year}` : 'вимкнено' }}</b></span>
        <select v-model="filter"><option :value="true">увімкнено</option><option :value="false">вимкнено</option></select>
      </label>
      <label class="lab__ctl">
        <span>У промпт: top-<b>{{ k }}</b></span>
        <input v-model.number="k" type="range" min="1" max="8" step="1" />
      </label>
    </div>

    <div class="fs__terms">
      <span v-for="t in terms" :key="t" class="fs__term" :style="{ borderColor: color(t), color: color(t) }">{{ t }}</span>
    </div>

    <div class="fs__list">
      <div v-for="(r, i) in ranked" :key="r.c.chunk_id" class="fs__row" :class="{ 'is-top': i < k }">
        <button class="fs__line" @click="open = open === r.c.chunk_id ? null : r.c.chunk_id">
          <span class="fs__rank">{{ i + 1 }}</span>
          <span class="fs__id">
            <b>{{ r.c.chunk_id }}</b>
            <em :class="{ 'is-old': r.c.version !== 2026 }">{{ short(r.c) }}</em>
          </span>
          <span class="fs__bar">
            <span v-for="p in r.parts.filter((p) => p.v > 0)" :key="p.t" :style="{ width: (100 * p.v) / maxScore + '%', background: color(p.t) }" :title="`${p.t}: ${p.v.toFixed(3)} (tf ${p.tf}, df ${p.df})`" />
          </span>
          <span class="fs__score">{{ r.score.toFixed(3) }}</span>
        </button>
        <p v-if="open === r.c.chunk_id" class="fs__text">
          <template v-for="(s, j) in snippet(r.c.text)" :key="j">
            <mark v-if="s.t" :style="{ color: color(s.t) }">{{ s.w }}</mark><template v-else>{{ s.w }}</template>
          </template>
        </p>
      </div>
      <div v-for="c in outside" :key="c.chunk_id" class="fs__row is-out">
        <div class="fs__line">
          <span class="fs__rank">—</span>
          <span class="fs__id"><b>{{ c.chunk_id }}</b><em class="is-old">{{ short(c) }}</em></span>
          <span class="fs__outlbl">відсіяно фільтром до пошуку: version {{ c.version }}</span>
        </div>
      </div>
    </div>

    <p class="lab__note">
      На канонічному питанні перше місце дає слово «ліміт»: воно є лише в роз'ясненні Рівне.
      Закон про бюджет виходить третім за «який» і «2026», хоча про ліміт у ньому нічого.
      Спитайте словами закону («максимальний обсяг доходу третьої групи») — і першими стануть
      чанки ПКУ. Клацніть рядок, щоб побачити текст чанка з підсвіченими словами запиту.
    </p>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.fs__q { grid-column: 1 / -1; }
.fs__terms { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.8rem 0 0.4rem; }
.fs__term { font-size: 0.74rem; border: 1px solid; border-radius: 999px; padding: 0.05rem 0.5rem; font-weight: 600; }
.fs__list { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.5rem; }
.fs__row { border: 1px solid var(--uk-line); border-radius: 8px; opacity: 0.55; }
.fs__row.is-top { opacity: 1; border-color: var(--uk-accent); }
.fs__row.is-out { opacity: 0.45; border-style: dashed; }
.fs__line { display: grid; grid-template-columns: 1.6rem minmax(0, 13rem) minmax(0, 1fr) 3.4rem; gap: 0.6rem; align-items: center;
  width: 100%; padding: 0.4rem 0.6rem; background: none; border: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.fs__rank { font-family: var(--vp-font-family-mono); font-size: 0.75rem; color: var(--vp-c-text-3); }
.fs__id { display: flex; flex-direction: column; min-width: 0; }
.fs__id b { font-family: var(--vp-font-family-mono); font-size: 0.76rem; font-weight: 600; }
.fs__id em { font-style: normal; font-size: 0.7rem; color: var(--vp-c-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fs__id em.is-old { color: var(--uk-warm); }
.fs__bar { display: flex; height: 0.85rem; border-radius: 3px; overflow: hidden; background: var(--uk-fill); }
.fs__bar span { height: 100%; border-right: 1px solid var(--vp-c-bg); }
.fs__score { font-family: var(--vp-font-family-mono); font-size: 0.76rem; text-align: right; font-variant-numeric: tabular-nums; }
.fs__outlbl { grid-column: 3 / 5; font-size: 0.72rem; color: var(--uk-warm); }
.fs__text { margin: 0; padding: 0.2rem 0.8rem 0.7rem 2.8rem; font-size: 0.76rem; line-height: 1.5; white-space: pre-wrap; color: var(--vp-c-text-2); }
.fs__text mark { background: none; font-weight: 700; }
@media (max-width: 640px) {
  .fs__line { grid-template-columns: 1.3rem minmax(0, 1fr) 3rem; }
  .fs__bar { grid-column: 2 / 4; grid-row: 2; }
  .fs__outlbl { grid-column: 2 / 4; }
}
</style>
