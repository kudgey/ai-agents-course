<script setup lang="ts">
/**
 * Шість складових промпта: вимикайте частини й дивіться, що лишається моделі
 * і що саме зламається без цієї частини.
 */
import { ref, computed, watch } from 'vue'

const STUDY = [
  {
    id: 'role',
    name: 'Роль і системна частина',
    sets: 'межі й контекст задачі',
    without: 'стиль добирає модель',
    text: 'Ти асистент навчального відділу факультету. Відповідаєш лише за наданими документами\nфакультету і не вигадуєш фактів.',
  },
  {
    id: 'instr',
    name: 'Інструкція',
    sets: 'що саме зробити',
    without: 'відповідь не на те',
    text: 'Дай відповідь на питання студента і назви документ, з якого вона випливає.',
  },
  {
    id: 'examples',
    name: 'Приклади',
    sets: 'шаблон входу й виходу',
    without: 'розкид форми',
    text: 'Приклад:\nПитання: «Коли перескладання?»\nВідповідь: {"answer": "з 3 по 7 лютого", "source": "наказ 142", "abstained": false}',
  },
  {
    id: 'data',
    name: 'Дані',
    sets: 'матеріал для відповіді',
    without: 'відповідь із ваг',
    text: '<documents>\n[наказ 142] Перескладання іспитів проводиться з 3 по 7 лютого 2026 року.\n</documents>',
  },
  {
    id: 'format',
    name: 'Формат виводу',
    sets: 'контракт для коду',
    without: 'парсер падає',
    text: 'Поверни рівно один JSON-обʼєкт із полями answer, source, abstained. Без пояснень поза JSON.',
  },
  {
    id: 'stop',
    name: 'Критерій зупинки',
    sets: 'коли відповідь готова',
    without: 'текст без кінця',
    text: 'Якщо наданих документів недостатньо, поверни abstained: true і порожній answer.',
  },
]

// той самий розклад на шість частин, але на бізнес-задачі: підтримка
// інтернет-магазину вирішує, чи підлягає замовлення поверненню
const SHOP = [
  {
    id: 'role',
    name: 'Роль і системна частина',
    sets: 'межі й контекст задачі',
    without: 'стиль добирає модель',
    text: 'Ти асистент підтримки інтернет-магазину. Рішення про повернення ухвалюєш лише за наданою\nполітикою й даними замовлення. Власних винятків не вигадуєш і знижок не обіцяєш.',
  },
  {
    id: 'instr',
    name: 'Інструкція',
    sets: 'що саме зробити',
    without: 'відповідь не на те',
    text: 'Визнач, чи підлягає замовлення поверненню, і назви пункт політики, на якому ґрунтується рішення.',
  },
  {
    id: 'examples',
    name: 'Приклади',
    sets: 'шаблон входу й виходу',
    without: 'розкид форми',
    text: 'Приклад:\nЗамовлення: навушники, 12 днів тому, упаковку відкрито\nВідповідь: {"eligible": true, "clause": "3.1", "refund": 2400, "escalate": false}',
  },
  {
    id: 'data',
    name: 'Дані',
    sets: 'матеріал для відповіді',
    without: 'відповідь із ваг',
    text: '<policy>\n3.1 Повернення приймається протягом 14 днів з моменту доставки.\n3.4 Товари з розділу «Гігієна» поверненню не підлягають.\n</policy>\n<order>\nелектрична зубна щітка, розділ «Гігієна», доставлено 9 днів тому, 1890 грн\n</order>',
  },
  {
    id: 'format',
    name: 'Формат виводу',
    sets: 'контракт для коду',
    without: 'парсер падає',
    text: 'Поверни рівно один JSON-обʼєкт із полями eligible, clause, refund, escalate. Без тексту поза JSON.',
  },
  {
    id: 'stop',
    name: 'Критерій зупинки',
    sets: 'коли відповідь готова',
    without: 'текст без кінця',
    text: 'Якщо політика не покриває випадок, поверни escalate: true і не вигадуй рішення.',
  },
]

const CASES = [
  { id: 'study', label: 'Навчальний відділ', parts: STUDY },
  { id: 'shop', label: 'Підтримка магазину', parts: SHOP },
]
const caseId = ref('study')
const PARTS = computed(() => CASES.find((c) => c.id === caseId.value)!.parts)

const on = ref<Record<string, boolean>>(
  Object.fromEntries(STUDY.map((p) => [p.id, true]))
)
// перемикання сценарію не має лишати частини вимкненими від попереднього
watch(caseId, () => {
  for (const p of PARTS.value) on.value[p.id] = true
})

const kept = computed(() => PARTS.value.filter((p) => on.value[p.id]))
const dropped = computed(() => PARTS.value.filter((p) => !on.value[p.id]))

const prompt = computed(() => kept.value.map((p) => p.text).join('\n\n'))

const risk = computed(() => {
  const n = dropped.value.length
  if (n === 0) return { t: 'Промпт повний: у коді є за що зачепитися', c: 'green' }
  if (n <= 2) return { t: 'Частина контракту тримається на удачі', c: 'warm' }
  return { t: 'Це вже не промпт, а побажання', c: 'warm' }
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Промпт по частинах</div>
        <div class="lab__sub">
          Вимикайте складові й дивіться, що лишається моделі на вході — і що саме
          зламається без кожної з них.
        </div>
      </div>
      <button class="lab__btn" @click="PARTS.forEach((p) => (on[p.id] = true))">Повернути все</button>
    </div>

    <div class="pa__cases">
      <button
        v-for="c in CASES"
        :key="c.id"
        type="button"
        class="pa__case"
        :class="{ 'is-on': caseId === c.id }"
        @click="caseId = c.id"
      >
        {{ c.label }}
      </button>
    </div>

    <div class="pa__grid">
      <div class="pa__list">
        <label v-for="p in PARTS" :key="p.id" class="pa__part" :class="{ 'is-off': !on[p.id] }">
          <input type="checkbox" v-model="on[p.id]" />
          <span class="pa__body">
            <b>{{ p.name }}</b>
            <em>{{ p.sets }}</em>
            <i v-if="!on[p.id]">без неї: {{ p.without }}</i>
          </span>
        </label>
      </div>

      <div class="pa__preview">
        <div class="pa__cap">Що фактично отримає модель</div>
        <pre class="pa__code"><code>{{ prompt || '(порожньо)' }}</code></pre>
        <div class="pa__risk" :class="'is-' + risk.c">{{ risk.t }}</div>
      </div>
    </div>

    <p class="lab__note">
      Переконайтеся, що розклад не залежить від теми: навчальний відділ і підтримка
      магазину — різні задачі, а частини однакові. У другому сценарії дані навмисно
      суперечливі: замовлення вкладається в чотирнадцять днів за пунктом 3.1, але
      належить до розділу «Гігієна» за пунктом 3.4. Приберіть критерій зупинки — і
      модель, не маючи дозволу передати випадок людині, усе одно ухвалить рішення сама.
    </p>
  </div>
</template>

<style scoped>
.pa__cases { display: flex; gap: 0.4rem; margin-bottom: 0.9rem; }
.pa__case {
  padding: 0.32rem 0.8rem;
  border: 1px solid var(--uk-line);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  cursor: pointer;
}
.pa__case.is-on { border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.pa__grid { display: grid; grid-template-columns: minmax(230px, 0.85fr) minmax(280px, 1.15fr); gap: 1.2rem; }
.pa__list { display: flex; flex-direction: column; gap: 0.3rem; }
.pa__part {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pa__part:hover { border-color: var(--uk-accent); }
.pa__part.is-off { opacity: 0.62; background: var(--uk-fill); }
.pa__part input { margin-top: 0.28rem; accent-color: var(--uk-accent); }
.pa__body { display: flex; flex-direction: column; line-height: 1.35; }
.pa__body b { font-size: 0.85rem; font-weight: 600; }
.pa__body em { font-style: normal; font-size: 0.74rem; color: var(--vp-c-text-3); }
.pa__body i { font-style: normal; font-size: 0.74rem; color: var(--uk-warm); margin-top: 0.15rem; }
.pa__cap { font-size: 0.78rem; color: var(--vp-c-text-3); margin-bottom: 0.4rem; }
.pa__code {
  margin: 0;
  padding: 0.75rem 0.85rem;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 21rem;
  overflow: auto;
  color: var(--vp-c-text-1);
}
.pa__risk {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  padding: 0.42rem 0.7rem;
  border-radius: 7px;
}
.pa__risk.is-green { background: var(--uk-green-soft); color: var(--uk-green); }
.pa__risk.is-warm { background: var(--uk-warm-soft); color: var(--uk-warm); }
@media (max-width: 760px) {
  .pa__grid { grid-template-columns: 1fr; }
}
</style>
