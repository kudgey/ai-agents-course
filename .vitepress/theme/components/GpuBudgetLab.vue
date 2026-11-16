<script setup lang="ts">
/**
 * Пам'ять картки під асистента ФОП: ваги, запас, пул KV-кешу і скільки запитів у ньому вміщається.
 * Арифметика — спільна lib/l09.js; l09_calc.py --check звіряє її з генератором (lec09.json).
 * stage="1": лише вибір картки, ваги BF16, резерв на весь бюджет запиту (розділ 1).
 * stage="4": RTX 4090 і чотири сходинки лекції — BF16, AWQ, сторінки кешу, кеш FP8 (розділ 4).
 *   У режимі резерву клітинка показує, яку частку резерву запит справді заповнює.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec09.json'
import { budget, kvPerToken } from '../lib/l09.js'

const props = withDefaults(defineProps<{ stage?: string }>(), { stage: '4' })
const full = computed(() => props.stage !== '1')
const FMT = Object.fromEntries(data.formats.map((f) => [f.key, f]))

const STEPS = [
  { label: 'BF16, резерв', fmt: 'bf16', kv: 2, paged: false },
  { label: 'AWQ, резерв', fmt: 'awq', kv: 2, paged: false },
  { label: 'AWQ, сторінки', fmt: 'awq', kv: 2, paged: true },
  { label: 'AWQ, сторінки, кеш FP8', fmt: 'awq', kv: 1, paged: true },
]
const dev = ref(data.devices[0])
const si = ref(0)
const st = computed(() => STEPS[si.value])
const fmt = computed(() => FMT[st.value.fmt])
const kvBytes = computed(() => st.value.kv)
const paged = computed(() => st.value.paged)
const used = computed(() => (full.value && !paged.value ? data.request.total / data.request.budget : 1))

const tokens = computed(() => (full.value && paged.value ? data.request.total : data.request.budget))
const b = computed(() => budget(data, dev.value, full.value ? fmt.value : FMT.bf16, full.value ? kvBytes.value : 2, tokens.value))
const w = computed(() => (full.value ? fmt.value : FMT.bf16).bytes / 1e9)
const pct = (x: number) => (100 * x) / b.value.total
const blocks = computed(() => Math.min(b.value.n, 400))
const f2 = (x: number) => x.toFixed(2)
const kib = computed(() => kvPerToken(data.model, full.value ? kvBytes.value : 2) / 1024)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Пам'ять картки під асистента ФОП</div>
        <div class="lab__sub">
          Смуга — уся пам'ять картки. vLLM бере {{ data.util * 100 }} %: з них ваги, запас на активації, решта — пул KV-кешу.
          Кожна клітинка в пулі — кеш одного запиту на {{ tokens.toLocaleString('uk-UA') }} токенів<template v-if="full && !paged">;
          темна частина — {{ data.request.total.toLocaleString('uk-UA') }} токенів, які запит справді заповнює, світла — порожній резерв</template>.
        </div>
      </div>
    </div>

    <div v-if="!full" class="lab__pills">
      <button v-for="d in data.devices" :key="d.key" class="lab__pill" :class="{ 'is-on': dev.key === d.key }" @click="dev = d">
        {{ d.label }}, {{ d.mem_gib }} ГіБ
      </button>
    </div>
    <div v-else class="lab__pills">
      <button v-for="(x, i) in STEPS" :key="i" class="lab__pill" :class="{ 'is-on': si === i }" @click="si = i">{{ i + 1 }}. {{ x.label }}</button>
    </div>

    <div class="gb__bar">
      <span class="gb__w" :style="{ width: pct(w) + '%' }" />
      <span class="gb__r" :style="{ width: pct(data.overhead) + '%' }" />
      <span class="gb__kv" :style="{ width: pct(Math.max(0, b.pool)) + '%' }">
        <i v-for="i in blocks" :key="i" :style="{ width: (100 * b.per) / Math.max(b.pool, 1e-9) + '%', '--used': used * 100 + '%' }" />
      </span>
      <span class="gb__free" />
    </div>
    <div class="gb__legend">
      <span><i class="gb__w" />ваги {{ f2(w) }} ГБ</span>
      <span><i class="gb__r" />запас {{ data.overhead }} ГБ</span>
      <span><i class="gb__kvl" />пул KV, клітинка — запит</span>
      <span v-if="used < 1"><i class="gb__kvr" />порожній резерв</span>
      <span><i class="gb__free" />не бере vLLM</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="b.n < 4 ? 'is-warm' : 'is-green'"><b>{{ b.n }}</b><span>запитів одночасно</span></div>
      <div class="lab__stat"><b>{{ f2(b.pool) }} ГБ</b><span>пул KV-кешу</span></div>
      <div v-if="full" class="lab__stat" :class="used < 1 ? 'is-warm' : ''"><b>{{ Math.round(used * 100) }} %</b><span>пулу справді зайнято токенами</span></div>
      <div v-else class="lab__stat"><b>{{ b.per.toFixed(3) }} ГБ</b><span>кеш одного запиту, {{ kib }} КіБ на токен</span></div>
    </div>

    <div class="gb__calc">
      {{ data.util }} × {{ f2(b.total) }} − {{ f2(w) }} − {{ data.overhead.toFixed(1) }} = {{ f2(b.pool) }} ГБ;
      {{ f2(b.pool) }} / {{ b.per.toFixed(3) }} = {{ (b.pool / b.per).toFixed(2) }} → {{ b.n }}
    </div>
  </div>
</template>

<style scoped>
.gb__bar { display: flex; height: 2.4rem; border: 1px solid var(--uk-line); border-radius: 8px; overflow: hidden; margin: 0.8rem 0 0.4rem; background: var(--uk-fill); }
.gb__bar > span { height: 100%; flex: none; position: relative; }
.gb__w { background: var(--uk-accent); }
.gb__r { background: #9a9aa8; }
.gb__kv { background: var(--uk-green-soft); display: flex; gap: 1px; padding: 3px; box-sizing: border-box; overflow: hidden; }
.gb__kv i { flex: none; height: 100%; border-radius: 2px; min-width: 1px; background: linear-gradient(to top, var(--uk-green) var(--used, 100%), var(--uk-green-soft) var(--used, 100%)); box-shadow: inset 0 0 0 1px var(--uk-green); }
.gb__kvr { background: var(--uk-green-soft); box-shadow: inset 0 0 0 1px var(--uk-green); }
.gb__kvl { background: var(--uk-green); }
.gb__free { flex: 1 1 auto !important; background: repeating-linear-gradient(45deg, var(--uk-fill), var(--uk-fill) 4px, var(--uk-line) 4px, var(--uk-line) 5px); }
.gb__legend { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; font-size: 0.74rem; color: var(--vp-c-text-2); margin-bottom: 0.6rem; }
.gb__legend i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; margin-right: 0.3rem; vertical-align: -1px; }
.gb__calc { font-family: var(--vp-font-family-mono); font-size: 0.8rem; padding: 0.45rem 0.7rem; background: var(--uk-fill); border-radius: 8px; margin-top: 0.6rem; overflow-wrap: anywhere; }
</style>
