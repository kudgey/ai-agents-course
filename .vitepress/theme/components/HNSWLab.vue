<script setup lang="ts">
/**
 * «HNSW: прогулянка поверхами». Іграшковий граф на 40 вершин (M = 4, рівні — за формулою
 * з тексту) і справжній алгоритм пошуку HNSW: жадібно на верхніх поверхах, з efSearch
 * кандидатами на нижньому. Граф і слід кожного пошуку записав gen_lec06_toy.py
 * у lec06_toy.json; віджет лише програє слід. За замовчуванням — середній запит, efSearch = 1.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import data from '../../data/lec06_toy.json'
import { useStepper } from '../composables/useStepper'
import StepControls from './StepControls.vue'

type Ev = { floor: number; c: number; eval: number[]; W: number[] }
type Run = { trace: Ev[]; dist: number; result: number; found: boolean }
const G = data.hnsw as {
  M: number; k: number; pts: number[][]; levels: number[]; entry: number; floors: number[][]
  edges: number[][][]; efs: number[]; queries: { q: number[]; true_nn: number; runs: Record<string, Run> }[]
}
const N = G.pts.length
const TOPF = G.floors.length - 1
const QNAMES = ['ліворуч', 'посередині', 'праворуч']

const qi = ref(1)
const ef = ref(1)
const run = computed(() => G.queries[qi.value].runs[String(ef.value)])
const { step, playing, reduced, next, play, reset, jump, done } = useStepper(() => run.value.trace.length, { interval: 650 })
watch([qi, ef], () => jump(run.value.trace.length))

const seen = computed(() => run.value.trace.slice(0, step.value))
const ev = computed(() => (step.value ? run.value.trace[step.value - 1] : null))
const visited = computed(() => new Set([G.entry, ...seen.value.flatMap((e) => e.eval)]))
const dists = computed(() => 1 + seen.value.reduce((s, e) => s + e.eval.length, 0))
const floorNow = computed(() => (ev.value ? ev.value.floor : TOPF))
/** Шлях: послідовність вершин, які розкривали, по поверхах. */
const paths = computed(() => {
  const by: Record<number, number[]> = {}
  for (const e of seen.value) (by[e.floor] ??= []).push(e.c)
  return by
})

// ── геометрія ──
const narrow = ref(false)
let mq: MediaQueryList | undefined
const onMq = () => (narrow.value = !!mq?.matches)
onMounted(() => { mq = window.matchMedia('(max-width: 720px)'); onMq(); mq.addEventListener('change', onMq) })
onBeforeUnmount(() => mq?.removeEventListener('change', onMq))
const W = computed(() => (narrow.value ? 340 : 640))
const BAND = 44, GAP = 10, LEFT = 8, RIGHT = 8, TOP = 4
const H = computed(() => TOP + (TOPF + 1) * (BAND + GAP))
const x = (v: number) => LEFT + ((v - 0.4) / 10.7) * (W.value - LEFT - RIGHT)
const yOf = (f: number) => TOP + (TOPF - f) * (BAND + GAP)
const y = (f: number, v: number) => yOf(f) + 10 + (1 - v) * (BAND - 18)
const P = (f: number, i: number) => ({ x: x(G.pts[i][0]), y: y(f, G.pts[i][1]) })
const q = computed(() => G.queries[qi.value].q)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">HNSW: прогулянка поверхами</div>
        <div class="lab__sub">
          Іграшковий граф на {{ N }} вершин, M = {{ G.M }} (у прогоні вище M = 16); рівні — за
          формулою з тексту, сусіди — {{ G.k }} найближчі на поверсі (спрощення побудови).
          Пошук — справжній алгоритм HNSW.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="(n, i) in QNAMES" :key="n" class="lab__pill" :class="{ 'is-on': qi === i }" @click="qi = i">запит {{ i + 1 }}: {{ n }}</button>
    </div>
    <div class="lab__pills">
      <button v-for="e in G.efs" :key="e" class="lab__pill" :class="{ 'is-on': ef === e }" @click="ef = e">efSearch = {{ e }}</button>
    </div>
    <StepControls :playing="playing" :reduced="reduced" :done="done"
                  :label="`крок ${step} з ${run.trace.length} · поверх ${floorNow}`" @step="next" @play="play" @reset="reset" />

    <svg :viewBox="`0 0 ${W} ${H}`" class="hn__svg" role="img" aria-label="Поверхи графа HNSW і шлях пошуку">
      <g v-for="(ids, f) in G.floors" :key="f">
        <rect :x="2" :y="yOf(f)" :width="W - 4" :height="BAND" rx="6" class="hn__band" :class="{ 'is-now': floorNow === f }" />
        <text :x="W - 10" :y="yOf(f) + 11" class="hn__lbl" text-anchor="end">поверх {{ f }} · {{ ids.length }}</text>
        <line v-for="([i, j], k) in G.edges[f]" :key="k" :x1="P(f, i).x" :y1="P(f, i).y" :x2="P(f, j).x" :y2="P(f, j).y" class="hn__edge" />
        <template v-if="ev && ev.floor === f">
          <line v-for="e in ev.eval" :key="'e' + e"
                :x1="P(f, ev.c).x" :y1="P(f, ev.c).y" :x2="P(f, e).x" :y2="P(f, e).y" class="hn__probe" />
        </template>
        <polyline v-if="paths[f] && paths[f].length > 1" :points="paths[f].map((i) => `${P(f, i).x},${P(f, i).y}`).join(' ')" class="hn__path" />
        <circle v-for="i in ids" :key="i" :cx="P(f, i).x" :cy="P(f, i).y" r="3.6" class="hn__v"
                :class="{ 'is-seen': visited.has(i), 'is-w': f === 0 && ev && ev.floor === 0 && ev.W.includes(i), 'is-nn': done && f === 0 && i === run.result }" />
        <circle v-if="ev && ev.floor === f" :cx="P(f, ev.c).x" :cy="P(f, ev.c).y" r="7" class="hn__cur" />
        <path :d="`M${x(q[0])},${y(f, q[1]) - 6} l1.8,4 4.4,.4 -3.3,2.9 1,4.3 -3.9,-2.3 -3.9,2.3 1,-4.3 -3.3,-2.9 4.4,-.4z`" class="hn__q" :class="{ 'is-dim': f > 0 }" />
      </g>
    </svg>
    <div class="hn__legend">
      <span><i class="hn__sw hn__sw--q" /> запит</span>
      <span><i class="hn__sw hn__sw--cur" /> вершина, яку розкриваємо</span>
      <span><i class="hn__sw hn__sw--seen" /> до неї вже рахували відстань</span>
      <span><i class="hn__sw hn__sw--w" /> кандидати на нижньому поверсі</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ dists }} / {{ N }}</b><span>обчислень відстані</span></div>
      <div class="lab__stat" :class="done ? (run.found ? 'is-green' : 'is-warm') : ''">
        <b>{{ done ? (run.found ? 'так' : 'ні') : '…' }}</b><span>знайдено справжню найближчу</span>
      </div>
    </div>

    <p class="lab__note">
      Що тут видно: нагорі вершин мало, і кілька довгих стрибків підводять пошук до
      потрібної ділянки; на нижньому поверсі він уточнює. Більший efSearch тримає більше
      кандидатів і рахує більше відстаней — на великих графах це й дає вищу повноту.
    </p>
  </div>
</template>

<style scoped>
.hn__svg { width: 100%; height: auto; display: block; }
.hn__band { fill: var(--uk-fill); stroke: var(--uk-line); transition: stroke 0.25s ease; }
.hn__band.is-now { stroke: var(--uk-accent); stroke-width: 1.5; }
.hn__lbl { font-size: 10px; fill: var(--vp-c-text-3); }
.hn__edge { stroke: var(--uk-line); stroke-width: 1; }
.hn__probe { stroke: var(--uk-accent); stroke-width: 1.4; stroke-dasharray: 3 2; opacity: 0.75; }
.hn__path { fill: none; stroke: var(--uk-accent); stroke-width: 2.2; }
.hn__v { fill: var(--vp-c-bg); stroke: var(--vp-c-text-3); stroke-width: 1.2; transition: fill 0.25s ease; }
.hn__v.is-seen { fill: var(--uk-green); stroke: var(--uk-green); }
.hn__v.is-w { stroke: var(--uk-accent); stroke-width: 2.4; }
.hn__v.is-nn { fill: var(--uk-accent); stroke: var(--uk-accent); }
.hn__cur { fill: none; stroke: var(--uk-accent); stroke-width: 2; }
.hn__q { fill: var(--vp-c-text-1); }
.hn__q.is-dim { opacity: 0.35; }
.hn__legend { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; font-size: 0.74rem; color: var(--vp-c-text-3); margin-top: 0.35rem; }
.hn__sw { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 50%; vertical-align: -0.05rem; margin-right: 0.2rem; }
.hn__sw--q { background: var(--vp-c-text-1); border-radius: 2px; }
.hn__sw--cur { border: 2px solid var(--uk-accent); }
.hn__sw--seen { background: var(--uk-green); }
.hn__sw--w { border: 2.4px solid var(--uk-accent); background: var(--vp-c-bg); }
</style>
