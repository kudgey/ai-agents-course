<script setup lang="ts">
/**
 * «Злиття RRF»: два ранжовані списки з lec06_toy.json (BM25 і умовний щільний) зливаються
 * за формулою 1/(k + ранг). Крок 1 додає внески BM25, крок 2 — щільного списку, крок 3
 * сортує. За замовчуванням — k = 60 і останній крок: ті самі п'ять чисел, що дає ручний
 * розрахунок (0.0328, 0.0320, 0.0318, 0.0159, 0.0154).
 */
import { ref, computed } from 'vue'
import data from '../../data/lec06_toy.json'
import { useStepper } from '../composables/useStepper'
import StepControls from './StepControls.vue'

const BM = data.rrf.bm25 as string[]
const DN = data.rrf.dense as string[]
const K0 = data.rrf.k as number
const k = ref(K0)
const STAGES = ['порожньо', '+ внески BM25', '+ внески щільного', 'сортування']
const { step, playing, reduced, next, play, reset, done } = useStepper(() => 3, { interval: 1100 })

const docs = [...new Set([...BM, ...DN])]
const rank = (list: string[], d: string) => list.indexOf(d) + 1          // 0 — немає в списку
const part = (list: string[], d: string) => (rank(list, d) ? 1 / (k.value + rank(list, d)) : 0)
const rows = computed(() => docs.map((d) => {
  const a = step.value >= 1 ? part(BM, d) : 0
  const b = step.value >= 2 ? part(DN, d) : 0
  return { d, a, b, s: a + b }
}))
const maxS = computed(() => Math.max(...docs.map((d) => part(BM, d) + part(DN, d))))
const ordered = computed(() => (step.value >= 3 ? [...rows.value].sort((x, y) => y.s - x.s) : rows.value))
const pick = ref('d2')
const formula = computed(() => {
  const d = pick.value
  const t = [[BM, 'BM25'], [DN, 'щільний']].filter(([l]) => rank(l as string[], d))
    .map(([l]) => `1/(${k.value} + ${rank(l as string[], d)})`)
  return `${d}: ${t.join(' + ')} = ${(part(BM, d) + part(DN, d)).toFixed(4)}`
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Злиття RRF: два списки — одна видача</div>
        <div class="lab__sub">
          Кожен список голосує оберненим рангом 1/(k + ранг). Скори BM25 і косинуса тут не
          беруть участі взагалі — лише позиції.
        </div>
      </div>
    </div>

    <StepControls :playing="playing" :reduced="reduced" :done="done" :label="STAGES[step]"
                  @step="next" @play="play" @reset="reset" />

    <div class="rf__grid">
      <section>
        <div class="rf__h rf__h--a">BM25</div>
        <div v-for="(d, i) in BM" :key="d" class="rf__src" :class="{ 'is-on': step >= 1, 'is-pick': pick === d }" @click="pick = d">
          <span class="rf__r">{{ i + 1 }}</span><b>{{ d }}</b><span class="rf__v">+{{ part(BM, d).toFixed(4) }}</span>
        </div>
      </section>
      <section>
        <div class="rf__h rf__h--b">Щільний (умовний)</div>
        <div v-for="(d, i) in DN" :key="d" class="rf__src" :class="{ 'is-on': step >= 2, 'is-pick': pick === d }" @click="pick = d">
          <span class="rf__r">{{ i + 1 }}</span><b>{{ d }}</b><span class="rf__v">+{{ part(DN, d).toFixed(4) }}</span>
        </div>
      </section>
      <section>
        <div class="rf__h">Злиття{{ step >= 3 ? ' — за сумою' : '' }}</div>
        <TransitionGroup name="rf-move" tag="div">
          <div v-for="r in ordered" :key="r.d" class="rf__row" :class="{ 'is-pick': pick === r.d }" @click="pick = r.d">
            <b>{{ r.d }}</b>
            <span class="rf__bar"><i class="rf__a" :style="{ width: (r.a / maxS) * 100 + '%' }" /><i class="rf__b" :style="{ width: (r.b / maxS) * 100 + '%' }" /></span>
            <span class="rf__s">{{ r.s ? r.s.toFixed(4) : '—' }}</span>
          </div>
        </TransitionGroup>
      </section>
    </div>

    <div class="rf__formula">{{ formula }}</div>

    <div class="lab__controls">
      <label class="lab__ctl"><span>Константа згладжування <b>k = {{ k }}</b></span>
        <input v-model.number="k" type="range" min="1" max="100" step="1" /></label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': k === 1 }" @click="k = 1">k = 1</button>
      <button class="lab__pill" :class="{ 'is-on': k === K0 }" @click="k = K0">k = {{ K0 }}, як у статті</button>
    </div>

    <p class="lab__note">
      Що тут видно: при k = 60 сусідні місця дають майже однакові внески, і першим стає d1,
      який високо поставили обидва списки, а d2 обходить d6 завдяки щільному пошуку. При
      k = 1 перше місце важить 0.5, друге — 0.33, і вирішує вже те, хто перший хоча б десь.
    </p>
  </div>
</template>

<style scoped>
.rf__grid { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1.4fr); gap: 1rem; margin-bottom: 0.7rem; }
.rf__h { font-size: 0.76rem; font-weight: 600; color: var(--vp-c-text-2); margin-bottom: 0.4rem; }
.rf__h--a { color: var(--uk-accent); }
.rf__h--b { color: #0d9488; }
.rf__src, .rf__row {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.5rem; margin-bottom: 0.3rem;
  border: 1px solid var(--uk-line); border-radius: 7px; font-size: 0.8rem; cursor: pointer;
}
.rf__src { opacity: 0.55; transition: opacity 0.3s ease; }
.rf__src.is-on { opacity: 1; }
.is-pick { border-color: var(--uk-accent); }
.rf__r { font-family: var(--vp-font-family-mono); font-size: 0.72rem; color: var(--vp-c-text-3); width: 0.8rem; }
.rf__v { margin-left: auto; font-family: var(--vp-font-family-mono); font-size: 0.72rem; color: var(--vp-c-text-3); }
.rf__row b, .rf__src b { font-family: var(--vp-font-family-mono); font-size: 0.78rem; }
.rf__bar { flex: 1; display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: var(--uk-fill); }
.rf__bar i { display: block; height: 100%; transition: width 0.45s ease; }
.rf__a { background: var(--uk-accent); }
.rf__b { background: #0d9488; }
.rf__s { font-family: var(--vp-font-family-mono); font-size: 0.78rem; width: 3.6rem; text-align: right; }
.rf-move-move { transition: transform 0.45s ease; }
.rf__formula {
  font-family: var(--vp-font-family-mono); font-size: 0.78rem; padding: 0.45rem 0.7rem;
  background: var(--uk-fill); border-radius: 8px; margin-bottom: 0.8rem; overflow-wrap: anywhere;
}
</style>
