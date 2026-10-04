<script setup lang="ts">
/**
 * Вікно контексту як бюджет: п'ять доданків із формули n = n_sys + n_tools +
 * n_mem + n_hist + n_res, їхня частка у вікні, поріг компакції 0.7 і те,
 * у скільки разів дорожчає увага при тій самій довжині (вартість ∝ n²).
 */
import { ref, computed } from 'vue'

const parts = ref([
  { key: 'n_sys', name: 'Системна інструкція', v: 310, max: 4000 },
  { key: 'n_tools', name: 'Описи інструментів', v: 1200, max: 20000 },
  { key: 'n_mem', name: 'Підвантажені нотатки', v: 800, max: 20000 },
  { key: 'n_hist', name: 'Історія діалогу', v: 3000, max: 60000 },
  { key: 'n_res', name: 'Результати викликів', v: 2400, max: 60000 },
])
// підписи задані явно: 8192 — це «8k» за 1024, а 200 000 — круглі «200k»
const windows = [
  { v: 8192, label: '8k' },
  { v: 32768, label: '32k' },
  { v: 131072, label: '128k' },
  { v: 200000, label: '200k' },
]
const win = ref(8192)

// механізми з розділу вище: кожен зменшує свій доданок, нічого не прибираючи
// з задачі — це обмін повноти на місце, а не безкоштовна економія
const MECHS = [
  { id: 'lazy', name: 'Підвантаження за потреби', key: 'n_res', to: 0.08,
    cost: 'зайвий крок і виклик інструмента на кожне звернення' },
  { id: 'compact', name: 'Компакція історії', key: 'n_hist', to: 0.05,
    cost: 'деталі, яких у підсумку не стало' },
  { id: 'notes', name: 'Нотатки назовні', key: 'n_mem', to: 0.1,
    cost: 'нотатка може застаріти або бути отруєна' },
  { id: 'defer', name: 'Відкладені описи інструментів', key: 'n_tools', to: 0.15,
    cost: 'схема підвантажується при першому виклику' },
]
const on = ref<Record<string, boolean>>({})

const effective = computed(() =>
  parts.value.map((p) => {
    const m = MECHS.find((x) => x.key === p.key && on.value[x.id])
    return { ...p, v: m ? Math.round(p.v * m.to) : p.v, cut: !!m }
  }))
const saved = computed(
  () => parts.value.reduce((s, p) => s + p.v, 0) - effective.value.reduce((s, p) => s + p.v, 0))
const applied = computed(() => MECHS.filter((m) => on.value[m.id]))

const used = computed(() => effective.value.reduce((s, p) => s + p.v, 0))
const share = computed(() => used.value / win.value)
const free = computed(() => Math.max(0, win.value - used.value))
const threshold = computed(() => Math.round(0.7 * win.value))
const compacting = computed(() => used.value >= threshold.value)
// увага коштує ∝ n²; за одиницю беремо вікно 1k токенів
const cost = computed(() => (used.value / 1024) ** 2)

const fmt = (n: number) => n.toLocaleString('uk-UA').replace(/ /g, ' ')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Бюджет вікна контексту</div>
        <div class="lab__sub">
          Посуньте будь-який доданок — і подивіться, що лишається під відповідь
          і де спрацює компакція.
        </div>
      </div>
      <div class="cb__win">
        <button
          v-for="w in windows"
          :key="w.v"
          type="button"
          class="cb__wbtn"
          :class="{ 'is-on': win === w.v }"
          @click="win = w.v"
        >
          {{ w.label }}
        </button>
      </div>
    </div>

    <div class="cb__mechs">
      <button
        v-for="m in MECHS"
        :key="m.id"
        type="button"
        class="cb__mech"
        :class="{ 'is-on': on[m.id] }"
        @click="on[m.id] = !on[m.id]"
      >
        {{ on[m.id] ? '✓ ' : '+ ' }}{{ m.name }}
      </button>
    </div>

    <div class="cb__scale"><span class="cb__rholab">поріг компакції 0.7</span></div>
    <div class="cb__bar" role="img" :aria-label="`зайнято ${fmt(used)} з ${fmt(win)} токенів`">
      <span
        v-for="(p, i) in effective"
        :key="p.key"
        class="cb__seg"
        :class="'is-' + i"
        :style="{ width: Math.min(100, (p.v / win) * 100) + '%' }"
        :title="p.name"
      />
      <span class="cb__rho" :style="{ left: '70%' }" />
    </div>

    <div class="cb__sliders">
      <label v-for="p in parts" :key="p.key" class="lab__ctl cb__ctl">
        <span class="cb__name"><i class="cb__dot" :class="'is-' + parts.indexOf(p)" />{{ p.name }}</span>
        <input v-model.number="p.v" type="range" min="0" :max="p.max" step="50" />
        <code :class="{ 'is-cut': effective[parts.indexOf(p)].cut }">{{
          fmt(effective[parts.indexOf(p)].v) }}</code>
      </label>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="{ 'is-warm': share > 1 }">
        <b>{{ fmt(used) }}</b><span>зайнято токенів</span>
      </div>
      <div class="lab__stat"><b>{{ (share * 100).toFixed(0) }}%</b><span>вікна</span></div>
      <div class="lab__stat" :class="{ 'is-warm': free === 0 }">
        <b>{{ fmt(free) }}</b><span>лишилось під відповідь</span>
      </div>
      <div class="lab__stat" :class="saved ? 'is-green' : ''">
        <b>{{ saved ? '−' + fmt(saved) : cost.toFixed(1) + '×' }}</b>
        <span>{{ saved ? 'зекономлено механізмами' : 'вартість уваги проти 1k' }}</span>
      </div>
    </div>

    <p class="lab__note">
      <template v-if="compacting">
        Зайнято більше за поріг {{ fmt(threshold) }} токенів — у MemGPT саме тут
        вмикається компакція: історію підсумовують і починають нове вікно.
      </template>
      <template v-else>
        До порога компакції ({{ fmt(threshold) }} токенів, тобто 0.7 вікна)
        лишається {{ fmt(threshold - used) }}.
      </template>
      <template v-if="applied.length">
        Увімкнено механізмів: {{ applied.length }}. Місце звільнилося, але щось
        віддано натомість — {{ applied.map((m) => m.cost).join('; ') }}.
      </template>
      <template v-else>
        Вартість уваги росте як квадрат довжини: подвоєння з 8k до 16k — це
        вчетверо, а з 4k до 32k — у 64 рази. Увімкніть механізм вище, щоб
        побачити, скільки місця він звільняє і чим за це платить.
      </template>
    </p>
  </div>
</template>

<style scoped>
.cb__mechs { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.9rem 0 1rem; }
.cb__mech {
  padding: 0.26rem 0.65rem;
  border: 1px solid var(--uk-line);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.74rem;
  cursor: pointer;
}
.cb__mech.is-on { border-color: var(--uk-green); color: var(--uk-green); font-weight: 600; }
.lab__ctl code.is-cut { color: var(--uk-green); font-weight: 700; }
.cb__win { display: flex; gap: 0.3rem; flex: none; }
.cb__wbtn {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--uk-line);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.cb__wbtn.is-on { border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }

.cb__scale { position: relative; height: 0.95rem; margin-top: 1rem; }
.cb__rholab {
  position: absolute;
  left: 70%;
  transform: translateX(-50%);
  font-size: 0.66rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.cb__bar {
  position: relative;
  display: flex;
  height: 1.5rem;
  margin: 0 0 0.4rem;
  border-radius: 6px;
  overflow: hidden;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
}
.cb__seg { height: 100%; transition: width 0.18s ease; }
.cb__seg.is-0, .cb__dot.is-0 { background: var(--uk-accent); }
.cb__seg.is-1, .cb__dot.is-1 { background: color-mix(in srgb, var(--uk-accent) 62%, white); }
.cb__seg.is-2, .cb__dot.is-2 { background: var(--uk-green); }
.cb__seg.is-3, .cb__dot.is-3 { background: color-mix(in srgb, var(--uk-warm) 70%, white); }
.cb__seg.is-4, .cb__dot.is-4 { background: var(--uk-warm); }
.cb__rho {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 2px dashed var(--uk-ink);
  opacity: 0.55;
}
.cb__sliders { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 1.1rem; }
.cb__ctl { display: grid; grid-template-columns: minmax(0, 11rem) 1fr auto; gap: 0.6rem; align-items: center; }
.cb__name { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; }
.cb__dot { width: 0.55rem; height: 0.55rem; border-radius: 2px; flex: none; }
.cb__ctl code { font-size: 0.76rem; min-width: 4.2rem; text-align: right; }
@media (max-width: 720px) {
  .cb__ctl { grid-template-columns: 1fr auto; }
  .cb__ctl input { grid-column: 1 / -1; }
}
</style>
