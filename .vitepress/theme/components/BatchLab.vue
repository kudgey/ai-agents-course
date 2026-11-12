<script setup lang="ts">
/**
 * Крок декоду для батча з B запитів асистента ФОП: ваги читаються один раз на всіх, кеш — кожного окремо.
 * Формула — спільна lib/l09.js (нижня межа з пропускної здатності); числа заліза й моделі — lec09.json.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec09.json'
import { budget, step, kvPerToken } from '../lib/l09.js'

const FMT = Object.fromEntries(data.formats.map((f) => [f.key, f]))
const fmts = ['bf16', 'awq'].map((k) => FMT[k])
const dev = ref(data.devices[0])
const fmt = ref(FMT.awq)
const B = ref(1)
const MAXB = 160

const s = computed(() => step(data, dev.value, fmt.value, B.value))
const wMs = computed(() => (fmt.value.bytes / (dev.value.bw * 1e9)) * 1000)
const kvMs = computed(() => s.value.mem * 1000 - wMs.value)
const nRes = computed(() => budget(data, dev.value, fmt.value).n)
const nPaged = computed(() => budget(data, dev.value, fmt.value, 2, data.request.total).n)
const limit = computed(() => (dev.value.bw * 1e9) / (data.request.decode_ctx * kvPerToken(data.model)))

// крива «токенів за секунду разом» від B = 1 до MAXB
const W = 400, H = 160, PAD = 14
const total = (b: number) => b / step(data, dev.value, fmt.value, b).t
const yMax = computed(() => Math.max(limit.value, total(MAXB)) * 1.08)
const px = (b: number) => PAD + ((b - 1) / (MAXB - 1)) * (W - PAD - 8)
const py = (v: number) => H - 18 - (v / yMax.value) * (H - 30)
const path = computed(() => {
  let d = ''
  for (let b = 1; b <= MAXB; b++) d += (b === 1 ? 'M' : 'L') + px(b).toFixed(1) + ' ' + py(total(b)).toFixed(1)
  return d
})
const fits = computed(() => B.value <= nPaged.value)
const n0 = (v: number) => Math.round(v).toLocaleString('uk-UA')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Батч ділить читання ваг</div>
        <div class="lab__sub">
          На кожному кроці картка читає ваги один раз для всього батча, а кеш — кожного запиту окремо.
          Числа — стеля з пропускної здатності пам'яті; справжній сервер повільніший.
        </div>
      </div>
    </div>
    <div class="lab__pills">
      <button v-for="d in data.devices" :key="d.key" class="lab__pill" :class="{ 'is-on': dev.key === d.key }" @click="dev = d">{{ d.label }}</button>
      <button v-for="f in fmts" :key="f.key" class="lab__pill" :class="{ 'is-on': fmt.key === f.key }" @click="fmt = f">ваги {{ f.label }}</button>
    </div>
    <label class="lab__ctl">
      <span>Запитів у батчі <b>{{ B }}</b></span>
      <input v-model.number="B" type="range" min="1" :max="MAXB" step="1" />
    </label>

    <div class="bl__step">
      <span class="bl__w" :style="{ flexGrow: wMs }">ваги {{ wMs.toFixed(2) }} мс</span>
      <span class="bl__kv" :style="{ flexGrow: kvMs }"><template v-if="kvMs > wMs * 0.35">кеш {{ kvMs.toFixed(2) }} мс</template></span>
    </div>
    <div class="bl__cap">Один крок: {{ (s.t * 1000).toFixed(2) }} мс читання пам'яті; обчислення — {{ (s.flops * 1000).toFixed(2) }} мс, тобто тензорні ядра здебільшого чекають.</div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ (1 / s.t).toFixed(0) }}</b><span>токенів за секунду на один запит</span></div>
      <div class="lab__stat is-green"><b>{{ n0(B / s.t) }}</b><span>токенів за секунду разом</span></div>
      <div class="lab__stat" :class="fits ? '' : 'is-warm'">
        <b>{{ fits ? 'вміщається' : 'не вміщається' }}</b>
        <span>кеш: до {{ nRes }} запитів із резервом, {{ nPaged }} посторінково</span>
      </div>
    </div>

    <svg class="bl__svg" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Токенів за секунду разом залежно від розміру батча">
      <line :x1="PAD" :x2="W - 8" :y1="py(limit)" :y2="py(limit)" class="bl__lim" />
      <text :x="W - 10" :y="py(limit) - 5" text-anchor="end" class="bl__txt">межа {{ n0(limit) }} ток/с</text>
      <line v-for="(n, i) in [nRes, nPaged]" :key="i" :x1="px(n)" :x2="px(n)" :y1="12" :y2="H - 18" class="bl__mark" />
      <text :x="px(nRes) + 3" :y="H - 24" class="bl__txt">{{ nRes }}</text>
      <text :x="px(nPaged) + 3" :y="H - 24" class="bl__txt">{{ nPaged }}</text>
      <path :d="path" class="bl__curve" />
      <circle :cx="px(B)" :cy="py(B / s.t)" r="5" class="bl__dot" />
      <line :x1="PAD" :x2="W - 8" :y1="H - 18" :y2="H - 18" class="bl__axis" />
      <text :x="PAD" :y="H - 3" class="bl__txt">1</text>
      <text :x="W - 8" :y="H - 3" text-anchor="end" class="bl__txt">{{ MAXB }} запитів у батчі</text>
    </svg>
  </div>
</template>

<style scoped>
.bl__step { display: flex; height: 1.9rem; border-radius: 8px; overflow: hidden; margin: 0.8rem 0 0.3rem; font-size: 0.74rem; }
.bl__step span { display: flex; align-items: center; padding: 0 0.5rem; white-space: nowrap; overflow: hidden; flex-basis: 0; }
.bl__w { background: var(--uk-accent); color: var(--vp-c-bg); }
.bl__kv { background: var(--uk-green); color: var(--vp-c-bg); }
.bl__cap { font-size: 0.78rem; color: var(--vp-c-text-2); margin-bottom: 0.4rem; }
.bl__svg { width: 100%; height: auto; display: block; margin-top: 0.6rem; }
.bl__curve { fill: none; stroke: var(--uk-green); stroke-width: 2; }
.bl__dot { fill: var(--vp-c-bg); stroke: var(--uk-green); stroke-width: 2.5; }
.bl__lim { stroke: var(--uk-warm); stroke-dasharray: 4 3; stroke-width: 1.2; }
.bl__mark { stroke: var(--vp-c-text-3); stroke-dasharray: 2 3; stroke-width: 1; }
.bl__axis { stroke: var(--uk-line); }
.bl__txt { font-size: 12px; fill: var(--vp-c-text-2); }
</style>
