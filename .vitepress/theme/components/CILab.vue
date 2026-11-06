<script setup lang="ts">
/**
 * Парне порівняння двох конфігурацій на одному наборі. Стартовий стан — фактичні виходи
 * набору лекції: Hit@1 конвеєра Л07 проти конвеєра з обрізанням закінчень (lec08.json).
 * Формули ті самі, що в l08_eval.py: Вілсон для частки, парна різниця для порівняння.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'

const BASE_A = data.ci.a as boolean[]
const BASE_B = data.ci.b as boolean[]
const IDS = data.ci.ids as string[]
const n = ref(BASE_A.length)
const A = ref<boolean[]>([])
const B = ref<boolean[]>([])
const Z = 1.96

function seed(times: number) {
  const rep = (v: boolean[]) => Array.from({ length: times }, () => v).flat()
  A.value = rep(BASE_A); B.value = rep(BASE_B)
  n.value = BASE_A.length * times
}
seed(1)

function resize(size: number) {
  seed(size / BASE_A.length)
}

function toggle(which: 'A' | 'B', i: number) {
  const arr = which === 'A' ? A : B
  const copy = [...arr.value]
  copy[i] = !copy[i]
  arr.value = copy
}

function wilson(k: number, N: number) {
  const p = k / N, den = 1 + Z ** 2 / N
  const mid = (p + Z ** 2 / (2 * N)) / den
  const half = (Z * Math.sqrt((p * (1 - p)) / N + Z ** 2 / (4 * N ** 2))) / den
  return [mid - half, mid + half]
}
const wA = computed(() => wilson(A.value.filter(Boolean).length, n.value))
const wB = computed(() => wilson(B.value.filter(Boolean).length, n.value))
const SIZES = [BASE_A.length, BASE_A.length * 3, BASE_A.length * 6]
function questions(v: number) {
  const a = v % 10, b = v % 100
  return `${v} ${a === 1 && b !== 11 ? 'питання' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'питання' : 'питань'}`
}

const accA = computed(() => A.value.filter(Boolean).length / n.value)
const accB = computed(() => B.value.filter(Boolean).length / n.value)

const diffs = computed(() => A.value.map((a, i) => (B.value[i] ? 1 : 0) - (a ? 1 : 0)))
const mean = computed(() => diffs.value.reduce((s, d) => s + d, 0) / n.value)

const ci = computed(() => {
  const m = mean.value
  const N = n.value
  if (N < 2) return { lo: 0, hi: 0, half: 0 }
  const varS = diffs.value.reduce((s, d) => s + (d - m) ** 2, 0) / (N - 1)
  const half = 1.96 * Math.sqrt(varS / N)
  return { lo: m - half, hi: m + half, half }
})

const significant = computed(() => ci.value.lo > 0 || ci.value.hi < 0)

/** Скільки задач треба, щоб цей самий ефект перестав накривати нуль. */
const needed = computed(() => {
  const m = Math.abs(mean.value)
  if (m < 1e-9) return null
  const varS = diffs.value.reduce((s, d) => s + (d - mean.value) ** 2, 0) / Math.max(1, n.value - 1)
  const req = Math.ceil((1.96 ** 2 * varS) / m ** 2)
  return req
})

const flips = computed(() => ({
  up: diffs.value.filter((d) => d > 0).length,
  down: diffs.value.filter((d) => d < 0).length,
  same: diffs.value.filter((d) => d === 0).length,
}))

const SCALE = 0.45 // ±0.45 на всю ширину шкали
function pos(v: number) {
  return ((v + SCALE) / (SCALE * 2)) * 100
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Чи є різниця між конфігураціями</div>
        <div class="lab__sub">
          Клітинка — одне питання: зафарбована, якщо правильний чанк стоїть першим. Стартовий стан — наш
          набір. Клацніть клітинку, і інтервали перерахуються.
        </div>
      </div>
      <button class="lab__btn" @click="resize(n)">Скинути</button>
    </div>

    <div class="lab__pills">
      <button v-for="(s, i) in SIZES" :key="s" class="lab__pill" :class="{ 'is-on': n === s }" @click="resize(s)">
        {{ i ? `${questions(s)}, ті самі частки` : `${questions(s)}: наш набір` }}
      </button>
    </div>

    <div class="ci__sets">
      <div class="ci__set">
        <span class="ci__name">Конвеєр Л07</span>
        <div class="ci__cells">
          <button
            v-for="(v, i) in A" :key="i"
            class="ci__cell" :class="{ 'is-ok': v }"
            :title="IDS[i % IDS.length]"
            @click="toggle('A', i)"
          />
        </div>
        <b class="ci__acc">{{ accA.toFixed(3) }}</b>
      </div>
      <div class="ci__wil">Вілсон, 95 %: [{{ wA[0].toFixed(3) }}; {{ wA[1].toFixed(3) }}]</div>
      <div class="ci__set">
        <span class="ci__name">+ обрізання закінчень</span>
        <div class="ci__cells">
          <button
            v-for="(v, i) in B" :key="i"
            class="ci__cell" :class="{ 'is-ok': v, 'is-flip': diffs[i] !== 0 }"
            :title="IDS[i % IDS.length]"
            @click="toggle('B', i)"
          />
        </div>
        <b class="ci__acc">{{ accB.toFixed(3) }}</b>
      </div>
      <div class="ci__wil">Вілсон, 95 %: [{{ wB[0].toFixed(3) }}; {{ wB[1].toFixed(3) }}]</div>
    </div>

    <div class="ci__axis">
      <div class="ci__zero" />
      <div
        class="ci__band" :class="{ 'is-sig': significant }"
        :style="{ left: pos(ci.lo) + '%', width: Math.max(1, pos(ci.hi) - pos(ci.lo)) + '%' }"
      />
      <div class="ci__point" :style="{ left: pos(mean) + '%' }" />
      <span class="ci__tick ci__tick--l">−0.45</span>
      <span class="ci__tick ci__tick--c">0</span>
      <span class="ci__tick ci__tick--r">+0.45</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat">
        <b>{{ mean >= 0 ? '+' : '' }}{{ mean.toFixed(3) }}</b><span>середня парна різниця</span>
      </div>
      <div class="lab__stat">
        <b>[{{ ci.lo >= 0 ? '+' : '' }}{{ ci.lo.toFixed(3) }}, {{ ci.hi >= 0 ? '+' : '' }}{{ ci.hi.toFixed(3) }}]</b>
        <span>95 % інтервал різниці</span>
      </div>
      <div class="lab__stat" :class="significant ? 'is-green' : 'is-warm'">
        <b>{{ significant ? 'різниця є' : 'у межах шуму' }}</b>
        <span>{{ significant ? 'нуль поза інтервалом' : 'інтервал накриває нуль' }}</span>
      </div>
      <div class="lab__stat" v-if="needed">
        <b>{{ questions(needed) }}</b><span>треба для цього ефекту: 1.96²·s²/d̄²</span>
      </div>
    </div>

    <p class="lab__note">
      На користь другої конфігурації зіграло питань: <b>{{ flips.up }}</b>, на користь першої: <b>{{ flips.down }}</b>.
      Решта — <b>{{ flips.same }}</b> — у порівнянні участі не бере: там обидві конфігурації поводяться однаково.
      Тому два інтервали часток перетинаються, а парний інтервал нуль не накриває: він рахує лише різницю на тих самих питаннях.
    </p>
  </div>
</template>

<style scoped>
.ci__sets { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1.2rem; }
.ci__wil { font-size: 0.74rem; color: var(--vp-c-text-3); margin: 0 0 0.35rem 9.2rem; }
.ci__set { display: flex; align-items: center; gap: 0.7rem; }
.ci__name { font-size: 0.8rem; color: var(--vp-c-text-2); width: 8.5rem; flex: none; }
.ci__cells { display: flex; flex-wrap: wrap; gap: 2px; flex: 1; }
.ci__cell {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 1px solid var(--uk-line);
  background: var(--uk-fill);
  cursor: pointer;
  padding: 0;
  transition: all 0.15s ease;
}
.ci__cell.is-ok { background: var(--uk-accent); border-color: var(--uk-accent); }
.ci__cell.is-flip { box-shadow: 0 0 0 2px var(--uk-warm-soft); border-color: var(--uk-warm); }
.ci__cell:hover { transform: scale(1.25); }
.ci__acc {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  width: 3.4rem;
  text-align: right;
  flex: none;
  color: var(--vp-c-text-2);
}
.ci__axis {
  position: relative;
  height: 46px;
  background: var(--uk-fill);
  border-radius: 8px;
  margin-bottom: 0.3rem;
}
.ci__zero { position: absolute; left: 50%; top: 6px; bottom: 16px; width: 1px; background: var(--vp-c-text-3); }
.ci__band {
  position: absolute;
  top: 14px;
  height: 12px;
  border-radius: 999px;
  background: var(--uk-warm);
  opacity: 0.45;
  transition: all 0.35s ease;
}
.ci__band.is-sig { background: var(--uk-green); opacity: 0.55; }
.ci__point {
  position: absolute;
  top: 12px;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  border-radius: 50%;
  background: var(--vp-c-bg);
  border: 3px solid var(--uk-ink);
  transition: left 0.35s ease;
}
.dark .ci__point { border-color: var(--vp-c-text-1); }
.ci__tick { position: absolute; bottom: 2px; font-size: 0.66rem; color: var(--vp-c-text-3); }
.ci__tick--l { left: 4px; }
.ci__tick--c { left: 50%; transform: translateX(-50%); }
.ci__tick--r { right: 4px; }
@media (max-width: 640px) {
  .ci__set { flex-wrap: wrap; }
  .ci__name { width: auto; flex: 1 1 auto; }
  .ci__cells { order: 3; flex: 0 0 100%; }
  .ci__wil { margin-left: 0; }
}
</style>
