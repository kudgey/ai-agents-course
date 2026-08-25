<script setup lang="ts">
/**
 * Парне порівняння двох конфігурацій на одному наборі.
 * Стартовий стан відтворює приклад лекції: 15/20 проти 17/20,
 * Δ = +0.100, інтервал [−0.035, +0.235] — різниці немає.
 */
import { ref, computed } from 'vue'

const n = ref(20)
// true = розв'язано. Стартово: A має 15 успіхів, B — ті самі плюс дві задачі.
const A = ref<boolean[]>([])
const B = ref<boolean[]>([])

function seed(size: number) {
  const a: boolean[] = [], b: boolean[] = []
  for (let i = 0; i < size; i++) {
    const okA = i % 4 !== 3            // 3 з 4 → 0.75
    a.push(okA)
    b.push(okA || i === 3 || i === 11) // дві провалені задачі стали успішними
  }
  A.value = a; B.value = b
}
seed(20)

function resize(size: number) {
  n.value = size
  seed(size)
}

function toggle(which: 'A' | 'B', i: number) {
  const arr = which === 'A' ? A : B
  const copy = [...arr.value]
  copy[i] = !copy[i]
  arr.value = copy
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
          Клацніть будь-яку клітинку — результат задачі зміниться, і інтервал перерахується.
          Стартовий стан — приклад із лекції: 15/20 проти 17/20.
        </div>
      </div>
      <button class="lab__btn" @click="resize(n)">Скинути</button>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': n === 20 }" @click="resize(20)">20 задач</button>
      <button class="lab__pill" :class="{ 'is-on': n === 60 }" @click="resize(60)">60 задач</button>
      <button class="lab__pill" :class="{ 'is-on': n === 200 }" @click="resize(200)">200 задач</button>
    </div>

    <div class="ci__sets">
      <div class="ci__set">
        <span class="ci__name">Конфігурація A</span>
        <div class="ci__cells">
          <button
            v-for="(v, i) in A" :key="i"
            class="ci__cell" :class="{ 'is-ok': v }"
            :title="`задача ${i + 1}`"
            @click="toggle('A', i)"
          />
        </div>
        <b class="ci__acc">{{ (accA * 100).toFixed(0) }} %</b>
      </div>
      <div class="ci__set">
        <span class="ci__name">Конфігурація B</span>
        <div class="ci__cells">
          <button
            v-for="(v, i) in B" :key="i"
            class="ci__cell" :class="{ 'is-ok': v, 'is-flip': diffs[i] !== 0 }"
            :title="`задача ${i + 1}`"
            @click="toggle('B', i)"
          />
        </div>
        <b class="ci__acc">{{ (accB * 100).toFixed(0) }} %</b>
      </div>
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
        <b>{{ needed }}</b><span>задач треба для висновку</span>
      </div>
    </div>

    <p class="lab__note">
      На користь B зіграло задач: <b>{{ flips.up }}</b>, на користь A: <b>{{ flips.down }}</b>.
      Решта набору — <b>{{ flips.same }}</b> — у порівнянні не бере участі взагалі, бо обидві
      конфігурації там поводяться однаково. Саме тому парне порівняння бачить менші ефекти,
      ніж два окремі інтервали. Перемкніть набір на 200 задач: та сама різниця раптом стає
      значущою, і жодна зміна в системі для цього не знадобилась.
    </p>
  </div>
</template>

<style scoped>
.ci__sets { display: flex; flex-direction: column; gap: 0.55rem; margin-bottom: 1.2rem; }
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
  width: 3rem;
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
</style>
