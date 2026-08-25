<script setup lang="ts">
/**
 * M×N проти M+N. Числа картки: 4 і 7 дають 28 проти 11, 10 і 20 — 200 проти 30.
 * Видно і те, чого не видно з формули: на малих числах виграшу немає.
 */
import { ref, computed } from 'vue'

const M = ref(4)   // застосунків
const N = ref(7)   // систем і джерел

const direct = computed(() => M.value * N.value)
const viaProto = computed(() => M.value + N.value)
const saved = computed(() => direct.value - viaProto.value)
const ratio = computed(() => (viaProto.value ? direct.value / viaProto.value : 0))

const verdict = computed(() => {
  if (saved.value <= 0)
    return { t: 'протокол коштує дорожче, ніж економить', c: 'warm' }
  if (ratio.value < 1.6)
    return { t: 'виграш є, але накладні витрати протоколу ще помітні', c: 'warm' }
  return { t: 'протокол окупається', c: 'green' }
})

/** Лінії «кожен до кожного» — саме те, що протокол прибирає. */
const W = 420, H = 150
const apps = computed(() =>
  Array.from({ length: M.value }, (_, i) => ({
    x: 60,
    y: 22 + (i * (H - 44)) / Math.max(1, M.value - 1 || 1),
  }))
)
const systems = computed(() =>
  Array.from({ length: N.value }, (_, i) => ({
    x: W - 60,
    y: 22 + (i * (H - 44)) / Math.max(1, N.value - 1 || 1),
  }))
)
const mode = ref<'direct' | 'proto'>('direct')

const links = computed(() => {
  const out: { x1: number; y1: number; x2: number; y2: number }[] = []
  if (mode.value === 'direct') {
    for (const a of apps.value) for (const s of systems.value)
      out.push({ x1: a.x, y1: a.y, x2: s.x, y2: s.y })
  } else {
    for (const a of apps.value) out.push({ x1: a.x, y1: a.y, x2: W / 2, y2: H / 2 })
    for (const s of systems.value) out.push({ x1: W / 2, y1: H / 2, x2: s.x, y2: s.y })
  }
  return out
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Добуток проти суми</div>
        <div class="lab__sub">
          Скільки конекторів хтось пише і супроводжує. Перемикач унизу показує ту саму
          конфігурацію з протоколом і без нього.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Застосунків <b>M = {{ M }}</b></span>
        <input v-model.number="M" type="range" min="1" max="14" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Систем і джерел <b>N = {{ N }}</b></span>
        <input v-model.number="N" type="range" min="1" max="20" step="1" />
      </label>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': mode === 'direct' }" @click="mode = 'direct'">
        Кожен пише свій конектор
      </button>
      <button class="lab__pill" :class="{ 'is-on': mode === 'proto' }" @click="mode = 'proto'">
        Спільний протокол
      </button>
      <button class="lab__pill" @click="M = 4; N = 7">Факультет: 4 і 7</button>
      <button class="lab__pill" @click="M = 10; N = 20">Велика установа: 10 і 20</button>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="mn__plot" role="img" aria-label="Схема інтеграцій">
      <line
        v-for="(l, i) in links" :key="i"
        :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
        :stroke="mode === 'direct' ? 'var(--uk-warm)' : 'var(--uk-accent)'"
        stroke-width="0.8" :opacity="mode === 'direct' ? 0.42 : 0.6"
      />
      <g v-if="mode === 'proto'">
        <rect :x="W / 2 - 26" :y="H / 2 - 11" width="52" height="22" rx="6"
              fill="var(--uk-accent)" />
        <text :x="W / 2" :y="H / 2 + 4" font-size="9" text-anchor="middle" fill="#fff">протокол</text>
      </g>
      <circle v-for="(a, i) in apps" :key="'a' + i" :cx="a.x" :cy="a.y" r="5"
              fill="var(--uk-green)" />
      <circle v-for="(s, i) in systems" :key="'s' + i" :cx="s.x" :cy="s.y" r="5"
              fill="var(--vp-c-text-2)" />
      <text x="60" y="12" font-size="9" text-anchor="middle" fill="var(--uk-green)">застосунки</text>
      <text :x="W - 60" y="12" font-size="9" text-anchor="middle" fill="var(--vp-c-text-3)">системи</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat is-warm"><b>{{ direct }}</b><span>конекторів без протоколу</span></div>
      <div class="lab__stat is-green"><b>{{ viaProto }}</b><span>інтеграцій через протокол</span></div>
      <div class="lab__stat"><b>{{ saved > 0 ? '−' + saved : '+' + -saved }}</b><span>різниця</span></div>
      <div class="lab__stat"><b>{{ ratio.toFixed(1) }}×</b><span>у стільки разів менше</span></div>
    </div>

    <div class="mn__verdict" :class="'is-' + verdict.c">{{ verdict.t }}</div>

    <p class="lab__note">
      Поставте M = 2 і N = 2: добуток дорівнює сумі, і протокол не дає нічого, крім
      накладних витрат. Саме тому питання «навіщо нам MCP» на маленькій системі
      є правильним питанням, і чесна відповідь на нього — «поки що ні за чим».
    </p>
  </div>
</template>

<style scoped>
.mn__plot { width: 100%; height: auto; background: var(--uk-fill); border-radius: 8px; padding: 0.3rem; }
.mn__verdict {
  margin-top: 0.7rem;
  font-size: 0.83rem;
  padding: 0.5rem 0.75rem;
  border-radius: 7px;
}
.mn__verdict.is-green { background: var(--uk-green-soft); color: var(--uk-green); }
.mn__verdict.is-warm { background: var(--uk-warm-soft); color: var(--uk-warm); }
</style>
