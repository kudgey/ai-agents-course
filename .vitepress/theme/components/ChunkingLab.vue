<script setup lang="ts">
/**
 * Розмір чанка й перекриття на справжньому уривку наказу.
 * Головне, що видно: факт, розрізаний межею, не знаходиться жодним пошуком.
 */
import { ref, computed } from 'vue'

const DOC = `Перескладання іспитів та заліків проводиться у період з 3 по 14 лютого 2027 року \
згідно з наказом 1-476 від 12 вересня 2026 року. Студент, який має академічну заборгованість \
не більше ніж з двох дисциплін, допускається до перескладання на загальних підставах. \
Заява подається до деканату не пізніше ніж за три робочі дні до дати перескладання. \
Повторне складання одного іспиту допускається не більше двох разів: другий раз — комісії, \
склад якої затверджує декан факультету. Результат комісійного складання є остаточним \
і оскарженню не підлягає. Студенти, які не ліквідували заборгованість у визначений строк, \
відраховуються згідно з чинним положенням про організацію освітнього процесу.`

const size = ref(180)
const overlap = ref(40)

const chunks = computed(() => {
  const step = Math.max(20, size.value - overlap.value)
  const out: { text: string; from: number; to: number }[] = []
  for (let i = 0; i < DOC.length; i += step) {
    const to = Math.min(DOC.length, i + size.value)
    out.push({ text: DOC.slice(i, to), from: i, to })
    if (to >= DOC.length) break
  }
  return out
})

/** Факт живе цілим лише тоді, коли повністю вміщається в один чанк. */
const FACTS = [
  { name: 'дати перескладання', probe: 'з 3 по 14 лютого 2027 року' },
  { name: 'номер наказу', probe: 'наказом 1-476 від 12 вересня 2026 року' },
  { name: 'строк подання заяви', probe: 'не пізніше ніж за три робочі дні' },
  { name: 'ліміт спроб', probe: 'не більше двох разів' },
]

const factState = computed(() =>
  FACTS.map((f) => {
    const whole = chunks.value.some((c) => c.text.includes(f.probe))
    return { ...f, whole }
  })
)

const intact = computed(() => factState.value.filter((f) => f.whole).length)
const overhead = computed(() => {
  const total = chunks.value.reduce((s, c) => s + c.text.length, 0)
  return total / DOC.length
})

/** Розбиває текст на шматки, позначаючи ті, що збігаються з фактом. */
function highlight(text: string) {
  const out: { hit: boolean; s: string }[] = []
  let rest = text
  while (rest) {
    let best = -1
    let probe = ''
    for (const f of FACTS) {
      const at = rest.indexOf(f.probe)
      if (at !== -1 && (best === -1 || at < best)) {
        best = at
        probe = f.probe
      }
    }
    if (best === -1) {
      out.push({ hit: false, s: rest })
      break
    }
    if (best > 0) out.push({ hit: false, s: rest.slice(0, best) })
    out.push({ hit: true, s: probe })
    rest = rest.slice(best + probe.length)
  }
  return out
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Розмір чанка й перекриття</div>
        <div class="lab__sub">
          Справжній уривок наказу. Підсвічені факти — те, про що студенти реально питають.
          Факт, розрізаний межею чанка, не знайде жоден пошук.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Розмір чанка <b>{{ size }}</b> символів</span>
        <input v-model.number="size" type="range" min="60" max="420" step="10" />
      </label>
      <label class="lab__ctl">
        <span>Перекриття <b>{{ overlap }}</b> символів</span>
        <input v-model.number="overlap" type="range" min="0" :max="Math.floor(size * 0.6)" step="5" />
      </label>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" @click="size = 90; overlap = 0">Дрібно, без перекриття</button>
      <button class="lab__pill" @click="size = 180; overlap = 40">Помірно</button>
      <button class="lab__pill" @click="size = 400; overlap = 80">Великі чанки</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ chunks.length }}</b><span>чанків</span></div>
      <div class="lab__stat" :class="intact === FACTS.length ? 'is-green' : 'is-warm'">
        <b>{{ intact }}/{{ FACTS.length }}</b><span>фактів уціліло</span>
      </div>
      <div class="lab__stat"><b>{{ overhead.toFixed(2) }}×</b><span>тексту в індексі</span></div>
    </div>

    <div class="ch__facts">
      <span v-for="f in factState" :key="f.name" class="ch__fact" :class="{ 'is-broken': !f.whole }">
        {{ f.whole ? '✓' : '✕' }} {{ f.name }}
      </span>
    </div>

    <div class="ch__chunks">
      <div v-for="(c, i) in chunks" :key="i" class="ch__chunk">
        <span class="ch__num">{{ i + 1 }}</span>
        <p>
          <template v-for="(p, j) in highlight(c.text)" :key="j">
            <mark v-if="p.hit">{{ p.s }}</mark>
            <template v-else>{{ p.s }}</template>
          </template>
        </p>
      </div>
    </div>

    <p class="lab__note">
      Поставте дрібні чанки без перекриття — і побачите, як «наказом 1-476 від 12 вересня»
      розривається навпіл: обидві половини лишаються в індексі, але жодна не відповідає
      на питання. Перекриття лікує саме це, а платите ви за нього обсягом індексу.
    </p>
  </div>
</template>

<style scoped>
.ch__facts { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.9rem; }
.ch__fact {
  font-size: 0.76rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: var(--uk-green-soft);
  color: var(--uk-green);
}
.ch__fact.is-broken { background: var(--uk-warm-soft); color: var(--uk-warm); }
.ch__chunks { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.9rem; max-height: 24rem; overflow-y: auto; }
.ch__chunk {
  display: flex;
  gap: 0.6rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.ch__num {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  flex: none;
  padding-top: 0.15rem;
}
.ch__chunk p { margin: 0; font-size: 0.8rem; line-height: 1.5; }
.ch__chunk mark {
  background: var(--uk-accent-soft);
  color: var(--uk-accent);
  padding: 0 0.15em;
  border-radius: 3px;
  font-weight: 500;
}
</style>
