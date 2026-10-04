<script setup lang="ts">
/**
 * Експеримент «Lost in the Middle» зсередини: двадцять документів у промпті,
 * рівно один містить відповідь. Пересуваючи його, видно, що міняється не
 * запит і не документ, а лише позиція — і точність падає на двадцять пунктів.
 *
 * Числа — таблиця додатка «20 Total Retrieved Documents» зі статті
 * Liu та ін., TACL 2024 (позиції 1, 5, 10, 15, 20).
 */
import { computed, ref } from 'vue'

const MEASURED = [1, 5, 10, 15, 20]
const SERIES: Record<string, number[]> = {
  'GPT-3.5-Turbo': [75.8, 57.2, 53.8, 55.4, 63.2],
  'Claude-1.3': [59.9, 55.9, 56.8, 57.2, 60.1],
  'LongChat-13B (16K)': [68.6, 57.4, 55.3, 52.5, 55.0],
  'MPT-30B-Instruct': [53.7, 51.8, 52.2, 52.7, 56.3],
}
const NO_DOC = 56.1   // GPT-3.5-Turbo без жодного документа
const ONLY_DOC = 88.3 // лише правильний документ

const model = ref('GPT-3.5-Turbo')
const pos = ref(10)

// точність відома лише для пʼяти позицій — показуємо найближчу виміряну
const nearestIdx = computed(() => {
  let best = 0
  MEASURED.forEach((m, i) => {
    if (Math.abs(m - pos.value) < Math.abs(MEASURED[best] - pos.value)) best = i
  })
  return best
})
const acc = computed(() => SERIES[model.value][nearestIdx.value])
const exact = computed(() => MEASURED.includes(pos.value))
const vsNoDoc = computed(() => acc.value - NO_DOC)
const best = computed(() => Math.max(...SERIES[model.value]))
</script>

<template>
  <div class="lab pl">
    <div class="lab__head">
      <div>
        <div class="lab__title">Той самий документ на різних місцях промпта</div>
        <div class="lab__sub">
          Двадцять документів, рівно один містить відповідь. Запит, документи й модель
          незмінні — рухається тільки позиція потрібного.
        </div>
      </div>
    </div>

    <div class="pl__models">
      <button
        v-for="(_, name) in SERIES"
        :key="name"
        type="button"
        class="pl__model"
        :class="{ 'is-on': model === name }"
        @click="model = name"
      >
        {{ name }}
      </button>
    </div>

    <div class="pl__prompt">
      <div class="pl__cap">Скелет промпта</div>
      <div class="pl__line">Питання: <i>хто написав «Лісову пісню»?</i></div>
      <div class="pl__slots">
        <span
          v-for="i in 20"
          :key="i"
          class="pl__slot"
          :class="{ 'is-gold': i === pos }"
          :title="i === pos ? 'документ із відповіддю' : 'дистрактор'"
        >{{ i }}</span>
      </div>
      <div class="pl__line pl__ask">Відповідай лише за наданими документами.</div>
    </div>

    <label class="lab__ctl">
      <span>Позиція документа з відповіддю</span>
      <input v-model.number="pos" type="range" min="1" max="20" step="1" />
      <code>{{ pos }}</code>
    </label>

    <div class="lab__stats">
      <div class="lab__stat" :class="acc < NO_DOC ? 'is-warm' : 'is-green'">
        <b>{{ acc.toFixed(1) }} %</b><span>точність{{ exact ? '' : ' (найближчий вимір)' }}</span>
      </div>
      <div class="lab__stat"><b>{{ NO_DOC }} %</b><span>без жодного документа</span></div>
      <div class="lab__stat"><b>{{ ONLY_DOC }} %</b><span>лише правильний документ</span></div>
      <div class="lab__stat"><b>{{ (best - Math.min(...SERIES[model])).toFixed(1) }}</b>
        <span>розкид по позиціях, в.п.</span></div>
    </div>

    <p class="lab__note">
      <template v-if="model === 'GPT-3.5-Turbo' && vsNoDoc < 0">
        Ось головне цієї лекції в одному числі: з потрібним документом у середині вікна
        модель відповідає <b>гірше</b> ({{ acc.toFixed(1) }} %), ніж узагалі без документів
        ({{ NO_DOC }} %). Документ витратив бюджет і не допоміг.
      </template>
      <template v-else-if="exact">
        Позиція {{ pos }} — одна з пʼяти виміряних у статті. Межі зверху й знизу взяті
        з таблиці 1 тієї самої роботи й стосуються GPT-3.5-Turbo.
      </template>
      <template v-else>
        Точність виміряна для позицій 1, 5, 10, 15 і 20; для проміжних показано
        найближчий вимір, а не інтерпольоване число — вигадувати дані ми не будемо.
      </template>
    </p>
  </div>
</template>

<style scoped>
.pl__models { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.9rem 0 0.8rem; }
.pl__model {
  padding: 0.28rem 0.7rem;
  border: 1px solid var(--uk-line);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.76rem;
  cursor: pointer;
}
.pl__model.is-on { border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }

.pl__prompt {
  border: 1px solid var(--uk-line);
  border-radius: 9px;
  padding: 0.7rem 0.8rem;
  margin-bottom: 0.9rem;
  background: var(--uk-fill);
}
.pl__cap {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
  margin-bottom: 0.45rem;
}
.pl__line { font-size: 0.82rem; color: var(--vp-c-text-2); }
.pl__ask { margin-top: 0.5rem; }
.pl__slots {
  display: grid;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  gap: 0.22rem;
  margin: 0.5rem 0;
}
.pl__slot {
  text-align: center;
  padding: 0.32rem 0;
  border: 1px solid var(--uk-line);
  border-radius: 5px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
}
.pl__slot.is-gold {
  border-color: var(--uk-warm);
  background: var(--uk-warm-soft);
  color: var(--uk-warm);
  font-weight: 700;
}
.lab__ctl { display: grid; grid-template-columns: minmax(0, 16rem) 1fr auto; gap: 0.7rem; align-items: center; }
.lab__ctl code { font-size: 0.78rem; min-width: 2rem; text-align: right; }
@media (max-width: 720px) {
  .pl__slots { grid-template-columns: repeat(10, minmax(0, 1fr)); }
  .lab__ctl { grid-template-columns: 1fr auto; }
  .lab__ctl input { grid-column: 1 / -1; }
}
</style>
