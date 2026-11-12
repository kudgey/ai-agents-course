<script setup lang="ts">
/**
 * Квантизація на справжніх вагах: 64 ваги однієї групи моделі лекції 03 (lec09.json, зріз із
 * body.layers.2.linear2). JS лише округлює ці 64 числа; перплексію всієї моделі порахував
 * l09_calc.py тим самим кодом, що блок лекції, і вона береться з даних.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec09.json'

const Q = data.quant
const S = Q.slice
const W = S.weights as number[]
const BITS = [8, 4, 3, 2]
const bits = ref(4)
const group = ref(false)

const qmax = computed(() => 2 ** (bits.value - 1) - 1)
const scale = computed(() => (group.value ? S.group_max : S.tensor_max) / qmax.value)
const q = computed(() => W.map((w) => Math.round(w / scale.value)))
const zeros = computed(() => q.value.filter((v) => v === 0).length)
const err = computed(() => W.reduce((s, w, i) => s + Math.abs(w - q.value[i] * scale.value), 0) / W.length)
const row = computed(() => Q.grid.find((g) => g.bits === bits.value && (g.group === 64) === group.value)!)
const ex = W.reduce((best, w) => (Math.abs(Math.abs(w) - 0.1) < Math.abs(Math.abs(best) - 0.1) ? w : best), W[0])

// вісь трохи ширша за ваги групи: крок сітки з одним масштабом на ній видно і так
const X = S.group_max * 1.35
const x = (v: number) => 12 + ((v + X) / (2 * X)) * 376
const ticks = computed(() => {
  const out: number[] = []
  for (let k = -qmax.value; k <= qmax.value; k++) if (Math.abs(k * scale.value) <= X) out.push(k * scale.value)
  return out
})
const sample = computed(() => (bits.value === 4 && group.value ? Q.samples.q4g64 : bits.value === 2 && group.value ? Q.samples.q2g64 : null))
const f = (v: number, d = 4) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Округлення до сітки на справжніх вагах</div>
        <div class="lab__sub">
          Верхній ряд — 64 ваги однієї групи моделі лекції 03, нижній — вони ж після округлення; помаранчеві стали нулем.
          Сірі риски — рівні сітки. Один масштаб на матрицю бере крок від найбільшої ваги всієї матриці, групи — від найбільшої ваги цих 64.
        </div>
      </div>
    </div>
    <div class="lab__pills">
      <button v-for="b in BITS" :key="b" class="lab__pill" :class="{ 'is-on': bits === b }" @click="bits = b">{{ b }} біт</button>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': !group }" @click="group = false">один масштаб на матрицю</button>
      <button class="lab__pill" :class="{ 'is-on': group }" @click="group = true">групи по 64</button>
    </div>

    <svg class="ql__svg" viewBox="0 0 400 124" role="img" aria-label="Ваги до і після округлення">
      <line v-for="(t, i) in ticks" :key="i" :x1="x(t)" :x2="x(t)" y1="18" y2="102" class="ql__tick" :style="{ strokeOpacity: bits === 8 ? 0.35 : 1 }" />
      <line :x1="x(0)" :x2="x(0)" y1="12" y2="108" class="ql__zero" />
      <line v-for="(w, i) in W" :key="'l' + i" :x1="x(w)" y1="28" :x2="x(q[i] * scale)" y2="92" class="ql__link" />
      <circle v-for="(w, i) in W" :key="'a' + i" :cx="x(w)" cy="28" r="3.2" class="ql__dot" />
      <circle v-for="(w, i) in W" :key="'b' + i" :cx="x(q[i] * scale)" cy="92" r="3.6" class="ql__dot" :class="{ 'is-zero': q[i] === 0 }" />
      <text :x="x(0)" y="117" class="ql__lab" text-anchor="middle">0</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat" :class="zeros > 20 ? 'is-warm' : ''"><b>{{ zeros }} з 64</b><span>ваг стали нулем</span></div>
      <div class="lab__stat"><b>{{ f(err) }}</b><span>середня похибка ваги</span></div>
      <div class="lab__stat" :class="row.delta > 0.1 ? 'is-warm' : 'is-green'"><b>{{ row.ppl.toFixed(2) }}</b><span>перплексія всієї моделі, без квантизації {{ Q.base.toFixed(2) }}</span></div>
    </div>

    <div class="ql__calc">
      s = {{ f(group ? S.group_max : S.tensor_max) }} / {{ qmax }} = {{ f(scale) }};
      w = {{ f(ex) }} → {{ f(ex / scale, 3) }} → {{ Math.round(ex / scale) }} → {{ Math.round(ex / scale) }} × {{ f(scale) }} = {{ f(Math.round(ex / scale) * scale) }}
    </div>
    <p v-if="sample" class="ql__sample">
      Без квантизації модель пише: «{{ Q.samples.base }}»<br />
      На цих налаштуваннях: «{{ sample }}»
    </p>
  </div>
</template>

<style scoped>
.ql__svg { width: 100%; height: auto; display: block; margin: 0.6rem 0 0.2rem; }
.ql__tick { stroke: var(--uk-line); stroke-width: 1; }
.ql__zero { stroke: var(--vp-c-text-3); stroke-width: 1; stroke-dasharray: 3 3; }
.ql__link { stroke: var(--uk-accent); stroke-opacity: 0.35; stroke-width: 1; }
.ql__dot { fill: var(--uk-accent); }
.ql__dot.is-zero { fill: var(--uk-warm); }
.ql__lab { font-size: 12px; fill: var(--vp-c-text-3); }
.ql__calc { font-family: var(--vp-font-family-mono); font-size: 0.8rem; padding: 0.45rem 0.7rem; background: var(--uk-fill); border-radius: 8px; margin-top: 0.6rem; overflow-wrap: anywhere; }
.ql__sample { font-size: 0.82rem; margin: 0.6rem 0 0; color: var(--vp-c-text-2); }
</style>
