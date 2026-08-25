<script setup lang="ts">
/**
 * L(N, D) = 406.4/N^0.34 + 410.7/D^0.28 + 1.69 — формула зі слайда (Hoffmann та ін.).
 * Крива будується наживо, видно, як обидва доданки впираються в незнижуваний 1.69.
 */
import { ref, computed } from 'vue'

const logN = ref(9.9)   // 10^9.9 ≈ 8 млрд параметрів
const logD = ref(11.6)  // ≈ 400 млрд токенів

const N = computed(() => 10 ** logN.value)
const D = computed(() => 10 ** logD.value)

function loss(n: number, d: number) {
  return 406.4 / n ** 0.34 + 410.7 / d ** 0.28 + 1.69
}

const L = computed(() => loss(N.value, D.value))
const termN = computed(() => 406.4 / N.value ** 0.34)
const termD = computed(() => 410.7 / D.value ** 0.28)

/** Оптимум Chinchilla: приблизно 20 токенів на параметр. */
const optimalD = computed(() => N.value * 20)
const ratio = computed(() => D.value / N.value)
const verdict = computed(() => {
  const r = ratio.value
  if (r < 10) return { t: 'даних замало на такий розмір: бюджет вигідніше віддати токенам, а не параметрам', c: 'warm' }
  if (r <= 30) return { t: 'близько до оптимуму Chinchilla (≈ 20 токенів на параметр)', c: 'green' }
  return { t: 'перетреновано відносно Chinchilla — так роблять навмисно, щоб здешевити inference', c: 'green' }
})

// крива L(N) при поточному D. Вісь втрат росте вгору: 5.2 зверху, 1.5 знизу.
const W = 420, H = 170, PAD = 34
const LMAX = 5.2, LMIN = 1.5
function py(l: number) {
  const y = 8 + ((LMAX - l) / (LMAX - LMIN)) * (H - 30)
  return Math.max(8, Math.min(H - 22, y))
}
const curve = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 60; i++) {
    const ln = 7 + (i / 60) * 5 // 10^7 … 10^12
    const x = PAD + (i / 60) * (W - PAD - 10)
    pts.push(`${x.toFixed(1)},${py(loss(10 ** ln, D.value)).toFixed(1)}`)
  }
  return pts.join(' ')
})
const dotX = computed(() => PAD + ((logN.value - 7) / 5) * (W - PAD - 10))
const dotY = computed(() => py(L.value))
const yFloor = py(1.69)

function human(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + ' трлн'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' млрд'
  if (n >= 1e6) return (n / 1e6).toFixed(0) + ' млн'
  return n.toExponential(1)
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Закон масштабування наживо</div>
        <div class="lab__sub">
          Та сама формула, що на слайді. Крутіть розмір моделі й обсяг даних — і дивіться,
          який доданок насправді тримає втрати.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Параметри <b>{{ human(N) }}</b></span>
        <input v-model.number="logN" type="range" min="7" max="12" step="0.05" />
      </label>
      <label class="lab__ctl">
        <span>Токени навчання <b>{{ human(D) }}</b></span>
        <input v-model.number="logD" type="range" min="8" max="13.5" step="0.05" />
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="sc__plot" role="img" aria-label="Крива втрат">
      <line :x1="PAD" :y1="H - 22" :x2="W - 10" :y2="H - 22" stroke="var(--uk-line)" />
      <line :x1="PAD" y1="8" :x2="PAD" :y2="H - 22" stroke="var(--uk-line)" />
      <line
        :x1="PAD" :y1="yFloor" :x2="W - 10" :y2="yFloor"
        stroke="var(--uk-warm)" stroke-dasharray="4 3" stroke-width="1"
      />
      <polyline :points="curve" fill="none" stroke="var(--uk-accent)" stroke-width="2.2" />
      <circle :cx="dotX" :cy="dotY" r="5" fill="var(--uk-accent)" stroke="var(--vp-c-bg)" stroke-width="2" />
      <text :x="PAD - 4" y="14" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">5.2</text>
      <text :x="PAD - 4" :y="yFloor + 3" font-size="9" text-anchor="end" fill="var(--uk-warm)">1.69</text>
      <text :x="W - 12" :y="yFloor - 5" font-size="8.5" text-anchor="end" fill="var(--uk-warm)">незнижуваний доданок</text>
      <text :x="PAD" :y="H - 8" font-size="9" fill="var(--vp-c-text-3)">10⁷</text>
      <text :x="W - 10" :y="H - 8" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">10¹² параметрів</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ L.toFixed(3) }}</b><span>прогнозовані втрати</span></div>
      <div class="lab__stat"><b>{{ termN.toFixed(3) }}</b><span>внесок розміру</span></div>
      <div class="lab__stat"><b>{{ termD.toFixed(3) }}</b><span>внесок даних</span></div>
      <div class="lab__stat" :class="verdict.c === 'warm' ? 'is-warm' : 'is-green'">
        <b>{{ ratio.toFixed(0) }}:1</b><span>токенів на параметр</span>
      </div>
    </div>

    <div class="sc__verdict" :class="'is-' + verdict.c">
      {{ verdict.t }} · оптимум для {{ human(N) }} параметрів ≈ {{ human(optimalD) }} токенів
    </div>

    <p class="lab__note">
      Доданок 1.69 не прибирається ані розміром, ані даними — це межа самої задачі
      передбачення наступного токена на цьому розподілі. Константи виміряні на конкретному
      наборі й конкретній архітектурі, тому переносити їх на іншу модель не можна:
      закон описує форму залежності, а не універсальні числа.
    </p>
  </div>
</template>

<style scoped>
.sc__plot { width: 100%; height: auto; background: var(--uk-fill); border-radius: 8px; padding: 0.3rem; }
.sc__verdict {
  margin-top: 0.7rem;
  font-size: 0.83rem;
  padding: 0.5rem 0.75rem;
  border-radius: 7px;
}
.sc__verdict.is-green { background: var(--uk-green-soft); color: var(--uk-green); }
.sc__verdict.is-warm { background: var(--uk-warm-soft); color: var(--uk-warm); }
</style>
