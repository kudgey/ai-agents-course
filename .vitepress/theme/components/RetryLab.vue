<script setup lang="ts">
/**
 * Дві половини розділу про ретраї.
 * 1) Скільки запитів отримує провайдер на один запит користувача: 1 + p + p² + p³.
 * 2) Десять клієнтів, які впали одночасно, і три повтори кожного:
 *    фіксована пауза 1 с проти повного джитера (b = 0.5, C = 60).
 * Таймлайн джитера згенеровано з seed у lec05.json — ті самі числа, що в тексті.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05.json'

const PRESETS = data.retry as { p: number; e: number }[]
const T = data.timeline as {
  fixed: number[][]
  jitter: number[][]
  caps: number[]
}

// ── частина 1 ──────────────────────────────────────────────────────────
const p = ref(0.5)
const terms = computed(() => [0, 1, 2, 3].map((k) => p.value ** k))
const E = computed(() => terms.value.reduce((s, x) => s + x, 0))

// ── частина 2 ──────────────────────────────────────────────────────────
const mode = ref<'fixed' | 'jitter'>('jitter')
const rows = computed(() => (mode.value === 'fixed' ? T.fixed : T.jitter))

/** Найбільше повторів в одному вікні 100 мс — той самий підрахунок, що в генераторі. */
function peak(times: number[], width = 0.1) {
  const s = [...times].sort((a, b) => a - b)
  let best = { n: 0, at: 0 }
  for (const t0 of s) {
    const n = s.filter((t) => t >= t0 && t < t0 + width).length
    if (n > best.n) best = { n, at: t0 }
  }
  return best
}
const pk = computed(() => peak(rows.value.flat()))
const last = computed(() => Math.max(...rows.value.flat()))

const W = 640, LEFT = 34, RIGHT = 12, ROW = 17, TOP = 10
const TMAX = 3.2
const H = TOP + ROW * 10 + 30
const x = (t: number) => LEFT + (t / TMAX) * (W - LEFT - RIGHT)
const COLORS = ['var(--uk-accent)', 'var(--uk-green)', 'var(--uk-warm)']
const ticks = [0, 0.5, 1, 1.5, 2, 2.5, 3]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Ретраї: навантаження і шторм</div>
        <div class="lab__sub">
          Спершу — скільки запитів отримує провайдер на один запит користувача при бюджеті
          у три повтори. Нижче — коли ці повтори приходять від десяти клієнтів.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Імовірність, що спроба впаде, <b>p = {{ p.toFixed(2) }}</b></span>
        <input v-model.number="p" type="range" min="0" max="0.99" step="0.01" />
      </label>
    </div>
    <div class="lab__pills">
      <button
        v-for="r in PRESETS" :key="r.p"
        class="lab__pill" :class="{ 'is-on': p === r.p }" @click="p = r.p"
      >p = {{ r.p }}</button>
    </div>

    <div class="rt__formula">
      E = 1 + {{ terms[1].toFixed(3) }} + {{ terms[2].toFixed(3) }} + {{ terms[3].toFixed(3) }}
      = <b>{{ E.toFixed(2) }}</b> запиту на один запит користувача
    </div>
    <div v-for="(t, k) in terms" :key="k" class="lab__row">
      <span class="lab__label rt__lbl">{{ k === 0 ? 'перший запит' : `${k}-й повтор` }}</span>
      <div class="lab__bar"><i :style="{ width: t * 100 + '%' }" /></div>
      <span class="lab__num">{{ t.toFixed(3) }}</span>
    </div>

    <div class="lab__pills rt__mode">
      <button class="lab__pill" :class="{ 'is-on': mode === 'fixed' }" @click="mode = 'fixed'">
        фіксована пауза 1 с
      </button>
      <button class="lab__pill" :class="{ 'is-on': mode === 'jitter' }" @click="mode = 'jitter'">
        повний джитер: межі {{ T.caps.join(', ') }} с
      </button>
    </div>

    <div class="rt__scroll">
    <svg :viewBox="`0 0 ${W} ${H}`" class="rt__svg" role="img"
         aria-label="Моменти повторів десяти клієнтів">
      <rect :x="x(pk.at)" :y="TOP - 4" :width="x(pk.at + 0.1) - x(pk.at)" :height="ROW * 10 + 4"
            class="rt__peak" />
      <g v-for="(row, c) in rows" :key="c">
        <text :x="LEFT - 8" :y="TOP + c * ROW + ROW / 2 + 3" class="rt__cl">{{ c + 1 }}</text>
        <line :x1="x(0)" :x2="x(TMAX)" :y1="TOP + c * ROW + ROW / 2" :y2="TOP + c * ROW + ROW / 2"
              class="rt__lane" />
        <circle :cx="x(0)" :cy="TOP + c * ROW + ROW / 2" r="3.5" class="rt__first" />
        <circle v-for="(t, n) in row" :key="n" :cx="x(t)" :cy="TOP + c * ROW + ROW / 2" r="4.5"
                :fill="COLORS[n]" class="rt__dot" />
      </g>
      <g v-for="t in ticks" :key="t">
        <line :x1="x(t)" :x2="x(t)" :y1="TOP + ROW * 10" :y2="TOP + ROW * 10 + 4" class="rt__lane" />
        <text :x="x(t)" :y="TOP + ROW * 10 + 16" class="rt__tick">{{ t }} с</text>
      </g>
    </svg>
    </div>
    <div class="rt__legend">
      <span><i class="rt__sw rt__sw--first" /> перший запит, t = 0</span>
      <span v-for="(c, n) in COLORS" :key="n"><i class="rt__sw" :style="{ background: c }" /> {{ n + 1 }}-й повтор</span>
      <span><i class="rt__sw rt__sw--peak" /> найгустіші 100 мс</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="mode === 'fixed' ? 'is-warm' : 'is-green'">
        <b>{{ pk.n }}</b><span>повторів у найгустіших 100 мс</span>
      </div>
      <div class="lab__stat">
        <b>{{ last.toFixed(2) }} с</b><span>останній повтор</span>
      </div>
    </div>

    <p class="lab__note">
      При p = 0.9 провайдер, що вже лежить, отримує 3.44 запиту замість одного. Фіксована
      пауза ще й збирає їх у хвилі по 10 запитів в одну мить; повний джитер розводить ті самі
      повтори так, що в будь-яких 100 мс їх не більше 5.
    </p>
  </div>
</template>

<style scoped>
.rt__formula {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
  background: var(--uk-fill);
  border-radius: 8px;
  margin-bottom: 0.6rem;
  overflow-wrap: anywhere;
}
.rt__formula b { color: var(--uk-accent); font-weight: 600; }
.rt__lbl { width: 6.6rem; }
.rt__mode { margin-top: 1.1rem; }
.rt__scroll { overflow-x: auto; max-width: 100%; }
.rt__svg { width: 100%; min-width: 520px; height: auto; display: block; }
.rt__lane { stroke: var(--uk-line); stroke-width: 1; }
.rt__peak { fill: var(--uk-warm-soft); }
.rt__first { fill: var(--vp-c-text-3); opacity: 0.6; }
.rt__dot { stroke: var(--vp-c-bg); stroke-width: 1; transition: cx 0.35s ease; }
.rt__cl { font-size: 10px; fill: var(--vp-c-text-3); text-anchor: end; }
.rt__tick { font-size: 10px; fill: var(--vp-c-text-3); text-anchor: middle; }
.rt__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 0.3rem;
}
.rt__sw {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  vertical-align: -0.05rem;
  margin-right: 0.2rem;
}
.rt__sw--first { background: var(--vp-c-text-3); opacity: 0.6; }
.rt__sw--peak { background: var(--uk-warm-soft); border-radius: 2px; }
</style>
