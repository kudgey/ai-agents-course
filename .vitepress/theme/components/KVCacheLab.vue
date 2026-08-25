<script setup lang="ts">
/**
 * S_KV = 2 · L · n_kv · d_h · b · s · B — формула зі слайда, підставлена наживо.
 * Пресет Llama 3.1 8B відтворює числа таблиці: 128 КіБ на токен, 16 ГіБ на 128k.
 */
import { ref, computed, watch } from 'vue'

const PRESETS = [
  { name: 'Llama 3.1 8B', L: 32, kv: 8, q: 32, dModel: 4096, params: 8.03, note: 'згрупована увага, 8 KV-голів' },
  { name: 'Якби 32 голови', L: 32, kv: 32, q: 32, dModel: 4096, params: 8.03, note: 'та сама модель без GQA' },
  { name: 'Qwen3 14B', L: 40, kv: 8, q: 40, dModel: 5120, params: 14.8, note: 'GQA, ширший вимір' },
  { name: 'Llama 3.1 70B', L: 80, kv: 8, q: 64, dModel: 8192, params: 70.6, note: 'великий стек' },
]

const p = ref(0)
const L = ref(PRESETS[0].L)
const kv = ref(PRESETS[0].kv)
const q = ref(PRESETS[0].q)
const dModel = ref(PRESETS[0].dModel)
const params = ref(PRESETS[0].params)
const bytes = ref(2)          // bf16
const wBytes = ref(2)         // байтів на вагу
const ctxPow = ref(13)        // 2^13 = 8k
const batch = ref(1)
const gpu = ref(80)           // ГБ на карті

watch(p, (i) => {
  const s = PRESETS[i]
  L.value = s.L; kv.value = s.kv; q.value = s.q; dModel.value = s.dModel; params.value = s.params
})

const ctx = computed(() => 2 ** ctxPow.value)
const headDim = computed(() => Math.round(dModel.value / q.value))
const perToken = computed(() => 2 * L.value * kv.value * headDim.value * bytes.value)
const totalBytes = computed(() => perToken.value * ctx.value * batch.value)

const GiB = 1024 ** 3
const weightsGiB = computed(() => (params.value * 1e9 * wBytes.value) / GiB)
const kvGiB = computed(() => totalBytes.value / GiB)
const poolGiB = computed(() => Math.max(0, gpu.value * 0.92 - weightsGiB.value))
const sessions = computed(() => {
  const one = (perToken.value * ctx.value) / GiB
  return one > 0 ? Math.floor(poolGiB.value / one) : 0
})
const kvVsWeights = computed(() => (weightsGiB.value ? kvGiB.value / weightsGiB.value : 0))

function human(n: number) {
  if (n >= 1024) return (n / 1024).toFixed(2) + ' ТіБ'
  if (n >= 1) return n.toFixed(n < 10 ? 2 : 1) + ' ГіБ'
  return (n * 1024).toFixed(0) + ' МіБ'
}
const ctxLabel = computed(() => (ctx.value >= 1024 ? ctx.value / 1024 + 'k' : String(ctx.value)))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Скільки важить KV-cache</div>
        <div class="lab__sub">
          Формула зі слайда підставлена наживо. Пресет Llama 3.1 8B дає рівно ті числа,
          що в таблиці: 128 КіБ на токен і 16 ГіБ на 128k.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="(s, i) in PRESETS" :key="s.name"
        class="lab__pill" :class="{ 'is-on': p === i }" @click="p = i"
      >{{ s.name }}</button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Контекст <b>{{ ctxLabel }}</b> токенів</span>
        <input v-model.number="ctxPow" type="range" min="9" max="20" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Батч <b>{{ batch }}</b></span>
        <input v-model.number="batch" type="range" min="1" max="64" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Точність KV <b>{{ bytes === 2 ? 'bf16' : bytes === 1 ? 'fp8' : 'fp32' }}</b></span>
        <input v-model.number="bytes" type="range" min="1" max="4" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Пам'ять картки <b>{{ gpu }} ГБ</b></span>
        <input v-model.number="gpu" type="range" min="8" max="192" step="8" />
      </label>
    </div>

    <div class="kv__formula">
      <span>2</span><i>×</i><span>{{ L }}<em>шарів</em></span><i>×</i>
      <span>{{ kv }}<em>KV-голів</em></span><i>×</i>
      <span>{{ headDim }}<em>вимір голови</em></span><i>×</i>
      <span>{{ bytes }}<em>байти</em></span>
      <i>=</i>
      <b>{{ (perToken / 1024).toFixed(0) }} КіБ</b><em>на токен</em>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ human(kvGiB) }}</b><span>KV на {{ ctxLabel }}, батч {{ batch }}</span></div>
      <div class="lab__stat is-green"><b>{{ human(weightsGiB) }}</b><span>ваги у bf16</span></div>
      <div class="lab__stat" :class="{ 'is-warm': kvVsWeights >= 1 }">
        <b>{{ kvVsWeights.toFixed(2) }}×</b><span>кеш проти ваг</span>
      </div>
      <div class="lab__stat" :class="{ 'is-warm': sessions < 4 }">
        <b>{{ sessions }}</b><span>одночасних сеансів</span>
      </div>
    </div>

    <div class="kv__stack">
      <div class="kv__seg kv__seg--w" :style="{ width: Math.min(100, (weightsGiB / (gpu * 0.92)) * 100) + '%' }">
        <span v-if="(weightsGiB / (gpu * 0.92)) * 100 > 9">ваги</span>
      </div>
      <div
        class="kv__seg kv__seg--kv"
        :style="{ width: Math.min(100 - (weightsGiB / (gpu * 0.92)) * 100, (kvGiB / (gpu * 0.92)) * 100) + '%' }"
      ><span v-if="(kvGiB / (gpu * 0.92)) * 100 > 6">KV</span></div>
    </div>
    <div class="kv__legend">
      <span>Пул під KV після ваг: <b>{{ human(poolGiB) }}</b></span>
      <span v-if="kvGiB > poolGiB" class="kv__over">одна послідовність уже не влазить</span>
    </div>

    <p class="lab__note">
      Поставте контекст 128k на пресеті Llama 3.1 8B — кеш однієї послідовності важитиме
      приблизно стільки ж, скільки самі ваги. Перемкніть на «якби 32 голови» і побачите,
      чого коштує згрупована увага: та сама модель вимагає вчетверо більше пам'яті на кеш.
      Одиниці тут двійкові: 15.0 ГіБ ваг — це ті самі 16.1 ГБ, які друкує код лекції 09,
      просто ГБ рахує по 10⁹ байтів, а ГіБ по 2³⁰.
    </p>
  </div>
</template>

<style scoped>
.kv__formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.85rem 0.9rem;
  background: var(--uk-fill);
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.86rem;
}
.kv__formula span {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.15;
  color: var(--vp-c-text-1);
}
.kv__formula em {
  font-family: var(--vp-font-family-base);
  font-style: normal;
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}
.kv__formula i { font-style: normal; color: var(--vp-c-text-3); }
.kv__formula b {
  font-size: 1.05rem;
  color: var(--uk-accent);
  margin-left: 0.2rem;
}
.kv__formula > em {
  font-family: var(--vp-font-family-base);
  font-style: normal;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
.kv__stack {
  display: flex;
  height: 26px;
  margin-top: 1rem;
  border-radius: 6px;
  overflow: hidden;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
}
.kv__seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 500;
  color: #fff;
  transition: width 0.4s ease;
  overflow: hidden;
  white-space: nowrap;
}
.kv__seg--w { background: var(--uk-green); }
.kv__seg--kv { background: var(--uk-accent); }
.kv__legend {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin-top: 0.4rem;
}
.kv__legend b { font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); }
.kv__over { color: var(--uk-warm); font-weight: 500; }
</style>
