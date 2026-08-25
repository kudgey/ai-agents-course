<script setup lang="ts">
/**
 * Шість полів оголошення інструмента. Вимикайте будь-яке —
 * і бачите, що саме зникає з того, що читає модель, і чим це обертається.
 */
import { ref, computed } from 'vue'

const FIELDS = [
  { id: 'name', name: 'Ім’я', without: 'модель не має чим викликати інструмент' },
  { id: 'desc', name: 'Опис для моделі', without: 'вибір між схожими інструментами стає випадковим' },
  { id: 'params', name: 'Схема аргументів', without: 'аргументи приходять у довільній формі' },
  { id: 'required', name: 'Обов’язкові поля', without: 'модель мовчки пропускає потрібний аргумент' },
  { id: 'enum', name: 'Перелічувані значення', without: 'у поле статусу приходить будь-який рядок' },
  { id: 'result', name: 'Схема результату', without: 'код не знає, що саме розбирати у відповіді' },
]

const on = ref<Record<string, boolean>>(Object.fromEntries(FIELDS.map((f) => [f.id, true])))

const spec = computed(() => {
  const s: any = {}
  if (on.value.name) s.name = 'find_order'
  if (on.value.desc)
    s.description =
      'Знаходить наказ факультету за номером або темою. Повертає номер, дату й текст. ' +
      'Використовувати, коли студент питає про офіційний документ, а не про розклад.'
  if (on.value.params) {
    const props: any = {
      query: { type: 'string', description: 'номер наказу або тема запиту' },
    }
    if (on.value.enum)
      props.scope = { type: 'string', enum: ['orders', 'schedule', 'all'], description: 'де шукати' }
    else props.scope = { type: 'string', description: 'де шукати' }
    s.input_schema = {
      type: 'object',
      properties: props,
      ...(on.value.required ? { required: ['query'] } : {}),
      additionalProperties: false,
    }
  }
  if (on.value.result)
    s.output_schema = {
      type: 'object',
      properties: {
        number: { type: 'string' },
        date: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['number', 'date', 'text'],
    }
  return s
})

const off = computed(() => FIELDS.filter((f) => !on.value[f.id]))
const json = computed(() => JSON.stringify(spec.value, null, 2))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Оголошення інструмента по полях</div>
        <div class="lab__sub">
          Праворуч — рівно те, що побачить модель. Вимикайте поля й дивіться, чого їй
          почне бракувати.
        </div>
      </div>
      <button class="lab__btn" @click="FIELDS.forEach((f) => (on[f.id] = true))">Повернути все</button>
    </div>

    <div class="ts__grid">
      <div class="ts__list">
        <label v-for="f in FIELDS" :key="f.id" class="ts__field" :class="{ 'is-off': !on[f.id] }">
          <input type="checkbox" v-model="on[f.id]" />
          <span>
            <b>{{ f.name }}</b>
            <i v-if="!on[f.id]">без нього: {{ f.without }}</i>
          </span>
        </label>
      </div>

      <div class="ts__preview">
        <div class="ts__cap">Що бачить модель</div>
        <pre class="ts__code"><code>{{ json }}</code></pre>
      </div>
    </div>

    <div v-if="off.length" class="ts__warn">
      Пропущено полів: {{ off.length }}. Найдорожче з них зазвичай — опис: модель обирає
      інструмент саме за ним, а не за іменем функції.
    </div>

    <p class="lab__note">
      Опис пишеться для читача-моделі, а не для колеги. У ньому має бути сказано не лише
      що інструмент робить, а й <b>коли його брати, а коли ні</b> — інакше два схожі
      інструменти конкурують, і вибір між ними стає нестабільним від запуску до запуску.
    </p>
  </div>
</template>

<style scoped>
.ts__grid { display: grid; grid-template-columns: minmax(200px, 0.8fr) minmax(280px, 1.2fr); gap: 1.2rem; }
.ts__list { display: flex; flex-direction: column; gap: 0.3rem; }
.ts__field {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ts__field:hover { border-color: var(--uk-accent); }
.ts__field.is-off { opacity: 0.62; background: var(--uk-fill); }
.ts__field input { margin-top: 0.22rem; accent-color: var(--uk-accent); }
.ts__field span { display: flex; flex-direction: column; line-height: 1.35; }
.ts__field b { font-size: 0.85rem; font-weight: 600; }
.ts__field i { font-style: normal; font-size: 0.73rem; color: var(--uk-warm); margin-top: 0.12rem; }
.ts__cap { font-size: 0.78rem; color: var(--vp-c-text-3); margin-bottom: 0.4rem; }
.ts__code {
  margin: 0;
  padding: 0.75rem 0.85rem;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.73rem;
  line-height: 1.6;
  max-height: 22rem;
  overflow: auto;
  color: var(--vp-c-text-1);
}
.ts__warn {
  margin-top: 0.8rem;
  font-size: 0.83rem;
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  border-radius: 7px;
  background: var(--uk-warm-soft);
  color: var(--uk-warm);
}
@media (max-width: 760px) {
  .ts__grid { grid-template-columns: 1fr; }
}
</style>
