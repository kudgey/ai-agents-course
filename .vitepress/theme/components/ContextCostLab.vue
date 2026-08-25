<script setup lang="ts">
/** Квадратична вартість контексту: N×N пар на кожному шарі й у кожній голові. */
import { ref, computed } from 'vue'

const pow = ref(10) // 2^10 = 1024
const N = computed(() => 2 ** pow.value)
const pairs = computed(() => N.value * N.value)
const rel = computed(() => pairs.value / 1024 / 1024)

const label = computed(() => (N.value >= 1024 ? N.value / 1024 + 'k' : String(N.value)))

function big(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' млрд'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' млн'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' тис.'
  return String(n)
}

// сітка N×N як візуальна метафора: показуємо частку заповнення
const cells = 18
const grid = computed(() => {
  const filled = Math.min(1, Math.log2(N.value) / 20)
  return Array.from({ length: cells * cells }, (_, i) => {
    const r = Math.floor(i / cells), c = i % cells
    return c <= r && r < filled * cells * 1.6 ? 1 : c <= r ? 0.22 : 0
  })
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Ціна довжини контексту</div>
        <div class="lab__sub">
          Пари токенів ростуть як N², і матриця будується заново в кожному шарі та в кожній голові.
        </div>
      </div>
    </div>

    <label class="lab__ctl">
      <span>Довжина входу <b>{{ label }}</b> токенів</span>
      <input v-model.number="pow" type="range" min="8" max="20" step="1" />
    </label>

    <div class="cc__body">
      <div class="cc__grid" aria-hidden="true">
        <i v-for="(v, i) in grid" :key="i" :style="{ opacity: v }" />
      </div>
      <div class="lab__stats cc__stats">
        <div class="lab__stat"><b>{{ big(pairs) }}</b><span>пар токенів</span></div>
        <div class="lab__stat" :class="{ 'is-warm': rel >= 64 }">
          <b>×{{ rel < 1 ? rel.toFixed(2) : big(rel) }}</b><span>відносно 1k</span>
        </div>
        <div class="lab__stat is-green"><b>{{ (N / 1024).toFixed(1) }}×</b><span>довжина відносно 1k</span></div>
      </div>
    </div>

    <p class="lab__note">
      Довжина зростає вдвічі — обчислення вчетверо. Саме тому «підтримує 1M токенів» ніколи
      не означає «коштує стільки ж»: такі вікна тримають окремими архітектурними механізмами,
      а не тим самим обчисленням.
    </p>
  </div>
</template>

<style scoped>
.cc__body { display: grid; grid-template-columns: 190px 1fr; gap: 1.3rem; align-items: center; margin-top: 0.6rem; }
.cc__grid {
  display: grid;
  grid-template-columns: repeat(18, 1fr);
  gap: 1px;
  aspect-ratio: 1;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  padding: 3px;
}
.cc__grid i { background: var(--uk-accent); border-radius: 1px; transition: opacity 0.4s ease; }
.cc__stats { margin-top: 0; }
@media (max-width: 640px) {
  .cc__body { grid-template-columns: 1fr; }
  .cc__grid { max-width: 190px; }
}
</style>
