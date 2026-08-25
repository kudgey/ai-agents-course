<script setup lang="ts">
/**
 * E2E = TTFT + TPOT · T_out і крива очікування ρ/(1−ρ).
 * Пресет «асистент навчального відділу» відтворює приклад слайда: 240 + 18×180 = 3480 мс.
 */
import { ref, computed } from 'vue'

const ttft = ref(240)
const tpot = ref(18)
const out = ref(180)
const rho = ref(0.7)

const e2e = computed(() => ttft.value + tpot.value * out.value)
const share = computed(() => (ttft.value / e2e.value) * 100)
const waitMult = computed(() => (rho.value >= 0.99 ? 99 : rho.value / (1 - rho.value)))

const slo = ref(5000)
const ok = computed(() => e2e.value <= slo.value)

function preset(a: number, b: number, c: number) {
  ttft.value = a; tpot.value = b; out.value = c
}

const W = 400, H = 130, PAD = 32
const curve = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const r = (i / 80) * 0.96
    const w = r / (1 - r)
    const x = PAD + (r / 0.96) * (W - PAD - 12)
    const y = H - 20 - Math.min(1, w / 12) * (H - 38)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})
const dotX = computed(() => PAD + (rho.value / 0.96) * (W - PAD - 12))
const dotY = computed(() => H - 20 - Math.min(1, waitMult.value / 12) * (H - 38))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Наскрізна затримка і черга</div>
        <div class="lab__sub">
          Верхня частина — формула зі слайда. Нижня показує, чому 90 % завантаження
          картки означає десятикратне очікування, а не «майже повний ресурс».
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" @click="preset(240, 18, 180)">Асистент відділу</button>
      <button class="lab__pill" @click="preset(120, 8, 60)">Коротка довідка</button>
      <button class="lab__pill" @click="preset(900, 25, 700)">Довгий звіт</button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>TTFT <b>{{ ttft }} мс</b></span>
        <input v-model.number="ttft" type="range" min="50" max="2000" step="10" />
      </label>
      <label class="lab__ctl">
        <span>TPOT <b>{{ tpot }} мс/токен</b></span>
        <input v-model.number="tpot" type="range" min="4" max="80" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Вихідних токенів <b>{{ out }}</b></span>
        <input v-model.number="out" type="range" min="20" max="1200" step="10" />
      </label>
      <label class="lab__ctl">
        <span>Бюджет SLO <b>{{ (slo / 1000).toFixed(1) }} с</b></span>
        <input v-model.number="slo" type="range" min="1000" max="12000" step="250" />
      </label>
    </div>

    <div class="ll__stack">
      <div class="ll__seg ll__seg--ttft" :style="{ width: share + '%' }">
        <span v-if="share > 12">TTFT</span>
      </div>
      <div class="ll__seg ll__seg--dec" :style="{ width: 100 - share + '%' }">
        <span>декод {{ out }} × {{ tpot }} мс</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="{ 'is-warm': !ok, 'is-green': ok }">
        <b>{{ (e2e / 1000).toFixed(2) }} с</b><span>наскрізна затримка</span>
      </div>
      <div class="lab__stat"><b>{{ share.toFixed(0) }} %</b><span>частка TTFT</span></div>
      <div class="lab__stat" :class="{ 'is-warm': waitMult >= 5 }">
        <b>×{{ waitMult.toFixed(1) }}</b><span>очікування в черзі</span>
      </div>
      <div class="lab__stat" :class="ok ? 'is-green' : 'is-warm'">
        <b>{{ ok ? 'у бюджеті' : 'порушено' }}</b><span>проти SLO</span>
      </div>
    </div>

    <label class="lab__ctl ll__rho">
      <span>Завантаження сервера <b>ρ = {{ rho.toFixed(2) }}</b></span>
      <input v-model.number="rho" type="range" min="0.05" max="0.96" step="0.01" />
    </label>

    <svg :viewBox="`0 0 ${W} ${H}`" class="ll__plot" role="img" aria-label="Крива очікування">
      <line :x1="PAD" :y1="H - 20" :x2="W - 12" :y2="H - 20" stroke="var(--uk-line)" />
      <line :x1="PAD" y1="8" :x2="PAD" :y2="H - 20" stroke="var(--uk-line)" />
      <polyline :points="curve" fill="none" stroke="var(--uk-warm)" stroke-width="2.2" />
      <circle :cx="dotX" :cy="dotY" r="5" fill="var(--uk-warm)" stroke="var(--vp-c-bg)" stroke-width="2" />
      <text :x="PAD - 4" y="14" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">×12</text>
      <text :x="PAD" :y="H - 6" font-size="9" fill="var(--vp-c-text-3)">0</text>
      <text :x="W - 12" :y="H - 6" font-size="9" text-anchor="end" fill="var(--vp-c-text-3)">ρ → 1</text>
    </svg>

    <p class="lab__note">
      Дві ручки живуть у різних місцях системи. TTFT задає префіл і довжина запиту, TPOT —
      пропускна здатність пам'яті. А крива черги не залежить від жодної з них: щойно
      завантаження переходить 0.8, очікування росте швидше за будь-яку оптимізацію моделі.
    </p>
  </div>
</template>

<style scoped>
.ll__stack {
  display: flex;
  height: 30px;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid var(--uk-line);
  margin-bottom: 0.2rem;
}
.ll__seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #fff;
  transition: width 0.35s ease;
  overflow: hidden;
  white-space: nowrap;
}
.ll__seg--ttft { background: var(--uk-green); }
.ll__seg--dec { background: var(--uk-accent); }
.ll__rho { display: block; margin-top: 1.1rem; }
.ll__plot { width: 100%; height: auto; background: var(--uk-fill); border-radius: 8px; padding: 0.3rem; margin-top: 0.4rem; }
</style>
