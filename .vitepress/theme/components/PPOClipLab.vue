<script setup lang="ts">
/**
 * Обрізання PPO: ціль = min(rA, clip(r, 1±ε)·A).
 * Видно, що крок за межами околу перестає давати виграш — градієнт зникає,
 * і великий стрибок стає не забороненим, а безвигідним.
 */
import { computed, ref } from 'vue'

const ratio = ref(1.15)
const adv = ref(1)
const eps = ref(0.2)

const clipped = computed(() => Math.min(Math.max(ratio.value, 1 - eps.value), 1 + eps.value))
const plain = computed(() => ratio.value * adv.value)
const clippedObj = computed(() => clipped.value * adv.value)
const objective = computed(() => Math.min(plain.value, clippedObj.value))
const inside = computed(() => Math.abs(ratio.value - 1) <= eps.value + 1e-9)
const frozen = computed(() => !inside.value && Math.abs(objective.value - clippedObj.value) < 1e-9)

// крива цілі по r при поточних A і ε
const W = 420
const H = 150
const R_MIN = 0.4
const R_MAX = 1.8
const path = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const r = R_MIN + ((R_MAX - R_MIN) * i) / 80
    const c = Math.min(Math.max(r, 1 - eps.value), 1 + eps.value)
    const v = Math.min(r * adv.value, c * adv.value)
    const x = 26 + ((r - R_MIN) / (R_MAX - R_MIN)) * (W - 40)
    const y = H - 26 - ((v + 2) / 4) * (H - 44)
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
})
const dotX = computed(() => 26 + ((ratio.value - R_MIN) / (R_MAX - R_MIN)) * (W - 40))
const dotY = computed(() => H - 26 - ((objective.value + 2) / 4) * (H - 44))
const bandX = computed(() => 26 + ((1 - eps.value - R_MIN) / (R_MAX - R_MIN)) * (W - 40))
const bandW = computed(() => ((2 * eps.value) / (R_MAX - R_MIN)) * (W - 40))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Обрізання кроку в PPO</div>
        <div class="lab__sub">
          Посуньте відношення ймовірностей — і подивіться, де ціль перестає рости.
        </div>
      </div>
    </div>

    <svg class="pc__plot" :viewBox="`0 0 ${W} ${H}`" role="img"
         aria-label="Ціль PPO залежно від відношення ймовірностей">
      <rect :x="bandX" y="10" :width="bandW" :height="H - 36" class="pc__band" />
      <line x1="26" :x2="W - 14" :y1="H - 26 - (2 / 4) * (H - 44)"
            :y2="H - 26 - (2 / 4) * (H - 44)" class="pc__axis" />
      <path :d="path" class="pc__line" />
      <circle :cx="dotX" :cy="dotY" r="5" class="pc__dot" />
      <text x="26" :y="H - 8" class="pc__tick">{{ R_MIN }}</text>
      <text :x="W - 20" :y="H - 8" class="pc__tick" text-anchor="end">{{ R_MAX }}</text>
      <text :x="bandX + bandW / 2" y="22" class="pc__tick" text-anchor="middle">околи 1 ± ε</text>
    </svg>

    <label class="lab__ctl">
      <span>Відношення <code>r = π_нова / π_стара</code></span>
      <input v-model.number="ratio" type="range" min="0.4" max="1.8" step="0.01" />
      <code>{{ ratio.toFixed(2) }}</code>
    </label>
    <label class="lab__ctl">
      <span>Перевага <code>A</code></span>
      <input v-model.number="adv" type="range" min="-2" max="2" step="0.1" />
      <code>{{ adv.toFixed(1) }}</code>
    </label>
    <label class="lab__ctl">
      <span>Ширина околу <code>ε</code></span>
      <input v-model.number="eps" type="range" min="0.05" max="0.5" step="0.05" />
      <code>{{ eps.toFixed(2) }}</code>
    </label>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ plain.toFixed(2) }}</b><span>r · A</span></div>
      <div class="lab__stat"><b>{{ clippedObj.toFixed(2) }}</b><span>clip(r) · A</span></div>
      <div class="lab__stat" :class="{ 'is-warm': frozen }">
        <b>{{ objective.toFixed(2) }}</b><span>ціль PPO</span>
      </div>
      <div class="lab__stat" :class="inside ? 'is-green' : 'is-warm'">
        <b>{{ inside ? 'в околі' : 'обрізано' }}</b><span>стан кроку</span>
      </div>
    </div>

    <p class="lab__note">
      <template v-if="frozen">
        Крок вийшов за околи: ціль упирається в {{ clippedObj.toFixed(2) }} і більше не
        залежить від <code>r</code>. Градієнт по цій відповіді зник — політиці невигідно
        стрибати далі.
      </template>
      <template v-else>
        Крок усередині околу: ціль росте разом із <code>r</code>, і градієнт працює.
        Саме в цій смузі PPO й дозволяє політиці змінюватись.
      </template>
    </p>
  </div>
</template>

<style scoped>
.pc__plot { width: 100%; height: auto; margin: 1rem 0 0.4rem; }
.pc__band { fill: var(--uk-accent-soft); opacity: 0.55; }
.pc__axis { stroke: var(--uk-line); stroke-width: 1; stroke-dasharray: 4 4; }
.pc__line { fill: none; stroke: var(--uk-accent); stroke-width: 2.4; }
.pc__dot { fill: var(--uk-warm); }
.pc__tick { font-size: 9px; fill: var(--vp-c-text-3); font-family: var(--vp-font-family-mono); }
.lab__ctl { display: grid; grid-template-columns: minmax(0, 15rem) 1fr auto; gap: 0.7rem; align-items: center; }
.lab__ctl code { font-size: 0.78rem; min-width: 3rem; text-align: right; }
@media (max-width: 720px) {
  .lab__ctl { grid-template-columns: 1fr auto; }
  .lab__ctl input { grid-column: 1 / -1; }
}
</style>
