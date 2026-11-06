<script setup lang="ts">
/**
 * Вимірювання пошуку на наборі питань лекції 08. Метрики й місця чанків рахує l08_eval.py
 * (lec08.json); тут лише вибір конфігурації й частини набору. Парна різниця — та сама формула.
 * stage="1" показує лише те, що вже відомо в розділі 1: конвеєр Л07 і рядок без фільтра.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'

const props = withDefaults(defineProps<{ stage?: string }>(), { stage: '5' })
type Scope = 'all' | 'dev' | 'test'
const CONFIGS = data.configs.filter((c) => props.stage !== '1' || ['nofilter', 'base'].includes(c.key))
const QS = data.questions
const NA = data.no_answer
const key = ref(props.stage === '1' ? 'base' : 'rrf')
const scope = ref<Scope | 'none'>('all')
const onlyMiss = ref(false)
const open = ref<string | null>(null)

// dev і test вводить розділ 2, тому в розділі 1 їх ще немає
const SCOPES = [
  { id: 'all', label: `усі ${data.n}` },
  { id: 'dev', label: `dev ${QS.filter((q) => q.split === 'dev').length}` },
  { id: 'test', label: `test ${QS.filter((q) => q.split === 'test').length}` },
  { id: 'none', label: `без відповіді ${NA.length}` },
].filter((s) => props.stage !== '1' || !['dev', 'test'].includes(s.id))
const conf = computed(() => CONFIGS.find((c) => c.key === key.value)!)
const stats = computed(() => conf.value[(scope.value === 'none' ? 'all' : scope.value) as Scope])
const pool = computed(() => QS.filter((q) => scope.value === 'all' || q.split === scope.value))
const rows = computed(() => pool.value.filter((q) => !onlyMiss.value || !hit(q.ranks[key.value as keyof typeof q.ranks], 3)))

function hit(r: number | null | undefined, k: number) { return r != null && r <= k }
const delta = computed(() => {
  if (key.value === 'base') return null
  const d = pool.value.map((q) => Number(hit(q.ranks[key.value as keyof typeof q.ranks], 1)) - Number(hit(q.ranks.base, 1)))
  const m = d.reduce((s, v) => s + v, 0) / d.length
  const half = 1.96 * Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / (d.length - 1) / d.length)
  return { m, lo: m - half, hi: m + half, won: d.filter((v) => v > 0).length, lost: d.filter((v) => v < 0).length }
})
const sign = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(3)
const cls = (r: number | null | undefined) => (r == null ? 'is-miss' : r === 1 ? 'is-1' : r <= 3 ? 'is-3' : 'is-miss')
const maxTop = Math.max(...NA.map((q) => q.top))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">{{ stage === '1' ? 'Конвеєр Л07 на наборі питань' : 'Одна зміна на всьому наборі' }}</div>
        <div class="lab__sub">
          Цифра — місце першого правильного чанка у видачі: зелена — перше, жовта — у top-3, червона — далі або немає.
          Клацніть питання, щоб побачити правильні чанки.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="c in CONFIGS" :key="c.key" class="lab__pill" :class="{ 'is-on': key === c.key }" @click="key = c.key">{{ c.label }}</button>
    </div>
    <div class="lab__pills">
      <button v-for="s in SCOPES" :key="s.id" class="lab__pill" :class="{ 'is-on': scope === s.id }" @click="scope = s.id as Scope | 'none'">{{ s.label }}</button>
      <button v-if="scope !== 'none'" class="lab__pill" :class="{ 'is-on': onlyMiss }" @click="onlyMiss = !onlyMiss">лише промахи за Hit@3</button>
    </div>

    <template v-if="scope !== 'none'">
      <div class="lab__stats">
        <div class="lab__stat"><b>{{ (stats.hit1 / stats.n).toFixed(3) }}</b><span>Hit@1 · 95 % [{{ stats.lo.toFixed(3) }}; {{ stats.hi.toFixed(3) }}]</span></div>
        <div class="lab__stat"><b>{{ (stats.hit3 / stats.n).toFixed(3) }}</b><span>Hit@3: бюджет на три чанки</span></div>
        <div class="lab__stat"><b>{{ stats.mrr.toFixed(3) }}</b><span>MRR</span></div>
        <div class="lab__stat" :class="delta && delta.lo > 0 ? 'is-green' : ''">
          <template v-if="!delta"><b>база</b><span>з нею порівнюють решту</span></template>
          <template v-else-if="!delta.won && !delta.lost"><b>0</b><span>жодної зміни в Hit@1 до бази</span></template>
          <template v-else><b>{{ sign(delta.m) }}</b><span>Hit@1 до бази [{{ sign(delta.lo) }}; {{ sign(delta.hi) }}], {{ delta.won }} і {{ delta.lost }}</span></template>
        </div>
      </div>

      <div class="fe__list">
        <div class="fe__row fe__row--head"><span>питання</span><span>Л07</span><span>тут</span></div>
        <template v-for="q in rows" :key="q.id">
          <button class="fe__row" @click="open = open === q.id ? null : q.id">
            <span class="fe__q"><code>{{ q.id }}</code> {{ q.question }}</span>
            <span class="fe__c" :class="cls(q.ranks.base)">{{ q.ranks.base ?? '—' }}</span>
            <span class="fe__c" :class="[cls(q.ranks[key as keyof typeof q.ranks]), q.ranks[key as keyof typeof q.ranks] !== q.ranks.base ? 'is-new' : '']">{{ q.ranks[key as keyof typeof q.ranks] ?? '—' }}</span>
          </button>
          <div v-if="open === q.id" class="fe__gold">{{ q.register }} · {{ q.split }} · правильні чанки: <code v-for="g in q.gold" :key="g">{{ g }}</code></div>
        </template>
      </div>
      <p class="lab__note">
        Рамка — місце змінилось відносно конвеєра Л07. Прочерк: правильного чанка немає у видачі.
      </p>
    </template>

    <template v-else>
      <div class="fe__list">
        <div v-for="q in NA" :key="q.id" class="fe__na">
          <span class="fe__q"><code>{{ q.id }}</code> {{ q.question }}</span>
          <span class="fe__bar"><i :style="{ width: (100 * q.top) / maxTop + '%' }" /><u :style="{ left: (100 * data.min_score) / maxTop + '%' }" /></span>
          <span class="fe__s">{{ q.top.toFixed(3) }}</span>
        </div>
      </div>
      <p class="lab__note">
        Найвищий score конвеєра Л07 на питаннях, відповіді на які в документах немає. Риска — поріг {{ data.min_score }}:
        усі {{ NA.length }} питань його проходять і потрапляють у промпт.
      </p>
    </template>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.fe__list { display: flex; flex-direction: column; max-height: 24rem; overflow-y: auto; border: 1px solid var(--uk-line); border-radius: 10px; margin-top: 0.8rem; }
.fe__row { display: grid; grid-template-columns: minmax(0, 1fr) 2.6rem 2.6rem; gap: 0.5rem; align-items: center; width: 100%; padding: 0.3rem 0.6rem; background: none; border: none; border-bottom: 1px solid var(--uk-line); font: inherit; color: inherit; text-align: left; cursor: pointer; }
.fe__row--head { font-size: 0.72rem; color: var(--vp-c-text-3); cursor: default; position: sticky; top: 0; background: var(--vp-c-bg); z-index: 1; }
.fe__row--head span:not(:first-child) { text-align: center; }
.fe__q { font-size: 0.8rem; line-height: 1.35; min-width: 0; }
.fe__q code { font-size: 0.7rem; color: var(--vp-c-text-3); background: none; padding: 0; margin-right: 0.2rem; }
.fe__c { font-family: var(--vp-font-family-mono); font-size: 0.76rem; text-align: center; border-radius: 5px; padding: 0.05rem 0; }
.fe__c.is-1 { background: #e2f0e9; color: #2E6B4F; }
.fe__c.is-3 { background: #fff3d6; color: #7a5600; }
.fe__c.is-miss { background: #fbebe1; color: #B4531F; }
.dark .fe__c.is-1 { background: #1f3a2d; color: #9fd8bb; }
.dark .fe__c.is-3 { background: #443610; color: #f2d58a; }
.dark .fe__c.is-miss { background: #4a2d1c; color: #f0b799; }
.fe__c.is-new { box-shadow: 0 0 0 2px var(--uk-accent); }
.fe__gold { padding: 0.3rem 0.6rem 0.5rem; font-size: 0.74rem; color: var(--vp-c-text-2); border-bottom: 1px solid var(--uk-line); }
.fe__gold code { font-size: 0.72rem; margin-left: 0.25rem; }
.fe__na { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) 3.2rem; gap: 0.6rem; align-items: center; padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--uk-line); }
.fe__bar { position: relative; height: 0.8rem; background: var(--uk-fill); border-radius: 3px; }
.fe__bar i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--uk-warm); border-radius: 3px; opacity: 0.75; }
.fe__bar u { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--vp-c-text-1); }
.fe__s { font-family: var(--vp-font-family-mono); font-size: 0.74rem; text-align: right; }
@media (max-width: 640px) { .fe__na { grid-template-columns: minmax(0, 1fr) 3.2rem; } .fe__na .fe__bar { grid-column: 1 / 3; grid-row: 2; } }
</style>
