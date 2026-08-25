<script setup lang="ts">
/**
 * Смертельна тріада як булева умова: Risk = A ∧ B ∧ C.
 * Правило Meta «не більше двох із трьох» перевіряється тут одним поглядом.
 */
import { ref, computed } from 'vue'

const A = ref(true)  // доступ до приватних даних
const B = ref(true)  // контакт із недовіреним текстом
const C = ref(true)  // канал назовні

const PROPS = [
  {
    key: 'A', model: A, name: 'Доступ до приватних даних',
    yes: 'агент читає документи факультету, персональні дані студентів, внутрішні накази',
    no: 'агент працює лише з публічними даними — красти нічого',
    off: 'Прибрати приватні дані з контексту сеансу',
  },
  {
    key: 'B', model: B, name: 'Контакт із недовіреним текстом',
    yes: 'у контекст потрапляє документ, лист або сторінка, які писали не ви',
    no: 'усе, що бачить модель, написали ви або перевірена людина',
    off: 'Не подавати в контекст нічого стороннього',
  },
  {
    key: 'C', model: C, name: 'Канал назовні',
    yes: 'агент може надіслати лист, викликати HTTP, записати у спільне сховище',
    no: 'вихід агента бачить лише користувач; діяти в світі він не може',
    off: 'Зняти з агента право діяти назовні',
  },
]

const active = computed(() => [A.value, B.value, C.value].filter(Boolean).length)
const risky = computed(() => A.value && B.value && C.value)

const verdict = computed(() => {
  if (risky.value)
    return {
      t: 'Витік можливий',
      d: 'Усі три властивості разом. Недовірений текст може наказати агентові взяти приватні дані й відправити їх назовні — і жоден системний промпт цього не гарантує.',
      c: 'bad',
    }
  if (active.value === 2)
    return {
      t: 'Правило двох виконано',
      d: 'Дві властивості з трьох — межа, яку Meta формалізувала як Agents Rule of Two. Ланцюжок ін’єкції розірвано архітектурно, а не проханням у промпті.',
      c: 'ok',
    }
  return {
    t: 'Запас є',
    d: 'Менше двох властивостей. Такий агент майже нічого не вміє, зате й вкрасти через нього нічого.',
    c: 'ok',
  }
})

/** Яку саме умову дешевше зняти — практична частина картки. */
const advice = computed(() => {
  if (!risky.value) return null
  return PROPS.map((p) => p.off)
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Смертельна тріада наживо</div>
        <div class="lab__sub">
          Вимикайте властивості сеансу й дивіться, коли ін’єкція перестає бути витоком.
          Умова булева: небезпечна лише повна кон’юнкція.
        </div>
      </div>
      <button class="lab__btn" @click="A = true; B = true; C = true">Повернути все</button>
    </div>

    <div class="tf__grid">
      <label v-for="p in PROPS" :key="p.key" class="tf__prop" :class="{ 'is-off': !p.model.value }">
        <div class="tf__top">
          <span class="tf__letter">{{ p.key }}</span>
          <input type="checkbox" v-model="p.model.value" />
        </div>
        <b>{{ p.name }}</b>
        <span>{{ p.model.value ? p.yes : p.no }}</span>
      </label>
    </div>

    <div class="tf__formula">
      <code>Risk = {{ A ? 'A' : '¬A' }} ∧ {{ B ? 'B' : '¬B' }} ∧ {{ C ? 'C' : '¬C' }}</code>
      <span class="tf__eq">=</span>
      <b :class="risky ? 'is-bad' : 'is-ok'">{{ risky ? 'true' : 'false' }}</b>
      <span class="tf__count">{{ active }} з 3 властивостей увімкнено</span>
    </div>

    <div class="tf__verdict" :class="'is-' + verdict.c">
      <b>{{ verdict.t }}</b>
      <span>{{ verdict.d }}</span>
      <ul v-if="advice">
        <li v-for="a in advice" :key="a">{{ a }}</li>
      </ul>
    </div>

    <p class="lab__note">
      Автор формулювання не обіцяє захисту й прямо каже, що надійного способу зупинити
      ін’єкцію поки немає. Єдина порада, яку він дає, архітектурна: не збирати всі три
      властивості в одному сеансі. Саме тому це вимикачі, а не пункти промпта.
    </p>
  </div>
</template>

<style scoped>
.tf__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; }
.tf__prop {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--uk-warm);
  background: var(--uk-warm-soft);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.tf__prop.is-off { border-color: var(--uk-line); background: var(--uk-fill); }
.tf__top { display: flex; align-items: center; justify-content: space-between; }
.tf__letter {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--uk-warm);
}
.tf__prop.is-off .tf__letter { color: var(--vp-c-text-3); }
.tf__prop input { accent-color: var(--uk-warm); }
.tf__prop.is-off input { accent-color: var(--vp-c-text-3); }
.tf__prop b { font-size: 0.86rem; font-weight: 600; line-height: 1.3; }
.tf__prop span { font-size: 0.76rem; line-height: 1.42; color: var(--vp-c-text-2); }
.tf__formula {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6rem;
  margin-top: 1rem;
  padding: 0.7rem 0.9rem;
  background: var(--uk-fill);
  border-radius: 8px;
}
.tf__formula code { font-family: var(--vp-font-family-mono); font-size: 0.88rem; }
.tf__eq { color: var(--vp-c-text-3); }
.tf__formula b { font-family: var(--vp-font-family-mono); font-size: 1rem; }
.tf__formula b.is-bad { color: var(--uk-warm); }
.tf__formula b.is-ok { color: var(--uk-green); }
.tf__count { margin-left: auto; font-size: 0.78rem; color: var(--vp-c-text-3); }
.tf__verdict { margin-top: 0.7rem; padding: 0.75rem 0.9rem; border-radius: 9px; }
.tf__verdict.is-bad { background: var(--uk-warm-soft); }
.tf__verdict.is-ok { background: var(--uk-green-soft); }
.tf__verdict b { display: block; font-size: 0.92rem; margin-bottom: 0.2rem; }
.tf__verdict.is-bad b { color: var(--uk-warm); }
.tf__verdict.is-ok b { color: var(--uk-green); }
.tf__verdict span { font-size: 0.85rem; line-height: 1.55; color: var(--vp-c-text-2); }
.tf__verdict ul { margin: 0.55rem 0 0; padding-left: 1.1rem; font-size: 0.82rem; line-height: 1.5; color: var(--vp-c-text-2); }
.tf__verdict li { margin: 0.15rem 0; }
</style>
