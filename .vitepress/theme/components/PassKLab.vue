<script setup lang="ts">
/**
 * pass^k проти pass@k.
 * Стартовий набір відтворює числа слайда: pass^1 = 0.85, pass^8 ≈ 0.41.
 * Перемикач «однорідний агент» показує, чому та сама середня точність
 * при рівних імовірностях дає лише 0.85^8 ≈ 0.27.
 */
import { ref, computed } from 'vue'

const k = ref(8)
const homogeneous = ref(false)

// 25 задач: 8 стабільних і 17 хитких — саме такий розподіл дає 0.85 / 0.41
const STABLE = 8
const SHAKY = 17
const shakyP = ref(0.78)

const tasks = computed(() => {
  const avg = (STABLE * 1 + SHAKY * shakyP.value) / (STABLE + SHAKY)
  return homogeneous.value
    ? Array(STABLE + SHAKY).fill(avg)
    : [...Array(STABLE).fill(1), ...Array(SHAKY).fill(shakyP.value)]
})

const n = computed(() => tasks.value.length)
const pass1 = computed(() => tasks.value.reduce((s, p) => s + p, 0) / n.value)
const passK = computed(() => tasks.value.reduce((s, p) => s + p ** k.value, 0) / n.value)
const passAtK = computed(
  () => tasks.value.reduce((s, p) => s + (1 - (1 - p) ** k.value), 0) / n.value
)

const gap = computed(() => pass1.value - passK.value)

const curve = computed(() => {
  const pts: { k: number; hat: number; at: number }[] = []
  for (let i = 1; i <= 16; i++) {
    pts.push({
      k: i,
      hat: tasks.value.reduce((s, p) => s + p ** i, 0) / n.value,
      at: tasks.value.reduce((s, p) => s + (1 - (1 - p) ** i), 0) / n.value,
    })
  }
  return pts
})

const W = 420, H = 160, PAD = 34
function px(i: number) { return PAD + ((i - 1) / 15) * (W - PAD - 14) }
function py(v: number) { return H - 22 - v * (H - 40) }
const lineHat = computed(() => curve.value.map((p) => `${px(p.k)},${py(p.hat)}`).join(' '))
const lineAt = computed(() => curve.value.map((p) => `${px(p.k)},${py(p.at)}`).join(' '))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Середня точність проти надійності</div>
        <div class="lab__sub">
          Дві метрики на тих самих прогонах. pass@k росте з k і описує дослідника,
          який має право перезапустити; pass^k спадає і описує продакшн.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': !homogeneous }" @click="homogeneous = false">
        Задачі різні: 8 стабільних, 17 хитких
      </button>
      <button class="lab__pill" :class="{ 'is-on': homogeneous }" @click="homogeneous = true">
        Однорідний агент: усі задачі однакові
      </button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Прогонів <b>k = {{ k }}</b></span>
        <input v-model.number="k" type="range" min="1" max="16" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Успішність хитких задач <b>{{ shakyP.toFixed(2) }}</b></span>
        <input v-model.number="shakyP" type="range" min="0.4" max="1" step="0.01" />
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="pk__plot" role="img" aria-label="Криві pass@k і pass^k">
      <line :x1="PAD" :y1="H - 22" :x2="W - 14" :y2="H - 22" stroke="var(--uk-line)" />
      <line :x1="PAD" y1="10" :x2="PAD" :y2="H - 22" stroke="var(--uk-line)" />
      <polyline :points="lineAt" fill="none" stroke="var(--uk-green)" stroke-width="2.2" />
      <polyline :points="lineHat" fill="none" stroke="var(--uk-warm)" stroke-width="2.2" />
      <line :x1="px(k)" y1="10" :x2="px(k)" :y2="H - 22" stroke="var(--vp-c-text-3)" stroke-dasharray="3 3" />
      <circle :cx="px(k)" :cy="py(passAtK)" r="4.5" fill="var(--uk-green)" />
      <circle :cx="px(k)" :cy="py(passK)" r="4.5" fill="var(--uk-warm)" />
      <text :x="PAD - 5" y="16" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">1.0</text>
      <text :x="PAD - 5" :y="H - 24" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">0</text>
      <text :x="PAD" :y="H - 8" font-size="9" fill="var(--vp-c-text-3)">k=1</text>
      <text :x="W - 14" :y="H - 8" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">k=16</text>
      <text :x="W - 20" :y="py(1) + 4" font-size="9" text-anchor="end" fill="var(--uk-green)">pass@k</text>
      <text :x="W - 20" :y="py(passK) - 8" font-size="9" text-anchor="end" fill="var(--uk-warm)">pass^k</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ pass1.toFixed(2) }}</b><span>pass^1 — середня точність</span></div>
      <div class="lab__stat is-warm"><b>{{ passK.toFixed(2) }}</b><span>pass^{{ k }} — надійність</span></div>
      <div class="lab__stat is-green"><b>{{ passAtK.toFixed(2) }}</b><span>pass@{{ k }}</span></div>
      <div class="lab__stat"><b>−{{ (gap * 100).toFixed(0) }} п.п.</b><span>розрив із середньою</span></div>
    </div>

    <p class="lab__note">
      <template v-if="!homogeneous">
        Це числа слайда: середня точність 0.85, а надійність на восьми прогонах —
        близько 0.41. Перемкніть на однорідного агента з тією самою середньою: вийде
        0.85<sup>8</sup> ≈ 0.27. Надійність задає <b>розподіл</b> успіху за задачами, а не середнє,
        і тому одна агрегована цифра нічого не каже про поведінку системи в продакшні.
      </template>
      <template v-else>
        Усі задачі мають однакову ймовірність, тому pass^k вироджується у просте p<sup>k</sup>.
        Реальні набори так не влаштовані: частина задач розв'язується завжди, частина —
        ніколи, і саме хвіст визначає, що побачить користувач.
      </template>
    </p>
  </div>
</template>

<style scoped>
.pk__plot { width: 100%; height: auto; background: var(--uk-fill); border-radius: 8px; padding: 0.3rem; }
</style>
