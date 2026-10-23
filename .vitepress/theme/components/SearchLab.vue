<script setup lang="ts">
/**
 * «BM25 вживую» на шести фрагментах лекції 06: токени запиту → зворотний індекс →
 * idf → частка насичення → внески → ранжування. Формула — спільна функція lib/bm25.js,
 * яку gen_lec06_toy.py --check звіряє з Python. За замовчуванням — останній крок
 * з основним питанням лекції: ті самі 1.533, 1.166, 0.629, що в тексті.
 */
import { ref, computed, watch } from 'vue'
import data from '../../data/lec06_toy.json'
import { buildIndex, score, share, tokenize } from '../lib/bm25.js'
import { useStepper } from '../composables/useStepper'
import StepControls from './StepControls.vue'

const DOCS = data.docs as { id: string; topic: string; text: string }[]
const QUERIES = data.queries as string[]
const INDEX = buildIndex(DOCS.map((d) => d.text))

const query = ref(QUERIES[1])
const k1 = ref(data.k1)
const b = ref(data.b)

const STAGES = ['токени запиту', 'зворотний індекс', 'idf', 'частка насичення', 'внески', 'ранжування']
const { step, playing, reduced, next, play, reset, jump, done } = useStepper(() => STAGES.length - 1, { interval: 1000 })
watch(query, () => jump(STAGES.length - 1))

const terms = computed(() => [...new Set(tokenize(query.value))])
const color = (t: string) => `var(--t${terms.value.indexOf(t) % 5})`
const postings = computed(() => terms.value.map((t) => ({
  t, df: INDEX.df(t), idf: INDEX.df(t) ? Math.log(INDEX.N / INDEX.df(t)) : 0,
  docs: DOCS.filter((_, i) => INDEX.docs[i].includes(t)).map((d) => d.id),
})))
const maxIdf = Math.log(INDEX.N)

const scored = computed(() => score(INDEX, query.value, k1.value, b.value).map((r) => ({ ...r, doc: DOCS[r.i] })))
const ordered = computed(() => (step.value >= 5
  ? [...scored.value].sort((x, y) => y.score - x.score || x.doc.id.localeCompare(y.doc.id))
  : scored.value))
const maxScore = computed(() => Math.max(...scored.value.map((s) => s.score), 1e-9))

/** Текст фрагмента, розбитий на слова й проміжки, з позначкою збігу з термом запиту. */
function pieces(text: string) {
  return text.split(/([\p{L}\p{N}_]+)/u).filter(Boolean).map((w) => ({ w, t: terms.value.includes(w.toLowerCase()) ? w.toLowerCase() : null }))
}

// ── міні-графік насичення: частка від tf для середньої і подвоєної довжини ──
const CW = 260, CH = 140, PAD = 26
const cx = (tf: number) => PAD + (tf / 10) * (CW - PAD - 8)
const cy = (v: number) => CH - PAD + 4 - v * (CH - PAD - 10)
function curve(lenRatio: number) {
  let d = ''
  for (let tf = 0; tf <= 10; tf += 0.25) d += `${tf ? 'L' : 'M'}${cx(tf).toFixed(1)},${cy(share(tf, lenRatio * INDEX.avg, INDEX.avg, k1.value, b.value)).toFixed(1)}`
  return d
}
const points = computed(() => scored.value.flatMap((r) => r.parts.filter((p) => p.tf).map((p) => ({ id: r.doc.id, t: p.t, tf: p.tf, v: p.share }))))

const mode = computed(() => {
  if (k1.value === 0) return 'k₁ = 0: частка дорівнює 1 для будь-якої ненульової частоти — лишається сама idf'
  if (b.value === 0) return 'b = 0: довжина фрагмента не враховується зовсім'
  if (b.value >= 0.999) return 'b = 1: повна нормалізація за довжиною — довгі фрагменти втрачають найбільше'
  return null
})
</script>

<template>
  <div class="lab sl">
    <div class="lab__head">
      <div>
        <div class="lab__title">BM25 вживую: від запиту до видачі</div>
        <div class="lab__sub">
          Ті самі шість фрагментів і та сама формула, що в ручному розрахунку. Проведіть
          запит крок за кроком або змініть параметри — видача перераховується повністю.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="q in QUERIES" :key="q" class="lab__pill" :class="{ 'is-on': query === q }" @click="query = q">{{ q }}</button>
    </div>
    <input v-model="query" class="sl__input" spellcheck="false" placeholder="свій запит…" />

    <StepControls :playing="playing" :reduced="reduced" :done="done" @step="next" @play="play" @reset="reset" />
    <ol class="sl__rail">
      <li v-for="(s, i) in STAGES" :key="s" :class="{ 'is-pass': i < step, 'is-now': i === step }" @click="jump(i)">{{ i + 1 }} · {{ s }}</li>
    </ol>

    <div class="sl__grid">
      <section>
        <div class="sl__h">Терми запиту і зворотний індекс</div>
        <div class="sl__terms">
          <span v-for="p in postings" :key="p.t" class="sl__chip" :class="{ 'is-miss': step >= 1 && !p.df }"
                :style="{ '--c': color(p.t) }">{{ p.t }}</span>
        </div>
        <div v-for="p in postings" :key="'r' + p.t" class="sl__post" :class="{ 'is-hidden': step < 1 }">
          <code class="sl__term" :style="{ color: p.df ? color(p.t) : '' }">{{ p.t }}</code>
          <span class="sl__arrow">→</span>
          <span v-if="!p.df" class="sl__none">немає в жодному фрагменті</span>
          <span v-for="d in p.docs" :key="d" class="sl__doc" :style="{ '--c': color(p.t) }">{{ d }}</span>
          <span class="sl__idf" :class="{ 'is-hidden': step < 2 }">
            <span class="sl__idfbar"><i :style="{ width: (p.idf / maxIdf) * 100 + '%', background: color(p.t) }" /></span>
            idf {{ p.idf.toFixed(2) }}
          </span>
        </div>

        <div class="sl__h sl__h--chart" :class="{ 'is-hidden': step < 3 }">Частка насичення tf / (k₁(1 − b + b·|d|/avg) + tf)</div>
        <svg :viewBox="`0 0 ${CW} ${CH}`" class="sl__chart" :class="{ 'is-hidden': step < 3 }" role="img" aria-label="Частка насичення від частоти терма">
          <line :x1="PAD" :x2="CW - 8" :y1="cy(1)" :y2="cy(1)" class="sl__grid1" />
          <line :x1="PAD" :x2="CW - 8" :y1="cy(0)" :y2="cy(0)" class="sl__axis" />
          <path :d="curve(1)" class="sl__curve" />
          <path :d="curve(2)" class="sl__curve sl__curve--long" />
          <circle v-for="pt in points" :key="pt.id + pt.t" :cx="cx(pt.tf)" :cy="cy(pt.v)" r="3.5" :style="{ fill: color(pt.t) }" />
          <text :x="PAD - 4" :y="cy(1) + 3" class="sl__lbl" text-anchor="end">1</text>
          <text :x="PAD - 4" :y="cy(0) + 3" class="sl__lbl" text-anchor="end">0</text>
          <text v-for="t in [1, 5, 10]" :key="t" :x="cx(t)" :y="CH - 6" class="sl__lbl" text-anchor="middle">tf = {{ t }}</text>
        </svg>
        <div class="sl__legend" :class="{ 'is-hidden': step < 3 }">
          <span><i class="sl__sw" /> середня довжина</span>
          <span><i class="sl__sw sl__sw--long" /> удвічі довший</span>
          <span>точки — збіги у фрагментах (tf = 1)</span>
        </div>
      </section>

      <section>
        <div class="sl__h">Фрагменти{{ step >= 5 ? ' — за скором' : '' }}<span v-if="step >= 3" class="sl__hint"> · {{ step >= 4 ? 'частка × idf = внесок' : 'частка насичення' }} для кожного збігу</span></div>
        <TransitionGroup name="sl-move" tag="div" class="sl__list">
          <div v-for="(r, rank) in ordered" :key="r.doc.id" class="sl__item" :class="{ 'is-zero': step >= 4 && r.score === 0 }">
            <span class="sl__rank">{{ step >= 5 ? rank + 1 : '·' }}</span>
            <div class="sl__body">
              <div class="sl__text"><b>{{ r.doc.id }}</b>
                <template v-for="(pc, k) in pieces(r.doc.text)" :key="k"><mark v-if="pc.t && step >= 1" :style="{ '--c': color(pc.t) }">{{ pc.w }}</mark><template v-else>{{ pc.w }}</template></template>
              </div>
              <div v-if="step >= 3" class="sl__meta">
                <span>{{ r.len }} токенів</span>
                <template v-for="p in r.parts" :key="p.t">
                  <span v-if="p.tf" class="sl__part" :style="{ '--c': color(p.t) }">{{ p.share.toFixed(3) }}<template v-if="step >= 4"> × {{ p.idf.toFixed(2) }} = {{ p.v.toFixed(3) }}</template></span>
                </template>
              </div>
              <div v-if="step >= 4" class="sl__stack">
                <i v-for="p in r.parts.filter((q) => q.v > 0)" :key="p.t" :style="{ width: (p.v / maxScore) * 100 + '%', background: color(p.t) }" />
              </div>
            </div>
            <b v-if="step >= 4" class="sl__score">{{ r.score.toFixed(3) }}</b>
          </div>
        </TransitionGroup>
      </section>
    </div>

    <div class="lab__controls sl__ctl">
      <label class="lab__ctl"><span>Насичення частоти <b>k₁ = {{ k1.toFixed(1) }}</b></span>
        <input v-model.number="k1" type="range" min="0" max="3" step="0.1" /></label>
      <label class="lab__ctl"><span>Нормалізація довжини <b>b = {{ b.toFixed(2) }}</b></span>
        <input v-model.number="b" type="range" min="0" max="1" step="0.01" /></label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" @click="k1 = 0">k₁ = 0</button>
      <button class="lab__pill" @click="b = 0">b = 0</button>
      <button class="lab__pill" @click="b = 1">b = 1</button>
      <button class="lab__pill" @click="k1 = data.k1; b = data.b">як у тексті: 1.5 / 0.75</button>
    </div>
    <div v-if="mode" class="sl__edge">{{ mode }}</div>

    <p class="lab__note">
      Що тут видно: d6 стоїть другою лише через «з бази даних», а d3 має нуль, бо
      «перескладанням» для BM25 — інше слово. На графіку точки однакових tf лежать на
      різній висоті: довший фрагмент отримує меншу частку.
    </p>
  </div>
</template>

<style scoped>
.sl { --t0: var(--uk-accent); --t1: #8b5cf6; --t2: #0d9488; --t3: #c2410c; --t4: #db2777; }
.sl__input {
  width: 100%; font-family: var(--vp-font-family-base); font-size: 0.92rem; padding: 0.5rem 0.7rem;
  border: 1px solid var(--uk-line); border-radius: 8px; background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1); margin-bottom: 0.8rem;
}
.sl__input:focus { outline: none; border-color: var(--uk-accent); }
.sl__rail { display: flex; flex-wrap: wrap; gap: 0.3rem; list-style: none; padding: 0; margin: 0 0 0.9rem; }
.sl__rail li { margin: 0; font-size: 0.74rem; padding: 0.2rem 0.55rem; border-radius: 999px; border: 1px solid var(--uk-line); color: var(--vp-c-text-3); cursor: pointer; }
.sl__rail li.is-pass { border-color: var(--uk-green); color: var(--uk-green); }
.sl__rail li.is-now { background: var(--uk-accent); border-color: var(--uk-accent); color: #fff; }
.sl__grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 1.2rem; }
.sl__h { font-size: 0.76rem; font-weight: 600; color: var(--vp-c-text-2); margin-bottom: 0.45rem; }
.sl__h--chart { margin-top: 1rem; }
.is-hidden { opacity: 0.12; }
.sl__terms { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.6rem; }
.sl__chip { font-family: var(--vp-font-family-mono); font-size: 0.76rem; padding: 0.15rem 0.45rem; border-radius: 6px; border: 1.5px solid var(--c); color: var(--c); }
.sl__chip.is-miss { border-style: dashed; opacity: 0.5; }
.sl__post { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; margin: 0.3rem 0; font-size: 0.78rem; transition: opacity 0.35s ease; }
.sl__term { font-size: 0.76rem; font-weight: 600; }
.sl__arrow { color: var(--vp-c-text-3); }
.sl__none { color: var(--vp-c-text-3); font-size: 0.74rem; }
.sl__doc { font-family: var(--vp-font-family-mono); font-size: 0.72rem; padding: 0.05rem 0.35rem; border-radius: 4px; background: var(--uk-fill); border-left: 3px solid var(--c); }
.sl__idf { display: inline-flex; align-items: center; gap: 0.35rem; margin-left: auto; font-family: var(--vp-font-family-mono); font-size: 0.72rem; color: var(--vp-c-text-2); transition: opacity 0.35s ease; }
.sl__idfbar { width: 3.5rem; height: 6px; background: var(--uk-fill); border-radius: 3px; overflow: hidden; display: inline-block; }
.sl__idfbar i { display: block; height: 100%; }
.sl__chart { width: 100%; max-width: 360px; height: auto; display: block; transition: opacity 0.35s ease; }
.sl__axis { stroke: var(--uk-line); }
.sl__grid1 { stroke: var(--uk-line); stroke-dasharray: 3 3; }
.sl__curve { fill: none; stroke: var(--vp-c-text-2); stroke-width: 1.8; }
.sl__curve--long { stroke-dasharray: 5 4; }
.sl__lbl { font-size: 9px; fill: var(--vp-c-text-3); }
.sl__legend { display: flex; flex-wrap: wrap; gap: 0.2rem 0.8rem; font-size: 0.72rem; color: var(--vp-c-text-3); transition: opacity 0.35s ease; }
.sl__sw { display: inline-block; width: 1.1rem; height: 0; border-top: 2px solid var(--vp-c-text-2); vertical-align: 0.2rem; margin-right: 0.2rem; }
.sl__sw--long { border-top-style: dashed; }
.sl__list { display: flex; flex-direction: column; gap: 0.35rem; }
.sl__item { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.5rem 0.6rem; border: 1px solid var(--uk-line); border-radius: 8px; transition: opacity 0.3s ease; }
.sl__item.is-zero { opacity: 0.42; }
.sl-move-move { transition: transform 0.45s ease; }
.sl__rank { font-family: var(--vp-font-family-mono); font-size: 0.75rem; color: var(--vp-c-text-3); width: 0.9rem; flex: none; }
.sl__body { flex: 1; min-width: 0; }
.sl__text { font-size: 0.82rem; line-height: 1.45; }
.sl__text b { font-family: var(--vp-font-family-mono); font-size: 0.74rem; color: var(--vp-c-text-2); margin-right: 0.15rem; }
.sl__text mark { background: transparent; color: inherit; border-bottom: 2.5px solid var(--c); padding: 0 0.05rem; }
.sl__meta { display: flex; flex-wrap: wrap; gap: 0.2rem 0.4rem; margin-top: 0.25rem; font-family: var(--vp-font-family-mono); font-size: 0.66rem; color: var(--vp-c-text-3); }
.sl__part { color: var(--vp-c-text-2); border-left: 3px solid var(--c); padding-left: 0.25rem; }
.sl__hint { font-weight: 400; color: var(--vp-c-text-3); }
.sl__stack { display: flex; height: 8px; margin-top: 0.35rem; border-radius: 4px; overflow: hidden; background: var(--uk-fill); }
.sl__stack i { display: block; height: 100%; transition: width 0.4s ease; }
.sl__score { font-family: var(--vp-font-family-mono); font-size: 0.78rem; color: var(--vp-c-text-1); flex: none; }
.sl__ctl { margin-top: 1rem; }
.sl__edge { font-size: 0.8rem; padding: 0.42rem 0.7rem; border-radius: 7px; background: var(--uk-warm-soft); color: var(--uk-warm); }
</style>
