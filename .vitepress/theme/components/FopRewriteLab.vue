<script setup lang="ts">
/**
 * Словоформи, словник, два списки BM25 і RRF на документах ФОП, по одному кроку на екрані.
 * Рахує той самий код, що в l08_eval.py: lib/bm25.js; tools/check_l08.mjs звіряє видачу
 * на всіх питаннях набору.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'
import { tokenize, stem, tokenizeStem, rank, rrf } from '../lib/bm25.js'

type Chunk = { chunk_id: string; version: number; text: string }
const CORPUS = data.corpus as Chunk[]
const GLOSSARY = data.glossary as Record<string, string>
const QS = data.questions
const EXAMPLES = [
  { label: 'мінімальний внесок', q: data.presets[0] },
  { label: 'максимальний обсяг доходу', q: data.presets[1] },
]
const STEPS = [
  { name: 'Обрізання', what: 'Закінчення відрізано і в питанні, і в чанках: різні форми слова стають однією основою.' },
  { name: 'Словник', what: 'Словник дописує слова, якими говорять документи.' },
  { name: 'Два списки', what: 'Шукаємо двічі: за питанням і за словами словника. Виходить два списки.' },
  { name: 'RRF', what: 'RRF зливає списки за місцями: чанк з обох списків обганяє чанк з одного.' },
]

const own = ref(false)
const query = ref(EXAMPLES[0].q)
const step = ref(0)

const gold = computed(() => new Set(QS.find((q) => q.question === query.value)?.gold ?? []))
const year = computed(() => Number((query.value.match(/\b(20\d\d)\b/) || [])[1]) || data.service_year)
const pool = computed(() => CORPUS.filter((c) => c.version === year.value))
const words = computed(() => tokenize(query.value).map((w) => ({ w, s: stem(w) })))
const added = computed(() => tokenize(query.value).filter((t) => t in GLOSSARY).map((t) => ({ t, to: GLOSSARY[t] })))
const extra = computed(() => added.value.map((a) => a.to).join(' '))
const listRaw = computed(() => rank(query.value, pool.value))
const listA = computed(() => rank(query.value, pool.value, tokenizeStem))
const listB = computed(() => rank(extra.value || query.value, pool.value, tokenizeStem))
const fused = computed(() => rrf([listA.value, listB.value], data.rrf_k))
const place = (ls: { chunk_id: string }[]) => {
  const i = ls.findIndex((r) => gold.value.has(r.chunk_id))
  return i < 0 ? 'немає' : i + 1
}
const lead = computed(() => fused.value.find((r) => gold.value.has(r.chunk_id)) ?? fused.value[0])
const calc = computed(() => {
  const r = lead.value
  return r && `${r.chunk_id}: ${r.ranks.filter((v) => v != null).map((v) => `1/(${data.rrf_k}+${v})`).join(' + ')} = ${r.score.toFixed(5)}`
})
const result = computed(() => {
  if (!gold.value.size) return ''
  if (step.value === 0) {
    const was = place(listRaw.value), now = place(listA.value)
    const lower = typeof was === 'number' && (now === 'немає' || now > was)
    return `Місце правильного чанка: без обрізання ${was}, з обрізанням ${now}.${lower ? ' Тут чанк опустився: збігів побільшало й в інших чанків. Наступні кроки це виправляють.' : ''}`
  }
  if (step.value === 2) return `Місце правильного чанка: за питанням ${place(listA.value)}, за словами словника ${place(listB.value)}.`
  if (step.value === 3) return `Після злиття правильний чанк на місці ${place(fused.value)}.`
  return ''
})
function pick(q: string) { own.value = false; query.value = q; step.value = 0 }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Від питання до злитої видачі</div>
        <div class="lab__sub">Натискайте «Далі»: на кожному кроці видно, куди переміщується правильний чанк.</div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="e in EXAMPLES" :key="e.q" class="lab__pill" :class="{ 'is-on': !own && query === e.q }" @click="pick(e.q)">{{ e.label }}</button>
      <button class="lab__pill" :class="{ 'is-on': own }" @click="own = true; step = 0">своє питання</button>
    </div>
    <label v-if="own" class="lab__ctl"><span>Питання</span><input v-model="query" type="text" @input="step = 0" /></label>
    <p v-else class="fr__question">{{ query }}</p>

    <div class="fr__nav">
      <button class="lab__btn" :disabled="step === 0" @click="step--">← Назад</button>
      <span class="fr__crumb"><b v-for="(s, i) in STEPS" :key="s.name" :class="{ 'is-on': i === step }">{{ i + 1 }}. {{ s.name }}</b></span>
      <button class="lab__btn" :disabled="step === STEPS.length - 1" @click="step++">Далі →</button>
    </div>

    <p class="fr__what">{{ STEPS[step].what }}</p>

    <div v-if="step === 0" class="fr__chips">
      <span v-for="(x, i) in words" :key="i" class="fr__chip" :class="{ 'is-cut': x.s !== x.w }">{{ x.w }}<i v-if="x.s !== x.w"> → {{ x.s }}</i></span>
    </div>

    <template v-else-if="step === 1">
      <div v-if="added.length" class="fr__chips"><span v-for="a in added" :key="a.t" class="fr__chip is-add">{{ a.t }}<i> → {{ a.to }}</i></span></div>
      <p v-else class="fr__none">Жодне слово питання не входить до словника, тому другий список збігатиметься з першим.</p>
    </template>

    <div v-else-if="step === 2" class="fr__cols">
      <div class="fr__col">
        <div class="fr__cap">За питанням</div>
        <div v-for="(r, i) in listA.slice(0, 5)" :key="r.chunk_id" class="fr__li" :class="{ 'is-gold': gold.has(r.chunk_id) }">{{ i + 1 }}. {{ r.chunk_id }}</div>
      </div>
      <div class="fr__col">
        <div class="fr__cap">За словами словника</div>
        <div v-for="(r, i) in listB.slice(0, 5)" :key="r.chunk_id" class="fr__li" :class="{ 'is-gold': gold.has(r.chunk_id) }">{{ i + 1 }}. {{ r.chunk_id }}</div>
      </div>
    </div>

    <template v-else>
      <div class="fr__col">
        <div class="fr__cap">Злитий список</div>
        <div v-for="(r, i) in fused.slice(0, 5)" :key="r.chunk_id" class="fr__li" :class="{ 'is-gold': gold.has(r.chunk_id) }">{{ i + 1 }}. {{ r.chunk_id }}</div>
      </div>
      <div v-if="calc" class="fr__calc">{{ calc }}</div>
    </template>

    <p v-if="result" class="fr__result">{{ result }}</p>
    <p v-if="own && !gold.size" class="lab__note">Для свого питання правильний чанк не розмічено, тому він не виділений.</p>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.fr__question { font-size: 0.92rem; font-weight: 500; margin: 0.2rem 0 0; }
.fr__nav { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; margin: 0.8rem 0; flex-wrap: wrap; }
.fr__crumb { display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.74rem; }
.fr__crumb b { font-weight: 500; color: var(--vp-c-text-3); }
.fr__crumb b.is-on { color: var(--uk-accent); font-weight: 600; }
.fr__what { font-size: 0.84rem; line-height: 1.5; margin: 0 0 0.6rem; }
.fr__result { font-size: 0.86rem; font-weight: 600; color: var(--uk-accent); margin: 0.7rem 0 0; }
.fr__cap { font-size: 0.74rem; color: var(--vp-c-text-3); margin-bottom: 0.3rem; }
.fr__chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.fr__chip { font-family: var(--vp-font-family-mono); font-size: 0.74rem; border: 1px solid var(--uk-line); border-radius: 6px; padding: 0.05rem 0.4rem; }
.fr__chip i { font-style: normal; color: var(--vp-c-text-3); }
.fr__chip.is-cut { border-color: var(--uk-accent); }
.fr__chip.is-add { border-color: var(--uk-green); }
.fr__none { font-size: 0.8rem; color: var(--vp-c-text-2); margin: 0; }
.fr__cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
.fr__col { border: 1px solid var(--uk-line); border-radius: 8px; padding: 0.5rem 0.55rem; min-width: 0; }
@media (max-width: 640px) { .fr__cols { grid-template-columns: minmax(0, 1fr); } }
.fr__li { font-family: var(--vp-font-family-mono); font-size: 0.74rem; padding: 0.08rem 0.25rem; border-radius: 4px; }
.fr__li.is-gold { background: var(--uk-accent-soft); font-weight: 600; }
.fr__calc { font-family: var(--vp-font-family-mono); font-size: 0.76rem; padding: 0.4rem 0.6rem; background: var(--uk-fill); border-radius: 6px; margin-top: 0.5rem; overflow-wrap: anywhere; }
</style>
