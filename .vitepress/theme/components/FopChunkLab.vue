<script setup lang="ts">
/**
 * Чанкінг роз'яснення ДПС по справжніх токенах (o200k_base): межі токенів gen_lec07.py
 * рахує через tiktoken decode_with_offsets і пише в lec07.json, тож розміри тут ті самі,
 * що в коді лекції. 512 / 64 — налаштування прикладу: два чанки на 512 і 74 токени.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec07.json'

const TEXT: string = data.widget.hero_text
const OFF: number[] = data.widget.hero_offsets      // символ, з якого починається кожен токен
const N = OFF.length
const PROBES: string[] = data.widget.probes          // «ФОП 3 група» і «10 091 049»

const strategy = ref<'tokens' | 'structure'>('tokens')
const size = ref(512)
const overlap = ref(64)
const picked = ref(0)

const charAt = (tok: number) => (tok >= N ? TEXT.length : OFF[tok])
const tokAt = (ch: number) => { let i = 0; while (i < N && OFF[i] < ch) i++; return i }

const chunks = computed(() => {
  if (strategy.value === 'structure') {
    // межі — заголовки «ФОП N група:»: кожна група разом зі своїми рядками
    const cuts = [0]
    for (const m of TEXT.matchAll(/(^|\n)\s*ФОП \d група:/g)) cuts.push(m.index! + (m[1] ? 1 : 0))
    cuts.push(TEXT.length)
    return [...new Set(cuts)].sort((a, b) => a - b).slice(0, -1).map((a, i, arr) => {
      const b = arr[i + 1] ?? TEXT.length
      return { a, b, ta: tokAt(a), tb: tokAt(b), ov: 0 }
    }).filter((c) => TEXT.slice(c.a, c.b).trim())
  }
  const step = Math.max(8, size.value - overlap.value)
  const out = []
  for (let s = 0; s < N; s += step) {
    const e = Math.min(N, s + size.value)
    out.push({ a: charAt(s), b: charAt(e), ta: s, tb: e, ov: s === 0 ? 0 : Math.min(overlap.value, e - s) })
    if (e >= N) break
  }
  return out
})

const together = computed(() => chunks.value.some((c) => {
  const t = TEXT.slice(c.a, c.b)
  const i = t.indexOf(PROBES[0])
  return i >= 0 && t.indexOf(PROBES[1], i) > i
}))
const totalTok = computed(() => chunks.value.reduce((s, c) => s + (c.tb - c.ta), 0))

/** Текст чанка: перекриття з попереднім — окремо, факти — підсвічено. */
function parts(c: { a: number; b: number; ta: number; ov: number }) {
  const ovEnd = c.ov ? charAt(c.ta + c.ov) : c.a
  const mark = (s: string) => s.split(new RegExp(`(${PROBES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`))
  return { ov: TEXT.slice(c.a, ovEnd), rest: mark(TEXT.slice(ovEnd, c.b)) }
}

const sel = computed(() => chunks.value[Math.min(picked.value, chunks.value.length - 1)])
/** Перші 60 токенів обраного чанка — щоб було видно, на що модель ріже текст. */
const tokens = computed(() => {
  const c = sel.value
  const out = []
  for (let t = c.ta; t < Math.min(c.tb, c.ta + 60); t++) out.push(TEXT.slice(charAt(t), charAt(t + 1)))
  return out
})
const meta = computed(() => ({
  chunk_id: `dps-rv-2026#${picked.value + 1}`,
  doc_id: "роз'яснення ГУ ДПС у Рівненській обл., 2026",
  source: 'dps-rv-2026.pdf',
  valid_from: '2026-01-01',
  version: 2026,
  access: 'public',
  tokens: sel.value.tb - sel.value.ta,
}))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Як текст ріжеться на чанки</div>
        <div class="lab__sub">
          Роз'яснення ДПС після очищення — {{ N }} токенів. Змінюйте розмір і перекриття або
          ріжте за структурою документа; клацніть на чанк, щоб побачити його токени й метадані.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': strategy === 'tokens' }" @click="strategy = 'tokens'">За кількістю токенів</button>
      <button class="lab__pill" :class="{ 'is-on': strategy === 'structure' }" @click="strategy = 'structure'; picked = 0">За структурою: одна група — один чанк</button>
    </div>

    <div v-if="strategy === 'tokens'" class="lab__controls">
      <label class="lab__ctl">
        <span>Розмір чанка <b>{{ size }}</b> токенів</span>
        <input v-model.number="size" type="range" min="32" max="512" step="16" @input="picked = 0" />
      </label>
      <label class="lab__ctl">
        <span>Перекриття <b>{{ overlap }}</b> токенів</span>
        <input v-model.number="overlap" type="range" min="0" :max="Math.floor(size / 2)" step="8" @input="picked = 0" />
      </label>
    </div>
    <div v-if="strategy === 'tokens'" class="lab__pills">
      <button class="lab__pill" @click="size = 512; overlap = 64; picked = 0">Як у прикладі: 512 / 64</button>
      <button class="lab__pill" @click="size = 96; overlap = 0; picked = 0">Дрібно, без перекриття</button>
      <button class="lab__pill" @click="size = 96; overlap = 32; picked = 0">Дрібно, з перекриттям</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ chunks.length }}</b><span>чанків</span></div>
      <div class="lab__stat"><b>{{ (totalTok / N).toFixed(2) }}×</b><span>токенів в індексі відносно тексту</span></div>
      <div class="lab__stat" :class="together ? 'is-green' : 'is-warm'">
        <b>{{ together ? '✓' : '✕' }}</b><span>«ФОП 3 група» і «10 091 049» в одному чанку</span>
      </div>
    </div>

    <div class="fc__chunks">
      <button v-for="(c, i) in chunks" :key="i" class="fc__chunk" :class="{ 'is-on': i === picked }" @click="picked = i">
        <span class="fc__num">#{{ i + 1 }} · {{ c.tb - c.ta }} ток.</span>
        <span class="fc__body">
          <span v-if="parts(c).ov" class="fc__ov" title="перекриття з попереднім чанком">{{ parts(c).ov }}</span>
          <template v-for="(p, j) in parts(c).rest" :key="j">
            <mark v-if="PROBES.includes(p)">{{ p }}</mark>
            <template v-else>{{ p }}</template>
          </template>
        </span>
      </button>
    </div>

    <div class="fc__inside">
      <div>
        <div class="fc__cap">Чанк #{{ picked + 1 }} очима моделі: перші токени</div>
        <div class="fc__toks">
          <span v-for="(t, i) in tokens" :key="i" class="fc__tok" :class="'c' + (i % 4)">{{ t.replace(/\n/g, '↵') }}</span>
          <span v-if="sel.tb - sel.ta > 60" class="fc__more">… ще {{ sel.tb - sel.ta - 60 }}</span>
        </div>
      </div>
      <div>
        <div class="fc__cap">Той самий чанк в індексі: метадані</div>
        <div class="fc__meta">
          <div v-for="(v, k) in meta" :key="k"><span>{{ k }}</span><b>{{ v }}</b></div>
        </div>
      </div>
    </div>

    <p class="lab__note">
      Поставте «Дрібно, без перекриття»: межа ріже список, і заголовок «ФОП 3 група» опиняється
      в одному чанку, а число — в іншому. Перекриття повертає їх разом ціною дубльованого тексту
      (див. «токенів в індексі»). Різання за структурою зберігає групу цілою без жодного дублювання.
    </p>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.fc__chunks { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 1rem; max-height: 22rem; overflow-y: auto; }
.fc__chunk {
  display: flex; gap: 0.6rem; text-align: left; width: 100%;
  padding: 0.5rem 0.65rem; border: 1px solid var(--uk-line); border-radius: 8px;
  background: var(--vp-c-bg); cursor: pointer; font: inherit; color: inherit;
}
.fc__chunk.is-on { border-color: var(--uk-accent); box-shadow: 0 0 0 1px var(--uk-accent); }
.fc__num { font-family: var(--vp-font-family-mono); font-size: 0.7rem; color: var(--vp-c-text-3); flex: none; padding-top: 0.15rem; width: 5.5rem; }
.fc__body { font-size: 0.78rem; line-height: 1.5; white-space: pre-wrap; }
.fc__ov { background: var(--uk-warm-soft); color: var(--uk-warm); border-radius: 3px; }
.fc__body mark { background: var(--uk-accent-soft); color: var(--uk-accent); font-weight: 600; border-radius: 3px; padding: 0 0.1em; }
.fc__inside { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem; margin-top: 1rem; }
@media (max-width: 640px) { .fc__inside { grid-template-columns: 1fr; } }
.fc__cap { font-size: 0.75rem; color: var(--vp-c-text-3); margin-bottom: 0.4rem; }
.fc__toks { display: flex; flex-wrap: wrap; gap: 2px; font-family: var(--vp-font-family-mono); font-size: 0.74rem; }
.fc__tok { padding: 0.05rem 0.15rem; border-radius: 3px; white-space: pre; }
.fc__tok.c0 { background: #e5e8fa; } .fc__tok.c1 { background: #e2f0e9; } .fc__tok.c2 { background: #fbebe1; } .fc__tok.c3 { background: #f1f1f6; }
.dark .fc__tok.c0 { background: #2b3160; } .dark .fc__tok.c1 { background: #1f3a2d; } .dark .fc__tok.c2 { background: #4a2d1c; } .dark .fc__tok.c3 { background: #2d2d36; }
.fc__more { font-size: 0.72rem; color: var(--vp-c-text-3); align-self: center; }
.fc__meta { border: 1px solid var(--uk-line); border-radius: 8px; font-size: 0.76rem; }
.fc__meta div { display: flex; justify-content: space-between; gap: 0.6rem; padding: 0.3rem 0.6rem; border-bottom: 1px solid var(--uk-line); }
.fc__meta div:last-child { border-bottom: none; }
.fc__meta span { font-family: var(--vp-font-family-mono); color: var(--uk-green); }
.fc__meta b { font-weight: 500; text-align: right; }
</style>
