<script setup lang="ts">
/**
 * BM25 на шести фрагментах лекції 06 — тих самих, на яких текст рахує вручну.
 * Корпус, запити, k₁ і b за замовчуванням читаються з lec06_toy.json;
 * формула та токенізація — як у генераторі (натуральний логарифм, без стемінгу).
 */
import { ref, computed } from 'vue'
import data from '../../data/lec06_toy.json'

const DOCS = data.docs as { id: string; topic: string; text: string }[]
const QUERIES = data.queries as string[]

const query = ref(QUERIES[1]) // основне питання лекції
const k1 = ref(data.k1)
const b = ref(data.b)

/** Як re.split(r"[^\w]+", s.lower()) у Python. */
function tokenize(s: string) {
  return s.toLowerCase().split(/[^\p{L}\p{N}_]+/u).filter(Boolean)
}

const docTokens = DOCS.map((d) => tokenize(d.text))
const avgLen = docTokens.reduce((s, d) => s + d.length, 0) / docTokens.length
const N = DOCS.length
const df = (t: string) => docTokens.filter((d) => d.includes(t)).length

const scored = computed(() => {
  const q = tokenize(query.value)
  return DOCS.map((doc, i) => {
    const d = docTokens[i]
    const parts = q.map((t) => {
      const tf = d.filter((x) => x === t).length
      const n = df(t)
      if (!tf || !n) return { t, tf, idf: 0, v: 0 }
      const idf = Math.log(N / n)
      const norm = k1.value * (1 - b.value + (b.value * d.length) / avgLen) + tf
      return { t, tf, idf, v: (idf * tf) / norm }
    })
    return { ...doc, len: d.length, score: parts.reduce((s, p) => s + p.v, 0), parts }
  }).sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
})

const max = computed(() => Math.max(...scored.value.map((s) => s.score), 1e-9))

const mode = computed(() => {
  if (k1.value === 0) return 'k₁ = 0: частка дорівнює 1 для будь-якої ненульової частоти — лишається сама idf'
  if (b.value === 0) return 'b = 0: довжина фрагмента не враховується зовсім'
  if (b.value >= 0.999) return 'b = 1: повна нормалізація за довжиною — довгі фрагменти втрачають найбільше'
  return null
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">BM25 на шести фрагментах</div>
        <div class="lab__sub">
          Ті самі фрагменти й та сама формула, що в ручному розрахунку. Змінюйте запит
          і параметри — порядок видачі перераховується повністю.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="q in QUERIES" :key="q"
        class="lab__pill" :class="{ 'is-on': query === q }" @click="query = q"
      >{{ q }}</button>
    </div>

    <input v-model="query" class="sr__input" spellcheck="false" placeholder="свій запит…" />

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Насичення частоти <b>k₁ = {{ k1.toFixed(1) }}</b></span>
        <input v-model.number="k1" type="range" min="0" max="3" step="0.1" />
      </label>
      <label class="lab__ctl">
        <span>Нормалізація довжини <b>b = {{ b.toFixed(2) }}</b></span>
        <input v-model.number="b" type="range" min="0" max="1" step="0.01" />
      </label>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" @click="k1 = 0">k₁ = 0</button>
      <button class="lab__pill" @click="b = 0">b = 0</button>
      <button class="lab__pill" @click="b = 1">b = 1</button>
      <button class="lab__pill" @click="k1 = data.k1; b = data.b">як у тексті: 1.5 / 0.75</button>
    </div>

    <div v-if="mode" class="sr__edge">{{ mode }}</div>

    <div class="sr__list">
      <div v-for="(d, r) in scored" :key="d.id" class="sr__doc" :class="{ 'is-zero': d.score === 0 }">
        <span class="sr__rank">{{ r + 1 }}</span>
        <div class="sr__body">
          <div class="sr__text"><b>{{ d.id }}</b> {{ d.text }}</div>
          <div class="sr__meta">
            <span>{{ d.len }} токенів</span>
            <template v-for="p in d.parts" :key="p.t">
              <span v-if="p.tf" class="sr__term">
                {{ p.t }} · tf {{ p.tf }} · idf {{ p.idf.toFixed(2) }} · внесок {{ p.v.toFixed(3) }}
              </span>
            </template>
          </div>
        </div>
        <div class="sr__scorebar">
          <div class="lab__bar"><i :style="{ width: (d.score / max) * 100 + '%' }" /></div>
          <b>{{ d.score.toFixed(3) }}</b>
        </div>
      </div>
    </div>

    <p class="lab__note">
      На запиті «коли перескладання з бази даних» бібліотека d6 стоїть другою лише через
      спільне «з бази даних», а консультації d3 мають нуль: «перескладанням» для BM25 — інше
      слово. Спробуйте запит «перескладанням» — і d3 стане єдиним знайденим фрагментом.
    </p>
  </div>
</template>

<style scoped>
.sr__input {
  width: 100%;
  font-family: var(--vp-font-family-base);
  font-size: 0.92rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  margin-bottom: 0.9rem;
}
.sr__input:focus { outline: none; border-color: var(--uk-accent); }
.sr__edge {
  font-size: 0.8rem;
  padding: 0.42rem 0.7rem;
  border-radius: 7px;
  background: var(--uk-warm-soft);
  color: var(--uk-warm);
  margin-bottom: 0.7rem;
}
.sr__list { display: flex; flex-direction: column; gap: 0.4rem; }
.sr__doc {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  transition: opacity 0.2s ease;
}
.sr__doc.is-zero { opacity: 0.42; }
.sr__rank {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  width: 1rem;
  flex: none;
  padding-top: 0.1rem;
}
.sr__body { flex: 1; min-width: 0; }
.sr__text { font-size: 0.84rem; line-height: 1.45; }
.sr__text b { font-family: var(--vp-font-family-mono); font-size: 0.76rem; color: var(--uk-accent); margin-right: 0.2rem; }
.sr__meta { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; }
.sr__meta span {
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
}
.sr__term { background: var(--uk-fill); border-radius: 4px; padding: 0.05rem 0.3rem; }
.sr__scorebar { width: 8.5rem; flex: none; display: flex; align-items: center; gap: 0.5rem; }
.sr__scorebar b {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  width: 3rem;
  text-align: right;
  color: var(--vp-c-text-2);
}
@media (max-width: 620px) {
  .sr__doc { flex-wrap: wrap; }
  .sr__scorebar { width: 100%; }
}
</style>
