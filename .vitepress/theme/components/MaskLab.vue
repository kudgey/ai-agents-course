<script setup lang="ts">
/**
 * «Генерація під маскою»: схема {"abstained": true|false}, токен за токеном.
 * Автомат граматики підсвічує стан, рядок росте, поруч — softmax до і після маски
 * для поточного кроку. Логіти ілюстративні (так сказано в тексті), ймовірності
 * пораховано з них у lec05.json. За замовчуванням — стан S3, розібраний у тексті.
 */
import { ref, computed, watch } from 'vue'
import data from '../../data/lec05.json'
import { useStepper } from '../composables/useStepper'
import StepControls from './StepControls.vue'

type Step = { state: string; allowed: string[]; logits: number[]; before: number[]; after: number[]; top_before: string; top_allowed: boolean }

const VOCAB = data.vocab as string[]
const STEPS = data.mask as Step[]
const N = STEPS.length                       // 5 робочих станів S0–S4, кінцевий S5
const show = (t: string) => t.trim()
const argmax = (ps: number[]) => ps.indexOf(Math.max(...ps))

const masked = ref(true)
const { step, playing, reduced, next, play, reset, done } = useStepper(() => N, { start: 3, interval: 1100 })
watch(masked, () => reset())

/** Без маски модель уже на першому ж кроці бере найімовірніший токен, навіть заборонений. */
const broken = computed(() => {
  if (masked.value) return null
  for (let k = 0; k < Math.min(step.value, N); k++) {
    const tok = VOCAB[argmax(STEPS[k].before)]
    if (!STEPS[k].allowed.includes(tok)) return { at: k, tok }
  }
  return null
})

const tokens = computed(() => {
  const out: { t: string; bad: boolean }[] = []
  for (let k = 0; k < Math.min(step.value, N); k++) {
    const ps = masked.value ? STEPS[k].after : STEPS[k].before
    const t = VOCAB[argmax(ps)]
    out.push({ t, bad: !STEPS[k].allowed.includes(t) })
    if (broken.value && broken.value.at === k) break
  }
  return out
})

const cur = computed(() => (step.value < N ? STEPS[step.value] : null))
const rows = computed(() => cur.value
  ? VOCAB.map((tok, i) => ({ tok, z: cur.value!.logits[i], before: cur.value!.before[i], after: cur.value!.after[i], ok: cur.value!.allowed.includes(tok) }))
  : [])

const NODES = ['S0 · початок', 'S1 · ключ', 'S2 · двокрапка', 'S3 · значення', 'S4 · кінець', 'S5 · готово']
const EDGES = ['{', '"abstained"', ':', 'true | false', '}']
function nodeState(i: number) {
  if (broken.value) return i < broken.value.at ? 'pass' : i === broken.value.at ? 'fail' : 'off'
  if (i < step.value) return 'pass'
  return i === step.value ? 'now' : 'todo'
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Генерація під маскою, токен за токеном</div>
        <div class="lab__sub">
          Схема <code>{"abstained": true | false}</code>. Автомат граматики знає, які токени
          допустимі в кожному стані; усі інші отримують логіт −∞ ще до softmax.
        </div>
      </div>
    </div>

    <StepControls :playing="playing" :reduced="reduced" :done="done || !!broken"
                  :label="step < N ? `стан S${step}` : 'обʼєкт закрито'"
                  @step="next" @play="play" @reset="reset" />

    <label class="mk__toggle">
      <input v-model="masked" type="checkbox" /> маска увімкнена
    </label>

    <ol class="mk__auto">
      <li v-for="(n, i) in NODES" :key="n" :class="'is-' + nodeState(i)">
        <span class="mk__node">{{ n }}</span>
        <span v-if="i < EDGES.length" class="mk__edge">→ <code>{{ EDGES[i] }}</code></span>
      </li>
    </ol>

    <div class="mk__out" :class="{ 'is-bad': broken }">
      <span class="mk__lbl">згенеровано:</span>
      <code><span v-for="(t, k) in tokens" :key="k" :class="{ 'mk__bad': t.bad }">{{ t.t }}</span><span class="mk__cursor">▍</span></code>
      <span v-if="broken" class="mk__why">«{{ show(broken.tok) }}» поза граматикою — JSON уже не вийде</span>
    </div>

    <div v-if="cur && !broken" class="mk__grid">
      <div>
        <div class="mk__colhead">до маски · softmax по всіх восьми</div>
        <div v-for="r in rows" :key="'b' + r.tok" class="lab__row">
          <code class="mk__tok">{{ show(r.tok) }}</code>
          <span class="mk__z">{{ r.z.toFixed(1) }}</span>
          <div class="lab__bar"><i class="mk__before" :style="{ width: r.before * 100 + '%' }" /></div>
          <span class="lab__num">{{ r.before.toFixed(2) }}</span>
        </div>
      </div>
      <div>
        <div class="mk__colhead">після маски · лише дозволені</div>
        <div v-for="r in rows" :key="'a' + r.tok" class="lab__row" :class="{ 'is-off': !r.ok }">
          <code class="mk__tok">{{ show(r.tok) }}</code>
          <span class="mk__z">{{ r.ok ? r.z.toFixed(1) : '−∞' }}</span>
          <div class="lab__bar"><i :style="{ width: r.after * 100 + '%' }" /></div>
          <span class="lab__num">{{ r.after.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    <div v-else-if="!cur" class="mk__done">Автомат у кінцевому стані S5: обʼєкт закрито, відповідь валідна за схемою.</div>

    <p class="lab__note">
      Що тут видно: у S3 модель найбільше хоче <code>"yes"</code> (0.54), але граматика
      дозволяє лише <code>true</code> і <code>false</code>, і softmax по двох дає 0.67 і 0.33.
      Маска не підказує правильну відповідь, вона лише прибирає неможливі. Вимкніть її —
      і вже на S0 модель почне з «Звісно».
    </p>
  </div>
</template>

<style scoped>
.mk__toggle { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; color: var(--vp-c-text-2); margin-bottom: 0.7rem; cursor: pointer; }
.mk__toggle input { accent-color: var(--uk-accent); }
.mk__auto {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.35rem;
  list-style: none;
  padding: 0;
  margin: 0 0 0.7rem;
}
.mk__auto li { margin: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.mk__node {
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.3rem 0.4rem;
  border-radius: 7px;
  border: 1.5px solid var(--uk-line);
  color: var(--vp-c-text-3);
  text-align: center;
  transition: all 0.3s ease;
}
.mk__edge { font-size: 0.68rem; color: var(--vp-c-text-3); text-align: center; }
.mk__edge code { font-size: 0.66rem; }
.is-pass .mk__node { border-color: var(--uk-green); color: var(--uk-green); }
.is-now .mk__node { border-color: var(--uk-accent); background: var(--uk-accent); color: #fff; }
.is-fail .mk__node { border-color: var(--uk-warm); background: var(--uk-warm); color: #fff; }
.is-off { opacity: 0.4; }
.mk__out {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem;
  padding: 0.55rem 0.8rem; background: var(--uk-fill); border: 1px solid var(--uk-line);
  border-radius: 8px; margin-bottom: 0.8rem;
}
.mk__out.is-bad { border-color: var(--uk-warm); }
.mk__out code { font-family: var(--vp-font-family-mono); font-size: 0.85rem; word-break: break-all; }
.mk__lbl { font-size: 0.75rem; color: var(--vp-c-text-3); }
.mk__cursor { color: var(--uk-accent); }
.mk__bad { color: var(--uk-warm); font-weight: 600; }
.mk__why { font-size: 0.78rem; color: var(--uk-warm); }
.mk__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
.mk__colhead { font-size: 0.75rem; color: var(--vp-c-text-3); margin-bottom: 0.3rem; }
.mk__grid .lab__row { transition: opacity 0.25s ease; }
.mk__grid .lab__row.is-off { opacity: 0.35; }
.mk__tok { width: 5.6rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mk__z { width: 2.2rem; flex: none; text-align: right; font-family: var(--vp-font-family-mono); font-size: 0.72rem; color: var(--vp-c-text-3); }
.lab__bar i.mk__before { background: var(--vp-c-text-3); opacity: 0.55; }
.mk__done { font-size: 0.85rem; color: var(--uk-green); padding: 0.4rem 0; }
@media (max-width: 720px) {
  .mk__auto { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .mk__tok { width: 4.6rem; }
}
</style>
