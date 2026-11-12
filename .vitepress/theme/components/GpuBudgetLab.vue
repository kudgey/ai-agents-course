<script setup lang="ts">
/**
 * Пам'ять картки під асистента ФОП: ваги, запас, пул KV-кешу і скільки запитів у ньому вміщається.
 * Арифметика — спільна lib/l09.js; l09_calc.py --check звіряє її з генератором (lec09.json).
 * stage="1": лише вибір картки, ваги BF16, резерв на весь бюджет запиту (розділ 1).
 * stage="4": ще формат ваг, точність кешу й посторінковий кеш (розділ 4).
 */
import { ref, computed } from 'vue'
import data from '../../data/lec09.json'
import { budget, kvPerToken } from '../lib/l09.js'

const props = withDefaults(defineProps<{ stage?: string }>(), { stage: '4' })
const full = computed(() => props.stage !== '1')
const FMT = Object.fromEntries(data.formats.map((f) => [f.key, f]))
const fmts = data.server_formats.map((k: string) => FMT[k])

const dev = ref(data.devices[0])
const fmt = ref(FMT.bf16)
const kvBytes = ref(2)
const paged = ref(false)

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
          Кожна клітинка в пулі — кеш одного запиту на {{ tokens.toLocaleString('uk-UA') }} токенів.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="d in data.devices" :key="d.key" class="lab__pill" :class="{ 'is-on': dev.key === d.key }" @click="dev = d">
        {{ d.label }}, {{ d.mem_gib }} ГіБ
      </button>
    </div>
    <template v-if="full">
      <div class="lab__pills">
        <button v-for="f in fmts" :key="f.key" class="lab__pill" :class="{ 'is-on': fmt.key === f.key }" @click="fmt = f">ваги {{ f.label }}</button>
      </div>
      <div class="lab__pills">
        <button class="lab__pill" :class="{ 'is-on': kvBytes === 2 }" @click="kvBytes = 2">кеш BF16</button>
        <button class="lab__pill" :class="{ 'is-on': kvBytes === 1 }" @click="kvBytes = 1">кеш FP8</button>
        <button class="lab__pill" :class="{ 'is-on': !paged }" @click="paged = false">резерв {{ data.request.budget.toLocaleString('uk-UA') }} на запит</button>
        <button class="lab__pill" :class="{ 'is-on': paged }" @click="paged = true">сторінки: фактичні {{ data.request.total.toLocaleString('uk-UA') }}</button>
      </div>
    </template>

    <div class="gb__bar">
      <span class="gb__w" :style="{ width: pct(w) + '%' }" />
      <span class="gb__r" :style="{ width: pct(data.overhead) + '%' }" />
      <span class="gb__kv" :style="{ width: pct(Math.max(0, b.pool)) + '%' }">
        <i v-for="i in blocks" :key="i" :style="{ width: (100 * b.per) / Math.max(b.pool, 1e-9) + '%' }" />
      </span>
      <span class="gb__free" />
    </div>
    <div class="gb__legend">
      <span><i class="gb__w" />ваги {{ f2(w) }} ГБ</span>
      <span><i class="gb__r" />запас {{ data.overhead }} ГБ</span>
      <span><i class="gb__kvl" />пул KV, клітинка — запит</span>
      <span><i class="gb__free" />не бере vLLM</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="b.n < 4 ? 'is-warm' : 'is-green'"><b>{{ b.n }}</b><span>запитів одночасно</span></div>
      <div class="lab__stat"><b>{{ f2(b.pool) }} ГБ</b><span>пул KV-кешу</span></div>
      <div class="lab__stat"><b>{{ b.per.toFixed(3) }} ГБ</b><span>кеш одного запиту, {{ kib }} КіБ на токен</span></div>
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
.gb__kv i { flex: none; height: 100%; background: var(--uk-green); border-radius: 2px; min-width: 1px; }
.gb__kvl { background: var(--uk-green); }
.gb__free { flex: 1 1 auto !important; background: repeating-linear-gradient(45deg, var(--uk-fill), var(--uk-fill) 4px, var(--uk-line) 4px, var(--uk-line) 5px); }
.gb__legend { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; font-size: 0.74rem; color: var(--vp-c-text-2); margin-bottom: 0.6rem; }
.gb__legend i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; margin-right: 0.3rem; vertical-align: -1px; }
.gb__calc { font-family: var(--vp-font-family-mono); font-size: 0.8rem; padding: 0.45rem 0.7rem; background: var(--uk-fill); border-radius: 8px; margin-top: 0.6rem; overflow-wrap: anywhere; }
</style>
