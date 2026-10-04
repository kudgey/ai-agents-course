<script setup lang="ts">
/**
 * Втрата DPO на одній парі: −log σ(β[Δ_w − Δ_l]), де Δ — log π/π_ref.
 * Видно, що важить лише різниця зсувів, а β задає, як швидко втрата
 * насичується: за великого β пара майже перестає давати градієнт.
 */
import { computed, ref } from 'vue'

const dW = ref(2.0)   // наскільки політика підсилила кращу відповідь
const dL = ref(-1.0)  // і гіршу
const beta = ref(0.1)

const margin = computed(() => dW.value - dL.value)
const z = computed(() => beta.value * margin.value)
const sigma = computed(() => 1 / (1 + Math.exp(-z.value)))
const loss = computed(() => -Math.log(sigma.value))
// похідна втрати по margin: β·σ(−z) — це й є сила градієнта на цій парі
const grad = computed(() => beta.value * (1 - sigma.value))
const strong = computed(() => grad.value < 0.01)

const W = 420
const H = 140
const M_MIN = -20
const M_MAX = 20
const path = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const m = M_MIN + ((M_MAX - M_MIN) * i) / 80
    const v = -Math.log(1 / (1 + Math.exp(-beta.value * m)))
    const x = 26 + ((m - M_MIN) / (M_MAX - M_MIN)) * (W - 40)
    const y = H - 24 - Math.min(v, 1.2) * ((H - 40) / 1.2)
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
})
const dotX = computed(
  () => 26 + ((Math.max(M_MIN, Math.min(M_MAX, margin.value)) - M_MIN) / (M_MAX - M_MIN)) * (W - 40))
const dotY = computed(() => H - 24 - Math.min(loss.value, 1.2) * ((H - 40) / 1.2))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Втрата DPO на одній парі</div>
        <div class="lab__sub">
          Два повзунки — це зсуви політики відносно замороженої копії.
          Важить тільки різниця між ними.
        </div>
      </div>
    </div>

    <svg class="dp__plot" :viewBox="`0 0 ${W} ${H}`" role="img"
         aria-label="Втрата DPO залежно від розриву між кращою і гіршою відповіддю">
      <line x1="26" :x2="W - 14" :y1="H - 24" :y2="H - 24" class="dp__axis" />
      <path :d="path" class="dp__line" />
      <circle :cx="dotX" :cy="dotY" r="5" class="dp__dot" />
      <text x="26" :y="H - 8" class="dp__tick">розрив −20</text>
      <text :x="W - 20" :y="H - 8" class="dp__tick" text-anchor="end">+20</text>
    </svg>

    <label class="lab__ctl">
      <span>Зсув кращої <code>Δ_w = log π/π_ref</code></span>
      <input v-model.number="dW" type="range" min="-8" max="8" step="0.1" />
      <code>{{ dW.toFixed(2) }}</code>
    </label>
    <label class="lab__ctl">
      <span>Зсув гіршої <code>Δ_l</code></span>
      <input v-model.number="dL" type="range" min="-8" max="8" step="0.1" />
      <code>{{ dL.toFixed(2) }}</code>
    </label>
    <label class="lab__ctl">
      <span>Сила штрафу <code>β</code></span>
      <input v-model.number="beta" type="range" min="0.01" max="1" step="0.01" />
      <code>{{ beta.toFixed(2) }}</code>
    </label>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ margin.toFixed(2) }}</b><span>розрив Δ_w − Δ_l</span></div>
      <div class="lab__stat"><b>{{ sigma.toFixed(3) }}</b><span>σ(β · розрив)</span></div>
      <div class="lab__stat" :class="{ 'is-warm': loss > 0.7 }">
        <b>{{ loss.toFixed(3) }}</b><span>втрата</span>
      </div>
      <div class="lab__stat" :class="strong ? 'is-warm' : 'is-green'">
        <b>{{ grad.toFixed(3) }}</b><span>сила градієнта</span>
      </div>
    </div>

    <p class="lab__note">
      <template v-if="margin < 0">
        Розрив відʼємний: політика підсилила <b>гіршу</b> відповідь. Втрата велика,
        і градієнт штовхає пару в інший бік.
      </template>
      <template v-else-if="strong">
        Пара вже розведена настільки, що градієнт майже зник — на цій парі модель
        більше нічого не вчить. Так само поводиться і втрата Бредлі–Террі.
      </template>
      <template v-else>
        Зверніть увагу: однакового розриву можна досягти, піднявши кращу або
        опустивши гіршу. Формула цього не розрізняє — звідси й likelihood
        displacement, коли обидві ймовірності падають, а розрив росте.
      </template>
    </p>
  </div>
</template>

<style scoped>
.dp__plot { width: 100%; height: auto; margin: 1rem 0 0.4rem; }
.dp__axis { stroke: var(--uk-line); stroke-width: 1; }
.dp__line { fill: none; stroke: var(--uk-accent); stroke-width: 2.4; }
.dp__dot { fill: var(--uk-warm); }
.dp__tick { font-size: 9px; fill: var(--vp-c-text-3); font-family: var(--vp-font-family-mono); }
.lab__ctl { display: grid; grid-template-columns: minmax(0, 17rem) 1fr auto; gap: 0.7rem; align-items: center; }
.lab__ctl code { font-size: 0.78rem; min-width: 3rem; text-align: right; }
@media (max-width: 720px) {
  .lab__ctl { grid-template-columns: 1fr auto; }
  .lab__ctl input { grid-column: 1 / -1; }
}
</style>
