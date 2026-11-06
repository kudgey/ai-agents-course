<script setup lang="ts">
/**
 * Парна різниця двох конфігурацій на одному наборі. Стартовий стан — фактичні виходи набору
 * лекції: Hit@1 конвеєра Л07 проти конвеєра з обрізанням закінчень (lec08.json).
 * Формула та сама, що в l08_eval.py: середнє d_i, s із діленням на n−1, ±1.96·s/√n.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'

const A = data.ci.a as boolean[]
const B = data.ci.b as boolean[]
const WON = B.filter((b, i) => b && !A[i]).length
const LOST = A.filter((a, i) => a && !B[i]).length
const SIZES = [A.length, A.length * 3]

const n = ref(A.length)
const won = ref(WON)
const lost = ref(LOST)

function reset(size: number) {
  n.value = size
  won.value = (WON * size) / A.length
  lost.value = (LOST * size) / A.length
}

const same = computed(() => n.value - won.value - lost.value)
const cells = computed(() => [
  ...Array(won.value).fill('is-up'),
  ...Array(lost.value).fill('is-down'),
  ...Array(same.value).fill(''),
])
const mean = computed(() => (won.value - lost.value) / n.value)
const s = computed(() => {
  const m = mean.value
  return Math.sqrt((won.value * (1 - m) ** 2 + lost.value * (1 + m) ** 2 + same.value * m ** 2) / (n.value - 1))
})
const se = computed(() => s.value / Math.sqrt(n.value))
const lo = computed(() => mean.value - 1.96 * se.value)
const hi = computed(() => mean.value + 1.96 * se.value)
const real = computed(() => lo.value > 0 || hi.value < 0)
const sign = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3)

const SCALE = 0.6 // ±0.6 на всю ширину шкали
const pos = (v: number) => Math.min(100, Math.max(0, ((v + SCALE) / (SCALE * 2)) * 100))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Чи справжній приріст</div>
        <div class="lab__sub">
          Клітинка — одне питання, тобто одне число d: що змінило обрізання закінчень. Старт — наш набір.
          Додавайте виграші й програші та дивіться, чи відійде інтервал від нуля.
        </div>
      </div>
      <button class="lab__btn" @click="reset(n)">Скинути</button>
    </div>

    <div class="ci__cells"><i v-for="(c, i) in cells" :key="i" class="ci__cell" :class="c" /></div>

    <div class="ci__ctl">
      <div class="ci__step">
        <i class="ci__cell is-up" /><span>виграно, d = +1</span>
        <button class="lab__btn" :disabled="won === 0" @click="won--">−</button>
        <b>{{ won }}</b>
        <button class="lab__btn" :disabled="same === 0" @click="won++">+</button>
      </div>
      <div class="ci__step">
        <i class="ci__cell is-down" /><span>програно, d = −1</span>
        <button class="lab__btn" :disabled="lost === 0" @click="lost--">−</button>
        <b>{{ lost }}</b>
        <button class="lab__btn" :disabled="same === 0" @click="lost++">+</button>
      </div>
      <div class="ci__step">
        <i class="ci__cell" /><span>без змін, d = 0</span><b>{{ same }}</b>
      </div>
    </div>

    <div class="ci__calc">
      <div><span class="ci__bar">d</span> = ({{ won }} − {{ lost }}) / {{ n }} = {{ sign(mean) }}</div>
      <div>s = {{ s.toFixed(3) }}, s/√n = {{ se.toFixed(3) }}</div>
      <div><span class="ci__bar">d</span> ± 1.96 · {{ se.toFixed(3) }} = [{{ sign(lo) }}; {{ sign(hi) }}]</div>
    </div>

    <div class="ci__axis">
      <div class="ci__zero" />
      <div class="ci__band" :class="{ 'is-real': real }" :style="{ left: pos(lo) + '%', width: Math.max(1, pos(hi) - pos(lo)) + '%' }" />
      <div class="ci__point" :style="{ left: pos(mean) + '%' }" />
      <span class="ci__tick ci__tick--c">0</span>
    </div>
    <p class="ci__say" :class="real ? 'is-green' : 'is-warm'">
      {{ real ? 'Нуль поза інтервалом: різниця справжня.' : 'Інтервал накриває нуль: на такому наборі різниці не видно.' }}
    </p>

    <div class="lab__pills">
      <button v-for="(v, i) in SIZES" :key="v" class="lab__pill" :class="{ 'is-on': n === v }" @click="reset(v)">
        {{ v }} питань{{ i ? ', ті самі частки' : ': наш набір' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.ci__cells { display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 0.8rem; }
.ci__cell { display: inline-block; width: 13px; height: 13px; flex: none; border-radius: 3px; border: 1px solid var(--uk-line); background: var(--uk-fill); }
.ci__cell.is-up { background: var(--uk-green); border-color: var(--uk-green); }
.ci__cell.is-down { background: var(--uk-warm); border-color: var(--uk-warm); }
.ci__ctl { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.9rem; }
.ci__step { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; min-height: 2rem; }
.ci__step span { flex: 0 1 11rem; color: var(--vp-c-text-2); }
.ci__step b { font-family: var(--vp-font-family-mono); font-size: 0.85rem; width: 2rem; text-align: center; }
.ci__step .lab__btn { padding: 0.05rem 0.6rem; }
.ci__calc { font-family: var(--vp-font-family-mono); font-size: 0.82rem; line-height: 1.7; padding: 0.5rem 0.7rem; background: var(--uk-fill); border-radius: 8px; margin-bottom: 0.8rem; overflow-wrap: anywhere; }
.ci__bar { text-decoration: overline; }
.ci__axis { position: relative; height: 46px; background: var(--uk-fill); border-radius: 8px; }
.ci__zero { position: absolute; left: 50%; top: 6px; bottom: 16px; width: 1px; background: var(--vp-c-text-3); }
.ci__band { position: absolute; top: 14px; height: 12px; border-radius: 999px; background: var(--uk-warm); opacity: 0.45; transition: all 0.25s ease; }
.ci__band.is-real { background: var(--uk-green); opacity: 0.55; }
.ci__point { position: absolute; top: 12px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: var(--vp-c-bg); border: 3px solid var(--uk-ink); transition: left 0.25s ease; }
.dark .ci__point { border-color: var(--vp-c-text-1); }
.ci__tick { position: absolute; bottom: 2px; font-size: 0.66rem; color: var(--vp-c-text-3); }
.ci__tick--c { left: 50%; transform: translateX(-50%); }
.ci__say { font-size: 0.86rem; font-weight: 600; margin: 0.5rem 0 0.8rem; }
.ci__say.is-green { color: var(--uk-green); }
.ci__say.is-warm { color: var(--uk-warm); }
.dark .ci__say.is-green { color: #9fd8bb; }
.dark .ci__say.is-warm { color: #f0b799; }
</style>
