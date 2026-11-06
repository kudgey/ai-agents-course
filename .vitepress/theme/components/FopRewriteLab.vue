<script setup lang="ts">
/**
 * Словоформи, словник, два списки BM25 і RRF на документах ФОП. Рахує той самий код, що в
 * l08_eval.py: lib/bm25.js; tools/check_l08.mjs звіряє видачу на всіх питаннях набору.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'
import { tokenize, stem, tokenizeStem, rank, rrf } from '../lib/bm25.js'

type Chunk = { chunk_id: string; version: number; text: string }
const CORPUS = data.corpus as Chunk[]
const GLOSSARY = data.glossary as Record<string, string>
const PRESETS = data.presets as string[]
const QS = data.questions
const STEPS = ['Обрізання', 'Словник', 'Два списки', 'RRF']

const tab = ref<'steps' | 'prompt'>('steps')
const query = ref(PRESETS[0])
const step = ref(0)

const known = computed(() => QS.find((q) => q.question === query.value))
const gold = computed(() => new Set(known.value?.gold ?? []))
const year = computed(() => Number((query.value.match(/\b(20\d\d)\b/) || [])[1]) || data.service_year)
const pool = computed(() => CORPUS.filter((c) => c.version === year.value))
const words = computed(() => tokenize(query.value).map((w) => ({ w, s: stem(w) })))
const added = computed(() => tokenize(query.value).filter((t) => t in GLOSSARY).map((t) => ({ t, to: GLOSSARY[t] })))
const extra = computed(() => added.value.map((a) => a.to).join(' '))
const listA = computed(() => rank(query.value, pool.value, tokenizeStem))
const listB = computed(() => rank(extra.value || query.value, pool.value, tokenizeStem))
const fused = computed(() => rrf([listA.value, listB.value], data.rrf_k))
const calc = (r: (number | null)[]) => r.filter((v) => v != null).map((v) => `1/(${data.rrf_k}+${v})`).join(' + ')
const place = (ls: { chunk_id: string }[]) => {
  const i = ls.findIndex((r) => gold.value.has(r.chunk_id))
  return i < 0 ? '—' : i + 1
}
const PARTS = ['is-sys', 'is-rule', 'is-doc']
const tag = (q: string) => {
  const k = QS.find((x) => x.question === q)
  return k ? `${k.id} · ${k.split}` : ''
}
function pick(q: string) { query.value = q; step.value = 0 }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Від питання до злитої видачі</div>
        <div class="lab__sub">
          Оберіть питання або напишіть своє й ідіть кроками. Позначка dev або test каже, чи бачив це питання той, хто складав словник.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': tab === 'steps' }" @click="tab = 'steps'">Кроки</button>
      <button class="lab__pill" :class="{ 'is-on': tab === 'prompt' }" @click="tab = 'prompt'">Промпт для моделі</button>
    </div>

    <template v-if="tab === 'steps'">
      <div class="lab__pills">
        <button v-for="p in PRESETS" :key="p" class="lab__pill" :class="{ 'is-on': query === p }" @click="pick(p)">{{ tag(p) }}</button>
      </div>
      <div class="lab__controls">
        <label class="lab__ctl fr__q"><span>Питання</span><input v-model="query" type="text" @input="step = 0" /></label>
      </div>

      <div class="fr__nav">
        <button class="lab__btn" :disabled="step === 0" @click="step--">← Назад</button>
        <span class="fr__crumb"><b v-for="(s, i) in STEPS" :key="s" :class="{ 'is-on': i <= step }">{{ i + 1 }}. {{ s }}</b></span>
        <button class="lab__btn" :disabled="step === STEPS.length - 1" @click="step++">Далі →</button>
      </div>

      <div class="fr__block">
        <div class="fr__cap">Слова питання і їхні основи: так їх бачить індекс</div>
        <div class="fr__chips"><span v-for="(x, i) in words" :key="i" class="fr__chip" :class="{ 'is-cut': x.s !== x.w }">{{ x.w }}<i v-if="x.s !== x.w"> → {{ x.s }}</i></span></div>
      </div>

      <div v-if="step >= 1" class="fr__block">
        <div class="fr__cap">Що додав словник</div>
        <div v-if="added.length" class="fr__chips"><span v-for="a in added" :key="a.t" class="fr__chip is-add">{{ a.t }}<i> → {{ a.to }}</i></span></div>
        <p v-else class="fr__none">Жодне слово питання не входить до словника: другий список збігається з першим.</p>
      </div>

      <div v-if="step >= 2" class="fr__cols">
        <div class="fr__col">
          <div class="fr__cap">Список A: питання{{ gold.size ? `, правильний чанк на місці ${place(listA)}` : '' }}</div>
          <div v-for="(r, i) in listA" :key="r.chunk_id" class="fr__li" :class="{ 'is-gold': gold.has(r.chunk_id) }"><span>{{ i + 1 }}. {{ r.chunk_id }}</span><span>{{ r.score.toFixed(3) }}</span></div>
        </div>
        <div class="fr__col">
          <div class="fr__cap">Список B: слова словника{{ gold.size ? `, місце ${place(listB)}` : '' }}</div>
          <div v-for="(r, i) in listB" :key="r.chunk_id" class="fr__li" :class="{ 'is-gold': gold.has(r.chunk_id) }"><span>{{ i + 1 }}. {{ r.chunk_id }}</span><span>{{ r.score.toFixed(3) }}</span></div>
        </div>
        <div v-if="step >= 3" class="fr__col fr__col--wide">
          <div class="fr__cap">RRF, k = {{ data.rrf_k }}{{ gold.size ? `, місце ${place(fused)}` : '' }}</div>
          <div v-for="(r, i) in fused" :key="r.chunk_id" class="fr__li" :class="{ 'is-gold': gold.has(r.chunk_id) }">
            <span>{{ i + 1 }}. {{ r.chunk_id }}<small>{{ calc(r.ranks) }}</small></span><span>{{ r.score.toFixed(5) }}</span>
          </div>
        </div>
      </div>
      <p class="lab__note">
        Виділений рядок — правильний чанк із розмітки набору. Для свого питання розмітки немає, тож виділення зникає.
      </p>
    </template>

    <template v-else>
      <div class="fr__msg"><div class="fr__role">system</div>
        <pre v-for="(p, i) in data.prompt" :key="i" class="fr__part" :class="PARTS[i]">{{ p }}</pre>
      </div>
      <div class="fr__msg"><div class="fr__role">user</div><pre class="fr__part is-q">{{ PRESETS[0] }}</pre></div>
      <p class="lab__note">
        <span class="fr__k is-sys">роль</span> <span class="fr__k is-rule">правила</span> <span class="fr__k is-doc">формат</span>
        <span class="fr__k is-q">питання</span>. Такий промпт ставлять перед пошуком, коли словника замало. Числа цього розділу отримано словником.
      </p>
    </template>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.fr__q { grid-column: 1 / -1; }
.fr__nav { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; margin: 0.8rem 0; flex-wrap: wrap; }
.fr__crumb { display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.74rem; }
.fr__crumb b { font-weight: 500; color: var(--vp-c-text-3); }
.fr__crumb b.is-on { color: var(--uk-accent); font-weight: 600; }
.fr__block { margin-bottom: 0.7rem; }
.fr__cap { font-size: 0.74rem; color: var(--vp-c-text-3); margin-bottom: 0.3rem; }
.fr__chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.fr__chip { font-family: var(--vp-font-family-mono); font-size: 0.74rem; border: 1px solid var(--uk-line); border-radius: 6px; padding: 0.05rem 0.4rem; }
.fr__chip i { font-style: normal; color: var(--vp-c-text-3); }
.fr__chip.is-cut { border-color: var(--uk-accent); }
.fr__chip.is-add { border-color: var(--uk-green); }
.fr__none { font-size: 0.78rem; color: var(--vp-c-text-2); margin: 0; }
.fr__cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
.fr__col { border: 1px solid var(--uk-line); border-radius: 8px; padding: 0.5rem 0.55rem; min-width: 0; }
.fr__col--wide { grid-column: 1 / -1; }
@media (max-width: 640px) { .fr__cols { grid-template-columns: minmax(0, 1fr); } }
.fr__li { display: flex; justify-content: space-between; gap: 0.5rem; font-family: var(--vp-font-family-mono); font-size: 0.73rem; padding: 0.08rem 0.25rem; border-radius: 4px; }
.fr__li small { display: block; color: var(--vp-c-text-3); font-size: 0.68rem; }
.fr__li.is-gold { background: var(--uk-accent-soft); }
.fr__msg { border: 1px solid var(--uk-line); border-radius: 10px; padding: 0.6rem 0.7rem 0.7rem; margin-bottom: 0.7rem; }
.fr__role { font-family: var(--vp-font-family-mono); font-size: 0.7rem; color: var(--vp-c-text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.35rem; }
.is-sys { --c: #2E6B4F; --s: #e2f0e9; } .is-rule { --c: #7A4BB0; --s: #efe7f8; } .is-doc { --c: #55556A; --s: #f1f1f6; } .is-q { --c: #3D4EC4; --s: #e5e8fa; }
.dark .is-sys { --s: #1f3a2d; } .dark .is-rule { --s: #34264a; } .dark .is-doc { --s: #2d2d36; } .dark .is-q { --s: #2b3160; }
.fr__part { margin: 0.3rem 0 0; padding: 0.55rem 0.7rem; border-left: 3px solid var(--c); background: var(--s); border-radius: 6px; font-family: var(--vp-font-family-mono); font-size: 0.76rem; line-height: 1.55; white-space: pre-wrap; color: var(--vp-c-text-1); }
.fr__k { padding: 0 0.35rem; border-radius: 4px; font-weight: 600; font-size: 0.78rem; background: var(--s); color: var(--c); }
</style>
