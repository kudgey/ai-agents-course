<script setup lang="ts">
/**
 * Recall@3, MRR і nDCG@3 на одній видачі з п'яти фрагментів.
 * Порядок за замовчуванням, оцінки релевантності й фрагменти — з lec06_toy.json,
 * тобто той самий приклад, що розрахований у тексті вручну.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec06_toy.json'

const TEXT = Object.fromEntries((data.docs as { id: string; text: string }[]).map((d) => [d.id, d.text]))
const REL = data.rel as Record<string, number>
const START = data.ranking as string[]
const K = 3

const order = ref([...START])

function move(i: number, by: number) {
  const j = i + by
  if (j < 0 || j >= order.value.length) return
  const o = [...order.value]
  ;[o[i], o[j]] = [o[j], o[i]]
  order.value = o
}

const rel = (d: string) => REL[d] ?? 0
const relevant = Object.keys(REL).filter((d) => REL[d] > 0)
const ideal = Object.values(REL).sort((a, b) => b - a).slice(0, K)
const IDCG = ideal.reduce((s, r, i) => s + r / Math.log2(i + 2), 0)

const m = computed(() => {
  const top = order.value.slice(0, K)
  const recall = relevant.filter((d) => top.includes(d)).length / relevant.length
  const first = order.value.findIndex((d) => rel(d) > 0)
  const mrr = first >= 0 ? 1 / (first + 1) : 0
  const gains = top.map((d, i) => ({ r: rel(d), den: Math.log2(i + 2) }))
  const dcg = gains.reduce((s, g) => s + g.r / g.den, 0)
  return { recall, mrr, first, gains, dcg, ndcg: dcg / IDCG }
})

const fmtDen = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(3))
const isStart = computed(() => order.value.join() === START.join())
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Три метрики на одній видачі</div>
        <div class="lab__sub">
          Питання «Коли перескладання з бази даних?». d1 — пряма відповідь (оцінка 2),
          d2 — корисний контекст (оцінка 1). Переставляйте фрагменти стрілками.
        </div>
      </div>
    </div>

    <div class="mt__list">
      <template v-for="(d, i) in order" :key="d">
        <div class="mt__item" :class="{ 'is-top': i < K }">
          <span class="mt__pos">{{ i + 1 }}</span>
          <span class="mt__grade" :class="'g' + rel(d)">{{ rel(d) }}</span>
          <span class="mt__text"><b>{{ d }}</b> {{ TEXT[d] }}</span>
          <span class="mt__btns">
            <button class="lab__btn" :disabled="i === 0" aria-label="вище" @click="move(i, -1)">↑</button>
            <button class="lab__btn" :disabled="i === order.length - 1" aria-label="нижче" @click="move(i, 1)">↓</button>
          </span>
        </div>
        <div v-if="i === K - 1" class="mt__cut">↑ перші {{ K }} позиції — те, що бачать Recall@3 і nDCG@3</div>
      </template>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': isStart }" @click="order = [...START]">як у тексті</button>
      <button class="lab__pill" @click="order = ['d1', 'd2', ...START.filter((d) => !REL[d])]">ідеальний порядок</button>
    </div>

    <div class="mt__calc">
      DCG@3 =
      <template v-for="(g, i) in m.gains" :key="i">{{ i ? ' + ' : '' }}{{ g.r }}/{{ fmtDen(g.den) }}</template>
      = {{ m.dcg.toFixed(3) }}; &nbsp; nDCG@3 = {{ m.dcg.toFixed(3) }} / {{ IDCG.toFixed(3) }} = {{ m.ndcg.toFixed(2) }}
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ m.recall.toFixed(2) }}</b><span>Recall@3: скільки релевантних у топ-3</span></div>
      <div class="lab__stat is-green"><b>{{ m.mrr.toFixed(2) }}</b><span>MRR: перше влучення на позиції {{ m.first + 1 }}</span></div>
      <div class="lab__stat is-warm"><b>{{ m.ndcg.toFixed(2) }}</b><span>nDCG@3: порядок і градації</span></div>
    </div>

    <p class="lab__note">
      Поміняйте місцями d1 і d6: MRR стане 1.00, а Recall@3 не зміниться — у топ-3 той самий
      набір. Підніміть d2 на третє місце: Recall@3 зросте до 1.00, а MRR лишиться 0.50.
      Кожна метрика реагує на свій вид помилки.
    </p>
  </div>
</template>

<style scoped>
.mt__list { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.9rem; }
.mt__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
}
.mt__item.is-top { background: var(--uk-fill); }
.mt__pos { font-family: var(--vp-font-family-mono); font-size: 0.75rem; color: var(--vp-c-text-3); width: 0.9rem; flex: none; }
.mt__grade {
  flex: none;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--uk-fill);
  color: var(--vp-c-text-3);
}
.mt__grade.g1 { background: var(--uk-accent-soft); color: var(--uk-accent); }
.mt__grade.g2 { background: var(--uk-green-soft); color: var(--uk-green); }
.mt__text { flex: 1; min-width: 0; font-size: 0.82rem; line-height: 1.4; }
.mt__text b { font-family: var(--vp-font-family-mono); font-size: 0.76rem; color: var(--uk-accent); margin-right: 0.2rem; }
.mt__btns { display: flex; gap: 0.25rem; flex: none; }
.mt__btns .lab__btn { padding: 0.2rem 0.5rem; }
.mt__cut {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  padding: 0 0 0.25rem 0.4rem;
  border-bottom: 1px dashed var(--uk-line);
  margin-bottom: 0.2rem;
}
.mt__calc {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  padding: 0.5rem 0.75rem;
  background: var(--uk-fill);
  border-radius: 8px;
  overflow-wrap: anywhere;
}
</style>
