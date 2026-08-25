<script setup lang="ts">
/**
 * Шість складових промпта: вимикайте частини й дивіться, що лишається моделі
 * і що саме зламається без цієї частини.
 */
import { ref, computed } from 'vue'

const PARTS = [
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
    text: 'Приклад:\nПитання: «Коли перескладання?»\nВідповідь: {"answer": "з 3 по 14 лютого", "source": "наказ 1-476", "abstained": false}',
  },
  {
    id: 'data',
    name: 'Дані',
    sets: 'матеріал для відповіді',
    without: 'відповідь із ваг',
    text: '<documents>\n[наказ 1-476] Перескладання іспитів проводиться з 3 по 14 лютого 2027 року.\n</documents>',
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

const on = ref<Record<string, boolean>>(
  Object.fromEntries(PARTS.map((p) => [p.id, true]))
)

const kept = computed(() => PARTS.filter((p) => on.value[p.id]))
const dropped = computed(() => PARTS.filter((p) => !on.value[p.id]))

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
      Критерій зупинки задається таким самим текстом, як і решта: у RAG-шаблонах це прямий
      дозвіл відмовитися. Приберіть його — і модель, не знайшовши підстав, усе одно
      щось відповість, бо нічого не дозволяло їй промовчати.
    </p>
  </div>
</template>

<style scoped>
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
