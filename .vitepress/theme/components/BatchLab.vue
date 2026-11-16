<script setup lang="ts">
/**
 * Крок декоду на RTX 4090 для батча з B користувачів асистента ФОП: ваги читаються один раз на всіх,
 * кеш — кожного окремо. Формула — спільна lib/l09.js; числа заліза й моделі — lec09.json.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec09.json'
import { budget, step } from '../lib/l09.js'

const FMT = Object.fromEntries(data.formats.map((f) => [f.key, f]))
const fmts = ['bf16', 'awq'].map((k) => FMT[k])
const dev = data.devices[0]
const fmt = ref(FMT.awq)
const B = ref(1)
const MAXB = 29

const s = computed(() => step(data, dev, fmt.value, B.value))
const wGB = computed(() => fmt.value.bytes / 1e9)
const kvGB = computed(() => s.value.mem * dev.bw - wGB.value)
const wMs = computed(() => (wGB.value / dev.bw) * 1000)
const kvMs = computed(() => (kvGB.value / dev.bw) * 1000)
// шкала смуги — найдовший крок на повзунку, щоб було видно, як вона росте
const maxMs = computed(() => step(data, dev, FMT.bf16, MAXB).mem * 1000)
const nRes = computed(() => budget(data, dev, fmt.value).n)
const n0 = (v: number) => Math.round(v).toLocaleString('uk-UA')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Один крок декоду на RTX 4090</div>
        <div class="lab__sub">
          За один крок кожен користувач отримує один токен. Ваги картка читає один раз на всіх, кеш — кожного окремо.
        </div>
      </div>
    </div>
    <div class="lab__pills">
      <button v-for="f in fmts" :key="f.key" class="lab__pill" :class="{ 'is-on': fmt.key === f.key }" @click="fmt = f">ваги {{ f.label }}</button>
    </div>
    <label class="lab__ctl">
      <span>Користувачів одночасно <b>{{ B }}</b></span>
      <input v-model.number="B" type="range" min="1" :max="MAXB" step="1" />
    </label>

    <div class="bl__track">
      <span class="bl__w" :style="{ width: (100 * wMs) / maxMs + '%' }">ваги</span>
      <span class="bl__kv" :style="{ width: (100 * kvMs) / maxMs + '%', padding: kvMs > 1.6 ? '0 0.5rem' : '0' }"><template v-if="kvMs > 1.6">кеш × {{ B }}</template></span>
    </div>
    <div class="bl__cap">
      Крок: {{ wGB.toFixed(2) }} ГБ ваг + {{ B }} × 0.44 ГБ кешу = {{ (wGB + kvGB).toFixed(2) }} ГБ;
      при {{ n0(dev.bw) }} ГБ/с це {{ (s.t * 1000).toFixed(2) }} мс
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ (1 / s.t).toFixed(0) }}</b><span>токенів за секунду кожному</span></div>
      <div class="lab__stat is-green"><b>{{ n0(B / s.t) }}</b><span>токенів за секунду всім разом</span></div>
    </div>
    <p v-if="B > nRes" class="bl__warn">
      У пам'ять із резервом 8 192 токени на запит поміщається лише {{ nRes }} {{ nRes === 3 ? 'запити' : 'запитів' }}. Як умістити більше — розділ 4.
    </p>
  </div>
</template>

<style scoped>
.bl__track { display: flex; height: 1.9rem; border-radius: 8px; overflow: hidden; margin: 0.8rem 0 0.3rem; font-size: 0.74rem; background: var(--uk-fill); }
.bl__track span { display: flex; align-items: center; padding: 0 0.5rem; white-space: nowrap; overflow: hidden; flex: none; box-sizing: border-box; transition: width 0.15s; }
.bl__w { background: var(--uk-accent); color: var(--vp-c-bg); }
.bl__kv { background: var(--uk-green); color: var(--vp-c-bg); }
.bl__cap { font-family: var(--vp-font-family-mono); font-size: 0.78rem; color: var(--vp-c-text-2); margin-bottom: 0.4rem; overflow-wrap: anywhere; }
.bl__warn { font-size: 0.82rem; color: var(--uk-warm); margin: 0.5rem 0 0; }
</style>
