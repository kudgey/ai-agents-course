<script setup lang="ts">
/**
 * Куди покласти факт: робоче вікно, довготривала пам'ять чи індекс знань.
 * Це те місце, де студенти плутаються щороку, тому питання поставлено прямо.
 */
import { ref, computed } from 'vue'

const STORES = [
  {
    id: 'window',
    name: 'Робоче вікно',
    what: 'поточний діалог і проміжні результати кроку',
    life: 'до кінця сеансу',
  },
  {
    id: 'memory',
    name: 'Довготривала пам’ять',
    what: 'факти про користувача й рішення, які мають пережити сеанс',
    life: 'між сеансами, доки не спростують',
  },
  {
    id: 'index',
    name: 'Індекс знань',
    what: 'документи організації, спільні для всіх користувачів',
    life: 'доки документ чинний',
  },
]

const ITEMS = [
  { t: 'Студент навчається в групі КН-21', a: 'memory',
    why: 'Це стійкий факт про конкретну людину: наступного тижня він знадобиться знову, а в історію діалогу не поміститься.' },
  { t: 'Текст наказу 1-476 про перескладання', a: 'index',
    why: 'Документ організації, однаковий для всіх. Він не належить жодному користувачеві й оновлюється незалежно від сеансів.' },
  { t: 'Користувач щойно попросив скоротити відповідь', a: 'window',
    why: 'Уточнення поточного кроку. Записувати його назавжди означало б скорочувати всі відповіді наступного року.' },
  { t: 'Користувач просить відповідати українською', a: 'memory',
    why: 'Стійке вподобання, яке має діяти й завтра. У вікні воно загубиться разом із діалогом.' },
  { t: 'Проміжний результат пошуку по трьох чанках', a: 'window',
    why: 'Матеріал одного кроку. У пам’яті він швидко застаріє і почне отруювати наступні відповіді.' },
  { t: 'Розклад консультацій на весняний семестр', a: 'index',
    why: 'Спільний документ із власним строком чинності. Місце йому в індексі, звідки його можна вилучити однією операцією.' },
]

const idx = ref(0)
const chosen = ref<string | null>(null)
const score = ref({ ok: 0, total: 0 })

const item = computed(() => ITEMS[idx.value])
const correct = computed(() => chosen.value === item.value.a)

function choose(id: string) {
  if (chosen.value) return
  chosen.value = id
  score.value = { ok: score.value.ok + (id === item.value.a ? 1 : 0), total: score.value.total + 1 }
}
function next() {
  chosen.value = null
  idx.value = (idx.value + 1) % ITEMS.length
}
function reset() {
  chosen.value = null
  idx.value = 0
  score.value = { ok: 0, total: 0 }
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Куди покласти цей факт</div>
        <div class="lab__sub">
          Три сховища мають різний строк життя й різного власника. Помилка тут коштує
          не місця, а правильності наступних відповідей.
        </div>
      </div>
      <button class="lab__btn" @click="reset">Спочатку</button>
    </div>

    <div class="ml__item">
      <span class="ml__label">Що записуємо</span>
      <b>{{ item.t }}</b>
    </div>

    <div class="ml__stores">
      <button
        v-for="s in STORES" :key="s.id"
        class="ml__store"
        :class="{
          'is-picked': chosen === s.id,
          'is-right': chosen && s.id === item.a,
          'is-wrong': chosen === s.id && s.id !== item.a,
          'is-idle': !chosen,
        }"
        @click="choose(s.id)"
      >
        <b>{{ s.name }}</b>
        <span>{{ s.what }}</span>
        <em>живе {{ s.life }}</em>
      </button>
    </div>

    <div v-if="chosen" class="ml__answer" :class="correct ? 'is-ok' : 'is-bad'">
      <b>{{ correct ? 'Правильно' : 'Не сюди' }}</b>
      <p>{{ item.why }}</p>
      <button class="lab__btn" @click="next">Наступний факт →</button>
    </div>

    <div class="ml__score" v-if="score.total">
      Правильних: {{ score.ok }} з {{ score.total }}
    </div>

    <p class="lab__note">
      Питання, яким перевіряють себе: куди записати, що студент навчається в групі КН-21,
      і чому не в історію діалогу. Отруєння пам’яті працює саме тут — хибний запис
      у другому сховищі переживає сеанс і псує все, що буде далі.
    </p>
  </div>
</template>

<style scoped>
.ml__item {
  padding: 0.75rem 0.9rem;
  background: var(--uk-fill);
  border-radius: 9px;
  margin-bottom: 0.8rem;
}
.ml__label { display: block; font-size: 0.72rem; color: var(--vp-c-text-3); margin-bottom: 0.2rem; }
.ml__item b { font-size: 1rem; font-weight: 600; letter-spacing: -0.01em; }
.ml__stores { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; }
.ml__store {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--uk-line);
  border-radius: 9px;
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: all 0.16s ease;
}
.ml__store.is-idle:hover { border-color: var(--uk-accent); transform: translateY(-1px); }
.ml__store.is-right { border-color: var(--uk-green); background: var(--uk-green-soft); }
.ml__store.is-wrong { border-color: var(--uk-warm); background: var(--uk-warm-soft); }
.ml__store b { font-size: 0.86rem; font-weight: 600; }
.ml__store span { font-size: 0.75rem; line-height: 1.4; color: var(--vp-c-text-2); }
.ml__store em {
  font-style: normal;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.ml__answer { margin-top: 0.8rem; padding: 0.75rem 0.9rem; border-radius: 9px; }
.ml__answer.is-ok { background: var(--uk-green-soft); }
.ml__answer.is-bad { background: var(--uk-warm-soft); }
.ml__answer b { font-size: 0.9rem; }
.ml__answer.is-ok b { color: var(--uk-green); }
.ml__answer.is-bad b { color: var(--uk-warm); }
.ml__answer p { margin: 0.3rem 0 0.6rem; font-size: 0.85rem; line-height: 1.55; color: var(--vp-c-text-2); }
.ml__score { margin-top: 0.6rem; font-size: 0.8rem; color: var(--vp-c-text-3); }
</style>
