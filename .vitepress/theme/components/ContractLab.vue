<script setup lang="ts">
/**
 * «Шлях відповіді»: шість сирих відповідей лекції 05 і 529 проходять конвеєр
 * запит → HTTP-статус → stop_reason → JSON-парсер → типи → правило → об'єкт.
 * Стадію, на якій відповідь зупиняють, і тексти помилок Pydantic рахує генератор
 * (lec05.json); віджет лише проводить відповідь по стадіях.
 */
import { ref, computed, watch } from 'vue'
import data from '../../data/lec05.json'
import { useStepper } from '../composables/useStepper'
import StepControls from './StepControls.vue'

type Kind = 'transport' | 'schema' | 'domain' | 'refusal' | 'ok'
type Case = {
  id: string; label: string; stop_reason?: string; status?: number; raw: string | null
  kind: Kind; retry: string; err_type: string | null; err_msg: string | null
  err_loc: string | null; stage: number
}

const CASES = data.cases as Case[]
const STAGES = data.stages as string[]
const LAST = STAGES.length - 1

const WHAT = [
  'Сервіс надсилає питання й документи моделі.',
  'Чи дійшов виклик: 2xx — так; 429, 500, 504, 529 — транспортна помилка.',
  'Чим закінчилась генерація: end_turn — нормально; refusal і max_tokens — форма не гарантована.',
  'Чи є це взагалі JSON: обрив і відмова падають тут як json_invalid.',
  'Чи збігаються поля й типи зі схемою: зайве поле, рядок замість числа.',
  'Правило, якого схема не виразить: без відмови має бути хоча б одна цитата.',
  'Перевірений обʼєкт Answer, який код може читати.',
]

const pick = ref(0)
const cur = computed(() => CASES[pick.value])
const stop = computed(() => cur.value.stage)          // стадія, де відповідь зупинили
const failed = computed(() => cur.value.stage < LAST)

const { step, playing, reduced, next, play, reset, jump, done } =
  useStepper(() => stop.value, { interval: 700 })
watch(pick, () => jump(stop.value))                    // новий випадок — одразу підсумок

const focus = ref<number | null>(null)
const shown = computed(() => focus.value ?? step.value)

function state(i: number) {
  if (i < step.value) return 'pass'
  if (i === step.value) return failed.value && i === stop.value ? 'fail' : 'now'
  return i > stop.value ? 'off' : 'todo'
}

const errLine = computed(() => {
  const c = cur.value
  if (c.status) return `HTTP ${c.status} · ${c.err_type}`
  if (c.stage === 2) return `stop_reason = "${c.stop_reason}"`
  return c.err_type ? `${c.err_type}: ${c.err_msg}` : null
})
const hidden = computed(() =>
  cur.value.stage === 2 && cur.value.err_type ? `${cur.value.err_type}: ${cur.value.err_msg}` : null)

const LABELS: Record<Kind, string> = {
  transport: 'Транспорт', schema: 'Схема', domain: 'Доменна', refusal: 'Відмова моделі', ok: 'Без помилки',
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Шлях відповіді: де її зупиняють</div>
        <div class="lab__sub">
          Оберіть, що повернув сервіс, і проведіть відповідь конвеєром. Клік по стадії
          показує, що саме вона перевіряє.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="(c, i) in CASES" :key="c.id"
        class="lab__pill" :class="{ 'is-on': pick === i }" @click="pick = i; focus = null"
      >{{ c.label }}</button>
    </div>

    <StepControls :playing="playing" :reduced="reduced" :done="done"
                  :label="`стадія ${step + 1} з ${stop + 1}`"
                  @step="next(); focus = null" @play="play(); focus = null" @reset="reset(); focus = null" />

    <ol class="pp__rail" :style="{ '--n': STAGES.length }">
      <li v-for="(s, i) in STAGES" :key="s" :class="['is-' + state(i), { 'is-focus': focus === i }]"
          @click="focus = focus === i ? null : i">
        <span class="pp__dot">{{ state(i) === 'pass' ? '✓' : state(i) === 'fail' ? '✕' : i + 1 }}</span>
        <span class="pp__name">{{ s }}</span>
      </li>
    </ol>

    <div class="pp__detail">
      <div class="pp__what"><b>{{ STAGES[shown] }}.</b> {{ WHAT[shown] }}</div>
      <div v-if="shown > stop" class="pp__muted">До цієї стадії відповідь не дійшла.</div>
    </div>

    <pre class="pp__raw"><code><span class="pp__meta">{{ cur.status ? `HTTP ${cur.status} · тіла з відповіддю моделі немає` : `stop_reason: "${cur.stop_reason}"` }}</span>
<template v-if="cur.raw">{{ cur.raw }}</template></code></pre>

    <div class="pp__result" :class="'is-' + (step < stop ? 'wait' : cur.kind)">
      <template v-if="step < stop">
        <div class="pp__badge">у дорозі</div>
        <p>Відповідь пройшла {{ step }} з {{ stop }} {{ failed ? 'стадій до тієї, де її зупинять' : 'перевірок' }}.</p>
      </template>
      <template v-else>
        <div class="pp__badge">{{ LABELS[cur.kind] }}</div>
        <div class="pp__body">
          <code v-if="errLine" class="pp__err">{{ errLine }}</code>
          <p v-else>Усі стадії пройдено: код отримує перевірений обʼєкт.</p>
          <div v-if="hidden" class="pp__hidden">
            Якби <code>stop_reason</code> не перевіряли, парсер сказав би лише
            <code>{{ hidden }}</code> — без натяку на справжню причину.
          </div>
          <div class="pp__retry" :class="{ 'is-yes': cur.retry.startsWith('так') }">Повтор: {{ cur.retry }}</div>
        </div>
      </template>
    </div>

    <p class="lab__note">
      Що тут видно: кожну помилку ловить своя стадія, і від стадії залежить, чи має сенс
      повтор. Обрив і відмову ловить <code>stop_reason</code> ще до парсера, а порожні
      цитати проходять усі перевірки типів і зупиняються лише на правилі контракту.
    </p>
  </div>
</template>

<style scoped>
.pp__rail {
  --n: 7;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: 0;
  list-style: none;
  padding: 0;
  margin: 0 0 0.7rem;
  position: relative;
}
.pp__rail li {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  position: relative;
  text-align: center;
}
.pp__rail li::before {                      /* лінія між стадіями */
  content: '';
  position: absolute;
  top: 0.8rem;
  left: -50%;
  width: 100%;
  height: 2px;
  background: var(--uk-line);
  z-index: 0;
}
.pp__rail li:first-child::before { display: none; }
.pp__rail li.is-pass::before, .pp__rail li.is-now::before, .pp__rail li.is-fail::before { background: var(--uk-green); }
.pp__dot {
  position: relative;
  z-index: 1;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.74rem;
  font-weight: 600;
  background: var(--vp-c-bg);
  border: 2px solid var(--uk-line);
  color: var(--vp-c-text-3);
  transition: all 0.3s ease;
}
.pp__name { font-size: 0.72rem; line-height: 1.25; color: var(--vp-c-text-3); padding: 0 0.15rem; }
.is-pass .pp__dot { border-color: var(--uk-green); color: var(--uk-green); }
.is-now .pp__dot { border-color: var(--uk-accent); background: var(--uk-accent); color: #fff; box-shadow: 0 0 0 4px var(--uk-accent-soft); }
.is-fail .pp__dot { border-color: var(--uk-warm); background: var(--uk-warm); color: #fff; box-shadow: 0 0 0 4px var(--uk-warm-soft); }
.is-now .pp__name, .is-fail .pp__name { color: var(--vp-c-text-1); font-weight: 600; }
.is-off { opacity: 0.4; }
.is-off .pp__dot { border-style: dashed; }
.is-focus .pp__name { text-decoration: underline; }

.pp__detail { font-size: 0.82rem; line-height: 1.5; color: var(--vp-c-text-2); margin-bottom: 0.7rem; min-height: 2.6em; }
.pp__muted { color: var(--vp-c-text-3); font-size: 0.78rem; }
.pp__raw {
  margin: 0 0 0.8rem;
  padding: 0.65rem 0.8rem;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--vp-c-text-1);
}
.pp__meta { color: var(--vp-c-text-3); }
.pp__result { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.8rem 0.9rem; border-radius: 9px; background: var(--uk-fill); }
.pp__result.is-ok { background: var(--uk-green-soft); }
.pp__result.is-transport, .pp__result.is-schema { background: var(--uk-accent-soft); }
.pp__result.is-domain, .pp__result.is-refusal { background: var(--uk-warm-soft); }
.pp__result p { margin: 0; font-size: 0.85rem; line-height: 1.5; }
.pp__badge {
  flex: none; font-size: 0.76rem; font-weight: 600; padding: 0.28rem 0.6rem;
  border-radius: 999px; background: var(--vp-c-bg); white-space: nowrap;
}
.is-ok .pp__badge { color: var(--uk-green); }
.is-transport .pp__badge, .is-schema .pp__badge { color: var(--uk-accent); }
.is-domain .pp__badge, .is-refusal .pp__badge { color: var(--uk-warm); }
.pp__body { min-width: 0; }
.pp__err { display: block; font-family: var(--vp-font-family-mono); font-size: 0.75rem; margin-bottom: 0.45rem; word-break: break-word; }
.pp__hidden { font-size: 0.8rem; line-height: 1.5; color: var(--vp-c-text-2); margin-bottom: 0.45rem; }
.pp__hidden code { font-size: 0.74rem; word-break: break-word; }
.pp__retry { font-size: 0.8rem; color: var(--uk-warm); font-weight: 500; }
.pp__retry.is-yes { color: var(--uk-green); }

@media (max-width: 720px) {
  .pp__rail { grid-template-columns: 1fr; gap: 0.35rem; }
  .pp__rail li { flex-direction: row; text-align: left; gap: 0.6rem; }
  .pp__rail li::before { top: -0.5rem; left: 0.78rem; width: 2px; height: 0.7rem; }
  .pp__name { font-size: 0.8rem; }
  .pp__result { flex-direction: column; gap: 0.5rem; }
}
</style>
