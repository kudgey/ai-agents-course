<script setup lang="ts">
/**
 * Декодування наживо на тому самому розподілі, що стоїть у таблиці лекції.
 * Порядок операцій відтворює код зі слайда: температура → відсікання → перенормування.
 */
import { ref, computed } from 'vue'

const BASE = [
  { tok: 'cute', p: 0.34 },
  { tok: 'on', p: 0.32 },
  { tok: 'sick', p: 0.21 },
  { tok: 'are', p: 0.12 },
  { tok: '.', p: 0.01 },
]

const temperature = ref(1.0)
const topK = ref(5)
const topP = ref(1.0)
const tally = ref<Record<string, number>>({})
const rolling = ref(false)

/** softmax(log p / τ) ∝ p^(1/τ) — температура над логітами, як у коді лекції. */
const afterTemp = computed(() => {
  const t = Math.max(temperature.value, 0.01)
  const w = BASE.map((d) => Math.pow(d.p, 1 / t))
  const s = w.reduce((a, b) => a + b, 0)
  return BASE.map((d, i) => ({ ...d, p: w[i] / s }))
})

const result = computed(() => {
  const sorted = [...afterTemp.value].sort((a, b) => b.p - a.p)
  const keep = new Set<string>()

  // top-k: фіксований пул
  sorted.slice(0, topK.value).forEach((d) => keep.add(d.tok))

  // top-p: найменша множина, маса якої досягає p
  let acc = 0
  const nucleus = new Set<string>()
  for (const d of sorted) {
    nucleus.add(d.tok)
    acc += d.p
    if (acc >= topP.value - 1e-9) break
  }

  const survives = (tok: string) => keep.has(tok) && nucleus.has(tok)
  const mass = afterTemp.value.filter((d) => survives(d.tok)).reduce((a, b) => a + b.p, 0)

  return afterTemp.value.map((d) => ({
    tok: d.tok,
    base: BASE.find((b) => b.tok === d.tok)!.p,
    tempP: d.p,
    final: survives(d.tok) ? d.p / mass : 0,
    kept: survives(d.tok),
  }))
})

const entropy = computed(() => {
  const h = result.value
    .filter((d) => d.final > 0)
    .reduce((a, d) => a - d.final * Math.log2(d.final), 0)
  return h.toFixed(2)
})

const poolSize = computed(() => result.value.filter((d) => d.kept).length)

const isGreedy = computed(() => poolSize.value === 1 || temperature.value <= 0.05)

function roll(times = 100) {
  rolling.value = true
  const next: Record<string, number> = {}
  for (let i = 0; i < times; i++) {
    let r = Math.random()
    for (const d of result.value) {
      r -= d.final
      if (r <= 0) {
        next[d.tok] = (next[d.tok] ?? 0) + 1
        break
      }
    }
  }
  tally.value = next
  setTimeout(() => (rolling.value = false), 260)
}

function reset() {
  temperature.value = 1.0
  topK.value = 5
  topP.value = 1.0
  tally.value = {}
}

function preset(t: number, k: number, p: number) {
  temperature.value = t
  topK.value = k
  topP.value = p
  tally.value = {}
}
</script>

<template>
  <div class="sl">
    <div class="sl__head">
      <div>
        <div class="sl__title">Один крок генерації, чотири рішення</div>
        <div class="sl__sub">
          Розподіл — той самий, що в таблиці вище. Крутіть ручки й дивіться, хто лишається в пулі.
        </div>
      </div>
      <button class="sl__reset" @click="reset">Скинути</button>
    </div>

    <div class="sl__presets">
      <button class="sl__preset" @click="preset(0.05, 5, 1)">Greedy</button>
      <button class="sl__preset" @click="preset(1, 3, 1)">Top-k, k=3</button>
      <button class="sl__preset" @click="preset(1, 5, 0.6)">Top-p, p=0.6</button>
      <button class="sl__preset" @click="preset(2, 5, 1)">Гаряче, τ=2</button>
    </div>

    <div class="sl__controls">
      <label class="sl__ctl">
        <span>Температура <b>τ = {{ temperature.toFixed(2) }}</b></span>
        <input v-model.number="temperature" type="range" min="0.05" max="2" step="0.05" />
      </label>
      <label class="sl__ctl">
        <span>Top-k <b>k = {{ topK }}</b></span>
        <input v-model.number="topK" type="range" min="1" :max="BASE.length" step="1" />
      </label>
      <label class="sl__ctl">
        <span>Top-p <b>p = {{ topP.toFixed(2) }}</b></span>
        <input v-model.number="topP" type="range" min="0.05" max="1" step="0.01" />
      </label>
    </div>

    <div class="sl__rows">
      <div v-for="d in result" :key="d.tok" class="sl__row" :class="{ 'is-out': !d.kept }">
        <code class="sl__tok">{{ d.tok }}</code>
        <div class="sl__track">
          <i class="sl__ghost" :style="{ width: d.base * 100 + '%' }" />
          <i class="sl__fill" :style="{ width: d.final * 100 + '%' }" />
        </div>
        <span class="sl__val">
          {{ d.kept ? d.final.toFixed(3) : 'відкинуто' }}
        </span>
      </div>
    </div>

    <div class="sl__meta">
      <div class="sl__chip"><b>{{ poolSize }}</b> у пулі</div>
      <div class="sl__chip"><b>{{ entropy }}</b> біт ентропії</div>
      <div class="sl__chip" :class="{ 'is-hot': isGreedy }">
        {{ isGreedy ? 'вироджено в greedy' : 'вибір випадковий' }}
      </div>
      <button class="sl__roll" :disabled="rolling" @click="roll(100)">Розіграти 100 разів</button>
    </div>

    <div v-if="Object.keys(tally).length" class="sl__tally">
      <div v-for="d in result" :key="d.tok" class="sl__tally-row">
        <code>{{ d.tok }}</code>
        <div class="sl__track sl__track--thin">
          <i class="sl__fill sl__fill--warm" :style="{ width: ((tally[d.tok] ?? 0)) + '%' }" />
        </div>
        <span>{{ tally[d.tok] ?? 0 }}</span>
      </div>
      <p class="sl__note">
        Сто прогонів з тими самими параметрами дають різні токени — саме це і є недетермінізм
        на кроці семплювання. Тільки greedy повторюваний, і навіть він не гарантує однакової
        відповіді на іншому залізі.
      </p>
    </div>

    <p class="sl__fine">
      Ймовірності в таблиці лекції вже округлені, тому перерахунок від них дає, наприклад,
      <code>.39 / .37 / .24</code>, а в підручнику надруковано <code>.39 / .36 / .25</code> —
      там нормували неокруглені значення. Розбіжність у сотих є наслідком округлення, а не помилкою.
    </p>
  </div>
</template>

<style scoped>
.sl {
  border: 1px solid var(--uk-line);
  border-radius: 12px;
  padding: 1.15rem 1.25rem 1.25rem;
  margin: 1.8rem 0;
  background: var(--vp-c-bg);
}
.sl__head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.sl__title { font-weight: 600; font-size: 1.02rem; letter-spacing: -0.01em; }
.sl__sub { font-size: 0.83rem; color: var(--vp-c-text-3); margin-top: 0.1rem; max-width: 52ch; }
.sl__reset, .sl__roll {
  font-size: 0.78rem; padding: 0.32rem 0.7rem; border: 1px solid var(--uk-line);
  border-radius: 6px; background: transparent; color: var(--vp-c-text-2); cursor: pointer;
  transition: all 0.15s ease; flex: none;
}
.sl__reset:hover, .sl__roll:hover { border-color: var(--uk-accent); color: var(--uk-accent); }
.sl__roll { margin-left: auto; }
.sl__roll:disabled { opacity: 0.5; cursor: default; }
.sl__presets { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.85rem 0 0.2rem; }
.sl__preset {
  font-size: 0.78rem; padding: 0.25rem 0.6rem; border: 1px dashed var(--uk-line);
  border-radius: 999px; color: var(--vp-c-text-2); background: transparent; cursor: pointer;
  transition: all 0.15s ease;
}
.sl__preset:hover { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); }
.sl__controls {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.8rem; margin: 1rem 0 1.1rem;
}
.sl__ctl { display: block; }
.sl__ctl > span { display: block; font-size: 0.8rem; color: var(--vp-c-text-2); margin-bottom: 0.25rem; }
.sl__ctl b { font-family: var(--vp-font-family-mono); color: var(--uk-accent); font-weight: 500; }
.sl__ctl input { width: 100%; accent-color: var(--uk-accent); }
.sl__rows { display: flex; flex-direction: column; gap: 0.4rem; }
.sl__row { display: flex; align-items: center; gap: 0.7rem; transition: opacity 0.2s ease; }
.sl__row.is-out { opacity: 0.38; }
.sl__tok {
  font-family: var(--vp-font-family-mono); font-size: 0.82rem; width: 3.6rem; flex: none;
  background: var(--uk-fill); border: 1px solid var(--uk-line); border-radius: 4px;
  padding: 0.1rem 0.3rem; text-align: center;
}
.sl__track { position: relative; flex: 1; height: 18px; background: var(--uk-fill); border-radius: 5px; overflow: hidden; }
.sl__track--thin { height: 11px; }
.sl__ghost { position: absolute; inset: 0 auto 0 0; background: var(--uk-line); opacity: 0.75; }
.sl__fill {
  position: absolute; inset: 0 auto 0 0; background: var(--uk-accent);
  border-radius: 5px; transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.sl__fill--warm { background: var(--uk-warm); }
.sl__val {
  font-family: var(--vp-font-family-mono); font-size: 0.78rem; width: 5.2rem;
  text-align: right; color: var(--vp-c-text-2); flex: none;
}
.sl__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 1rem; }
.sl__chip {
  font-size: 0.78rem; padding: 0.28rem 0.6rem; border-radius: 999px;
  background: var(--uk-fill); color: var(--vp-c-text-2);
}
.sl__chip b { font-family: var(--vp-font-family-mono); color: var(--uk-accent); }
.sl__chip.is-hot { background: var(--uk-warm-soft); color: var(--uk-warm); }
.sl__tally { margin-top: 1.1rem; padding-top: 0.9rem; border-top: 1px solid var(--uk-line); }
.sl__tally-row { display: flex; align-items: center; gap: 0.7rem; margin: 0.28rem 0; }
.sl__tally-row code {
  font-family: var(--vp-font-family-mono); font-size: 0.78rem; width: 3.6rem; flex: none;
  color: var(--vp-c-text-2);
}
.sl__tally-row span {
  font-family: var(--vp-font-family-mono); font-size: 0.78rem; width: 2.2rem;
  text-align: right; color: var(--vp-c-text-2);
}
.sl__note, .sl__fine { font-size: 0.85rem; line-height: 1.55; color: var(--vp-c-text-2); }
.sl__note { margin: 0.8rem 0 0; }
.sl__fine {
  margin: 1rem 0 0; padding-top: 0.8rem; border-top: 1px dashed var(--uk-line);
  font-size: 0.8rem; color: var(--vp-c-text-3);
}
</style>
