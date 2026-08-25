<script setup lang="ts">
/**
 * Ціна другого агента: канали координації і токени.
 * Кількість каналів рахується за топологією, витрата токенів — множенням
 * контексту на кожного учасника, і саме вона пояснює більшість «приросту».
 */
import { ref, computed } from 'vue'

const TOPOLOGIES = [
  {
    id: 'mesh', name: 'Мережа',
    channels: (n: number) => (n * (n - 1)) / 2,
    note: 'кожен говорить із кожним',
  },
  {
    id: 'super', name: 'Supervisor',
    channels: (n: number) => Math.max(0, n - 1),
    note: 'усе через координатора',
  },
  {
    id: 'hier', name: 'Ієрархія',
    channels: (n: number) => Math.round(n * Math.log2(Math.max(2, n))),
    note: 'рівні по гілках',
  },
]

const n = ref(4)
const topo = ref('super')
const ctx = ref(4000)     // токенів контексту на агента
const isolated = ref(true)

const t = computed(() => TOPOLOGIES.find((x) => x.id === topo.value)!)
const channels = computed(() => t.value.channels(n.value))

/** Ізоляція контексту — справжня причина виграшу; без неї кожен тягне весь контекст. */
const tokens = computed(() =>
  isolated.value ? ctx.value * n.value : ctx.value * n.value * n.value
)
const single = computed(() => ctx.value)
const factor = computed(() => tokens.value / single.value)

const verdict = computed(() => {
  if (n.value === 1) return { t: 'Один агент: координувати нема кого', c: 'green' }
  if (!isolated.value)
    return {
      t: 'Без ізоляції контексту другий агент не додає нічого, крім витрат',
      c: 'warm',
    }
  if (channels.value > 8)
    return { t: 'Каналів забагато: атрибувати відмову стане важко', c: 'warm' }
  return { t: 'Розділення виправдане, якщо підзадачі справді незалежні', c: 'green' }
})

const W = 300, H = 150
const pts = computed(() =>
  Array.from({ length: n.value }, (_, i) => {
    const a = (i / n.value) * Math.PI * 2 - Math.PI / 2
    return { x: W / 2 + Math.cos(a) * 52, y: H / 2 + Math.sin(a) * 52 }
  })
)
const edges = computed(() => {
  const p = pts.value
  const out: { x1: number; y1: number; x2: number; y2: number }[] = []
  if (topo.value === 'mesh') {
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        out.push({ x1: p[i].x, y1: p[i].y, x2: p[j].x, y2: p[j].y })
  } else {
    for (let i = 1; i < p.length; i++)
      out.push({ x1: W / 2, y1: H / 2, x2: p[i].x, y2: p[i].y })
  }
  return out
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Що множиться разом із другим агентом</div>
        <div class="lab__sub">
          Канали координації і витрата токенів ростуть швидше за користь.
          Питання не «скільки агентів», а «чи ізольований контекст».
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="x in TOPOLOGIES" :key="x.id"
        class="lab__pill" :class="{ 'is-on': topo === x.id }" @click="topo = x.id"
      >{{ x.name }}</button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Агентів <b>{{ n }}</b></span>
        <input v-model.number="n" type="range" min="1" max="10" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Контекст на агента <b>{{ (ctx / 1000).toFixed(1) }}k</b></span>
        <input v-model.number="ctx" type="range" min="1000" max="16000" step="500" />
      </label>
      <label class="lab__ctl ma__check">
        <input type="checkbox" v-model="isolated" />
        <span>Контекст ізольований</span>
      </label>
    </div>

    <div class="ma__grid">
      <svg :viewBox="`0 0 ${W} ${H}`" class="ma__plot" role="img" aria-label="Топологія">
        <line v-for="(e, i) in edges" :key="i" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
              stroke="var(--uk-accent)" stroke-width="1" opacity="0.5" />
        <circle v-if="topo !== 'mesh' && n > 1" :cx="W / 2" :cy="H / 2" r="9"
                fill="var(--uk-accent)" />
        <circle v-for="(p, i) in pts" :key="i" :cx="p.x" :cy="p.y" r="7"
                fill="var(--uk-green)" />
      </svg>

      <div>
        <div class="lab__stats ma__stats">
          <div class="lab__stat" :class="{ 'is-warm': channels > 8 }">
            <b>{{ channels }}</b><span>каналів координації</span>
          </div>
          <div class="lab__stat" :class="{ 'is-warm': factor > 6 }">
            <b>{{ factor.toFixed(0) }}×</b><span>токенів проти одного агента</span>
          </div>
          <div class="lab__stat"><b>{{ (tokens / 1000).toFixed(0) }}k</b><span>токенів на задачу</span></div>
        </div>
        <div class="ma__note">{{ t.note }}</div>
      </div>
    </div>

    <div class="ma__verdict" :class="'is-' + verdict.c">{{ verdict.t }}</div>

    <p class="lab__note">
      Зніміть ізоляцію контексту — витрата зросте квадратично, бо кожен агент тягне все,
      що бачать інші. Виміряні прирости мультиагентних збірок значною мірою пояснюються
      саме витратою токенів, тому порівняння без вирівняного бюджету нічого не доводить.
    </p>
  </div>
</template>

<style scoped>
.ma__check { display: flex; align-items: center; gap: 0.45rem; align-self: end; padding-bottom: 0.3rem; }
.ma__check input { accent-color: var(--uk-accent); }
.ma__check span { font-size: 0.82rem; color: var(--vp-c-text-2); margin: 0 !important; }
.ma__grid { display: grid; grid-template-columns: minmax(180px, 300px) 1fr; gap: 1.1rem; align-items: center; }
.ma__plot { width: 100%; height: auto; background: var(--uk-fill); border-radius: 8px; }
.ma__stats { margin-top: 0; }
.ma__note { font-size: 0.78rem; color: var(--vp-c-text-3); margin-top: 0.5rem; }
.ma__verdict {
  margin-top: 0.8rem;
  font-size: 0.83rem;
  padding: 0.5rem 0.75rem;
  border-radius: 7px;
}
.ma__verdict.is-green { background: var(--uk-green-soft); color: var(--uk-green); }
.ma__verdict.is-warm { background: var(--uk-warm-soft); color: var(--uk-warm); }
@media (max-width: 700px) {
  .ma__grid { grid-template-columns: 1fr; }
}
</style>
