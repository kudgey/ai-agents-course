<script setup lang="ts">
/**
 * Вимірювання пошуку на наборі питань лекції 08. Місця чанків і метрики рахує l08_eval.py
 * (lec08.json); тут лише показ. Парна різниця — та сама формула.
 * stage="1": де стоїть правильний чанк, ще без назв метрик (розділ 1).
 * stage="5": що змінює кожна конфігурація (розділ 5).
 * stage="none": питання без відповіді проти порога score (розділ 5).
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'

const props = withDefaults(defineProps<{ stage?: string }>(), { stage: '5' })
type Q = (typeof data.questions)[number]
type Key = keyof Q['ranks']
const QS = data.questions
const NA = data.no_answer
const hit = (r: number | null | undefined, k: number) => r != null && r <= k
const cls = (r: number | null | undefined) => (r == null || r > 3 ? 'is-miss' : r === 1 ? 'is-1' : 'is-3')

// розділ 1
const onlyMiss = ref(false)
const first = QS.filter((q) => q.ranks.base === 1).length
const near = QS.filter((q) => hit(q.ranks.base, 3)).length - first
const miss = QS.length - first - near
const rows = computed(() => QS.filter((q) => !onlyMiss.value || !hit(q.ranks.base, 3)))

// розділ 5
const SHORT: Record<string, string> = {
  nofilter: 'без фільтра року', base: 'конвеєр Л07', stop: 'стоп-слова',
  stem: 'обрізання', gloss: 'обрізання + словник', rrf: 'обрізання + RRF',
}
const CFG = Object.fromEntries(data.configs.map((c) => [c.key, c]))
const key = ref<Key>('rrf')
const conf = computed(() => CFG[key.value])
const share = (c: (typeof data.configs)[number], m: 'hit1' | 'hit3', part: 'all' | 'test' = 'all') => (c[part][m] / c[part].n).toFixed(3)
const changed = computed(() => QS.filter((q) => q.ranks[key.value] !== q.ranks.base))
const delta = computed(() => {
  const d = QS.map((q: Q) => Number(hit(q.ranks[key.value], 1)) - Number(hit(q.ranks.base, 1)))
  const m = d.reduce((s, v) => s + v, 0) / d.length
  const half = 1.96 * Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / (d.length - 1) / d.length)
  return { m, lo: m - half, hi: m + half, won: d.filter((v) => v > 0).length, lost: d.filter((v) => v < 0).length }
})
const sign = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(3)
const real = computed(() => delta.value.lo > 0 || delta.value.hi < 0)

// питання без відповіді
const maxTop = Math.max(...NA.map((q) => q.top))
</script>

<template>
  <div v-if="stage === '1'" class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Де стоїть правильний чанк</div>
        <div class="lab__sub">Рядок — одне питання, цифра — місце правильного чанка у видачі конвеєра Л07.</div>
      </div>
    </div>
    <div class="fe__strip">
      <span class="is-1" :style="{ flexGrow: first }">{{ first }}</span>
      <span class="is-3" :style="{ flexGrow: near }">{{ near }}</span>
      <span class="is-miss" :style="{ flexGrow: miss }">{{ miss }}</span>
    </div>
    <div class="fe__legend">
      <span><i class="is-1" />перше місце</span>
      <span><i class="is-3" />друге або третє</span>
      <span><i class="is-miss" />далі або немає: це промахи</span>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': onlyMiss }" @click="onlyMiss = !onlyMiss">лише промахи</button>
    </div>
    <div class="fe__list">
      <div v-for="q in rows" :key="q.id" class="fe__row">
        <span class="fe__q"><code>{{ q.id }}</code> {{ q.question }}</span>
        <span class="fe__c" :class="cls(q.ranks.base)">{{ q.ranks.base ?? '—' }}</span>
      </div>
    </div>
  </div>

  <div v-else-if="stage === '5'" class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Що змінює кожна конфігурація</div>
        <div class="lab__sub">Оберіть конфігурацію: нижче лишаються лише питання, де місце правильного чанка стало іншим, ніж у конвеєрі Л07.</div>
      </div>
    </div>
    <div class="lab__pills">
      <button v-for="c in data.configs" :key="c.key" class="lab__pill" :class="{ 'is-on': key === c.key }" @click="key = c.key as Key">{{ SHORT[c.key] }}</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ share(conf, 'hit1') }}</b><span>Hit@1, у конвеєрі Л07 {{ share(CFG.base, 'hit1') }}</span></div>
      <div class="lab__stat"><b>{{ share(conf, 'hit3') }}</b><span>Hit@3, у конвеєрі Л07 {{ share(CFG.base, 'hit3') }}</span></div>
    </div>

    <p v-if="key === 'base'" class="fe__say">Це база: з нею порівнюємо всі інші конфігурації.</p>
    <template v-else>
      <p class="fe__say" :class="real ? 'is-green' : 'is-warm'">
        На першому місці: виграно {{ delta.won }}, програно {{ delta.lost }}. Різниця {{ sign(delta.m) }}
        [{{ sign(delta.lo) }}; {{ sign(delta.hi) }}]: {{ real ? 'нуль поза інтервалом, зміна справжня.' : 'інтервал накриває нуль, на цьому наборі зміни не видно.' }}
      </p>
      <p v-if="key === 'gloss' || key === 'rrf'" class="fe__say">
        Перевірка на test, якого словник не бачив: обрізання дає Hit@1 {{ share(CFG.stem, 'hit1', 'test') }}, ця конфігурація {{ share(conf, 'hit1', 'test') }}.
      </p>
      <div class="fe__list fe__list--short">
        <div class="fe__row fe__row--head"><span>питання</span><span>було</span><span>стало</span></div>
        <div v-for="q in changed" :key="q.id" class="fe__row fe__row--two">
          <span class="fe__q"><code>{{ q.id }}</code> {{ q.question }}</span>
          <span class="fe__c" :class="cls(q.ranks.base)">{{ q.ranks.base ?? '—' }}</span>
          <span class="fe__c" :class="cls(q.ranks[key])">{{ q.ranks[key] ?? '—' }}</span>
        </div>
      </div>
    </template>
  </div>

  <div v-else class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Питання без відповіді проти порога</div>
        <div class="lab__sub">Смуга — найвищий score питання, на яке в документах відповіді немає. Риска — поріг {{ data.min_score }}.</div>
      </div>
    </div>
    <div class="fe__list">
      <div v-for="q in NA" :key="q.id" class="fe__na">
        <span class="fe__q"><code>{{ q.id }}</code> {{ q.question }}</span>
        <span class="fe__bar"><i :style="{ width: (100 * q.top) / maxTop + '%' }" /><u :style="{ left: (100 * data.min_score) / maxTop + '%' }" /></span>
        <span class="fe__s">{{ q.top.toFixed(3) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.is-1 { --s: #e2f0e9; --c: #2E6B4F; }
.is-3 { --s: #fff3d6; --c: #7a5600; }
.is-miss { --s: #fbebe1; --c: #B4531F; }
.dark .is-1 { --s: #1f3a2d; --c: #9fd8bb; }
.dark .is-3 { --s: #443610; --c: #f2d58a; }
.dark .is-miss { --s: #4a2d1c; --c: #f0b799; }
.fe__strip { display: flex; gap: 2px; border-radius: 8px; overflow: hidden; margin-bottom: 0.45rem; }
.fe__strip span { flex-basis: 0; padding: 0.3rem 0; text-align: center; font-weight: 600; font-size: 0.95rem; background: var(--s); color: var(--c); }
.fe__legend { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; font-size: 0.76rem; color: var(--vp-c-text-2); margin-bottom: 0.7rem; }
.fe__legend i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; margin-right: 0.3rem; vertical-align: -1px; background: var(--s); border: 1px solid var(--c); }
.fe__say { font-size: 0.84rem; line-height: 1.5; margin: 0.7rem 0 0; }
.fe__say.is-green { color: var(--uk-green); }
.fe__say.is-warm { color: var(--uk-warm); }
.dark .fe__say.is-green { color: #9fd8bb; }
.dark .fe__say.is-warm { color: #f0b799; }
.fe__list { display: flex; flex-direction: column; max-height: 19rem; overflow-y: auto; border: 1px solid var(--uk-line); border-radius: 10px; margin-top: 0.7rem; }
.fe__list--short { max-height: 15rem; }
.fe__row { display: grid; grid-template-columns: minmax(0, 1fr) 2.6rem; gap: 0.5rem; align-items: center; padding: 0.3rem 0.6rem; border-bottom: 1px solid var(--uk-line); }
.fe__row--two, .fe__row--head { grid-template-columns: minmax(0, 1fr) 2.6rem 2.6rem; }
.fe__row--head { font-size: 0.72rem; color: var(--vp-c-text-3); position: sticky; top: 0; background: var(--vp-c-bg); z-index: 1; }
.fe__row--head span:not(:first-child) { text-align: center; }
.fe__q { font-size: 0.8rem; line-height: 1.35; min-width: 0; }
.fe__q code { font-size: 0.7rem; color: var(--vp-c-text-3); background: none; padding: 0; margin-right: 0.2rem; }
.fe__c { font-family: var(--vp-font-family-mono); font-size: 0.76rem; text-align: center; border-radius: 5px; padding: 0.05rem 0; background: var(--s); color: var(--c); }
.fe__na { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) 3.2rem; gap: 0.6rem; align-items: center; padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--uk-line); }
.fe__bar { position: relative; height: 0.8rem; background: var(--uk-fill); border-radius: 3px; }
.fe__bar i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--uk-warm); border-radius: 3px; opacity: 0.75; }
.fe__bar u { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--vp-c-text-1); }
.fe__s { font-family: var(--vp-font-family-mono); font-size: 0.74rem; text-align: right; }
@media (max-width: 640px) { .fe__na { grid-template-columns: minmax(0, 1fr) 3.2rem; } .fe__na .fe__bar { grid-column: 1 / 3; grid-row: 2; } }
</style>
