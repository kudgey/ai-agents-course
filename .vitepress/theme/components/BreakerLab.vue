<script setup lang="ts">
/**
 * «Запобіжник у дії»: два виклики на секунду йдуть через автомат CLOSED / OPEN / HALF_OPEN
 * зі значеннями resilience4j за замовчуванням. Слід (результат кожного виклику, стан,
 * частка невдач у вікні, події) пораховано генератором у lec05.json; віджет його програє.
 * «Крок» переходить до наступної події, «відтворити» прокручує час.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import data from '../../data/lec05.json'
import { useStepper } from '../composables/useStepper'
import StepControls from './StepControls.vue'

type Ev = { t: number; to: string; why: string }
type Sc = { label: string; outage: number[]; outcome: string; state: string; rate: number[]; events: Ev[]; to_provider: number; fallback: number; max_rate: number }

const P = data.breaker.params as { window: number; threshold: number; wait_s: number; trial: number; rate: number }
const SC = data.breaker.scenarios as Record<string, Sc>
const key = ref<'long' | 'short'>('long')
const sc = computed(() => SC[key.value])
const T = computed(() => sc.value.outcome.length / P.rate)   // тривалість сліду, с
const DT = 2                                                 // кадр анімації — 2 с
const frames = computed(() => Math.round(T.value / DT))

const { step, playing, reduced, play, reset, jump, done } = useStepper(() => frames.value, { interval: 60 })
watch(key, () => jump(frames.value))

const tNow = computed(() => Math.min(T.value, step.value * DT))
const nNow = computed(() => Math.min(sc.value.outcome.length, Math.round(tNow.value * P.rate)))
// стан, у якому зустріне наступний виклик (перехід записано після виклику, що його спричинив)
const stateNow = computed(() => sc.value.state[Math.min(nNow.value, sc.value.state.length - 1)] ?? 'C')
const seen = computed(() => sc.value.outcome.slice(0, nNow.value))
const rateNow = computed(() => {
  for (let i = nNow.value - 1; i >= 0; i--) if (sc.value.rate[i] >= 0) return sc.value.rate[i]
  return 0
})
const evNow = computed(() => sc.value.events.filter((e) => e.t <= tNow.value))
function nextEvent() {
  const e = sc.value.events.find((x) => x.t > tNow.value + 1e-9)
  jump(e ? Math.ceil(e.t / DT) : frames.value)
}

// ── геометрія: на телефоні вужча сцена й крупніший текст ────────────────
const narrow = ref(false)
let mq: MediaQueryList | undefined
const onMq = () => (narrow.value = !!mq?.matches)
onMounted(() => { mq = window.matchMedia('(max-width: 720px)'); onMq(); mq.addEventListener('change', onMq) })
onBeforeUnmount(() => mq?.removeEventListener('change', onMq))
const W = computed(() => (narrow.value ? 340 : 640))
const L = 30, R = 8, TOP = 16, H_RATE = 90, H_TICK = 12
const H = TOP + H_RATE + 10 + H_TICK + 22
const x = (t: number) => L + (t / T.value) * (W.value - L - R)
const yR = (r: number) => TOP + H_RATE * (1 - r / 100)

const bands = computed(() => {
  const out: { a: number; b: number; s: string }[] = []
  const st = sc.value.state
  let start = 0
  for (let i = 1; i <= st.length; i++) {
    if (i === st.length || st[i] !== st[start]) {
      out.push({ a: start / P.rate, b: i / P.rate, s: st[start] })
      start = i
    }
  }
  return out
})
const ratePath = computed(() => {
  let d = ''
  let pen = false
  sc.value.rate.forEach((r, i) => {
    if (r < 0) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i / P.rate).toFixed(1)},${yR(r).toFixed(1)}`
    pen = true
  })
  return d
})
const ticks = computed(() => {
  const by: Record<string, string> = { o: '', f: '', b: '' }
  const w = Math.max(0.6, (W.value - L - R) / sc.value.outcome.length)
  const y = TOP + H_RATE + 10
  for (let i = 0; i < sc.value.outcome.length; i++)
    by[sc.value.outcome[i]] += `M${x(i / P.rate).toFixed(2)},${y}h${w.toFixed(2)}v${H_TICK}h-${w.toFixed(2)}z`
  return by
})
const axis = computed(() => Array.from({ length: Math.floor(T.value / 60) + 1 }, (_, i) => i * 60))
const NAMES: Record<string, string> = { C: 'CLOSED', O: 'OPEN', H: 'HALF_OPEN' }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Запобіжник у дії</div>
        <div class="lab__sub">
          Два виклики на секунду, значення resilience4j за замовчуванням: вікно
          {{ P.window }} викликів, поріг {{ P.threshold }} %, {{ P.wait_s }} с в OPEN,
          {{ P.trial }} пробних. Провайдер лежить у заштрихований проміжок.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="(s, k) in SC" :key="k" class="lab__pill" :class="{ 'is-on': key === k }"
              @click="key = k as 'long' | 'short'">{{ s.label }}: {{ s.outage[0] }}–{{ s.outage[1] }} с</button>
    </div>

    <StepControls :playing="playing" :reduced="reduced" :done="done"
                  :label="`t = ${tNow.toFixed(0)} с`" @step="nextEvent" @play="play" @reset="reset" />

    <div class="br__states">
      <span v-for="(n, s) in NAMES" :key="s" class="br__st" :class="['s-' + s, { 'is-on': stateNow === s }]">{{ n }}</span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="br__svg" role="img" aria-label="Стан запобіжника і частка невдач у часі">
      <defs>
        <clipPath :id="'brc-' + key"><rect :x="0" :y="0" :width="x(tNow)" :height="H" /></clipPath>
        <pattern id="br-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" class="br__hatch" />
        </pattern>
      </defs>
      <rect :x="x(sc.outage[0])" :y="TOP" :width="x(sc.outage[1]) - x(sc.outage[0])" :height="H_RATE" fill="url(#br-hatch)" />
      <g :clip-path="`url(#brc-${key})`">
        <rect v-for="(b, i) in bands" :key="i" :x="x(b.a)" :y="TOP" :width="x(b.b) - x(b.a)" :height="H_RATE" :class="'br__band s-' + b.s" />
        <path :d="ratePath" class="br__rate" />
        <path :d="ticks.o" class="br__ok" />
        <path :d="ticks.f" class="br__fail" />
        <path :d="ticks.b" class="br__fb" />
      </g>
      <line :x1="L" :x2="W - R" :y1="yR(P.threshold)" :y2="yR(P.threshold)" class="br__thr" />
      <text :x="L - 4" :y="yR(P.threshold) + 3" class="br__lbl" text-anchor="end">50 %</text>
      <text :x="L - 4" :y="yR(100) + 3" class="br__lbl" text-anchor="end">100</text>
      <text :x="L - 4" :y="yR(0) + 3" class="br__lbl" text-anchor="end">0</text>
      <line :x1="x(tNow)" :x2="x(tNow)" :y1="TOP - 6" :y2="TOP + H_RATE + 10 + H_TICK" class="br__cursor" />
      <g v-for="a in axis" :key="a">
        <text :x="x(a)" :y="H - 6" class="br__lbl" text-anchor="middle">{{ a }} с</text>
      </g>
    </svg>
    <div class="br__legend">
      <span><i class="br__sw br__sw--rate" /> частка невдач у вікні</span>
      <span><i class="br__sw br__sw--ok" /> успіх</span>
      <span><i class="br__sw br__sw--fail" /> збій</span>
      <span><i class="br__sw br__sw--fb" /> запасна модель</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ seen.replace(/b/g, '').length }}</b><span>викликів до провайдера</span></div>
      <div class="lab__stat is-warm"><b>{{ (seen.match(/b/g) || []).length }}</b><span>відповіла запасна модель</span></div>
      <div class="lab__stat is-green"><b>{{ stateNow === 'O' ? '—' : rateNow + ' %' }}</b><span>невдач у поточному вікні</span></div>
    </div>

    <ol class="br__log">
      <li v-if="!sc.events.length" class="is-quiet">
        Жодного переходу: найбільша частка невдач у вікні — {{ sc.max_rate }} %, нижче порога.
      </li>
      <li v-for="e in sc.events" :key="e.t" :class="{ 'is-future': e.t > tNow }">
        <b>t = {{ e.t }} с</b> → {{ e.to }}: {{ e.why }}
      </li>
    </ol>

    <p class="lab__note">
      Що тут видно: поки частка невдач у вікні нижча за 50 %, виклики йдуть до провайдера.
      Щойно вона досягає порога, запобіжник відкривається, і 60 с відповідає запасна модель.
      Пробні виклики перевіряють, чи провайдер ожив. Короткий збій запобіжник не відкриває:
      його закривають ретраї.
    </p>
  </div>
</template>

<style scoped>
.br__states { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.6rem; }
.br__st { font-size: 0.76rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 999px; border: 1.5px solid var(--uk-line); color: var(--vp-c-text-3); transition: all 0.25s ease; }
.br__st.is-on.s-C { background: var(--uk-green); border-color: var(--uk-green); color: #fff; }
.br__st.is-on.s-O { background: var(--uk-warm); border-color: var(--uk-warm); color: #fff; }
.br__st.is-on.s-H { background: var(--uk-accent); border-color: var(--uk-accent); color: #fff; }
.br__svg { width: 100%; height: auto; display: block; }
.br__band.s-C { fill: var(--uk-green-soft); }
.br__band.s-O { fill: var(--uk-warm-soft); }
.br__band.s-H { fill: var(--uk-accent-soft); }
.br__hatch { stroke: var(--uk-warm); stroke-width: 1; opacity: 0.35; }
.br__rate { fill: none; stroke: var(--uk-accent); stroke-width: 1.6; }
.br__thr { stroke: var(--uk-warm); stroke-dasharray: 4 3; stroke-width: 1.2; }
.br__ok { fill: var(--uk-green); }
.br__fail { fill: var(--uk-warm); }
.br__fb { fill: var(--vp-c-text-3); opacity: 0.45; }
.br__cursor { stroke: var(--vp-c-text-2); stroke-width: 1; }
.br__lbl { font-size: 10px; fill: var(--vp-c-text-3); }
.br__legend { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; font-size: 0.75rem; color: var(--vp-c-text-3); margin-top: 0.3rem; }
.br__sw { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; vertical-align: -0.05rem; margin-right: 0.2rem; }
.br__sw--rate { height: 2px; background: var(--uk-accent); vertical-align: 0.2rem; }
.br__sw--ok { background: var(--uk-green); }
.br__sw--fail { background: var(--uk-warm); }
.br__sw--fb { background: var(--vp-c-text-3); opacity: 0.45; }
.br__log { list-style: none; padding: 0; margin: 0.8rem 0 0; font-size: 0.8rem; line-height: 1.5; }
.br__log li { margin: 0.15rem 0; color: var(--vp-c-text-2); transition: opacity 0.25s ease; }
.br__log li b { font-family: var(--vp-font-family-mono); font-size: 0.76rem; font-weight: 500; }
.br__log li.is-future { opacity: 0.35; }
.br__log li.is-quiet { color: var(--uk-green); }
</style>
