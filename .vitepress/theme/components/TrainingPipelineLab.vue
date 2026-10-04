<script setup lang="ts">
/**
 * Повний цикл навчання моделі: пʼять етапів, кожен розкривається.
 * Приклади даних — ті самі, що в розділах лекції (Dolly, HH-RLHF), числа —
 * з наскрізного прикладу й зі статті InstructGPT, щоб сторінка не розходилась
 * сама з собою.
 */
import { ref } from 'vue'

type Stage = {
  id: string
  name: string
  short: string
  who: string
  data: { label: string; text: string }[]
  goal: string
  goalNote: string
  changes: string
  numbers: { k: string; v: string }[]
}

const stages: Stage[] = [
  {
    id: 'pre',
    name: '1 · Передтренування',
    short: 'звідки беруться знання',
    who: 'постачальник моделі',
    data: [{
      label: 'фрагмент корпусу',
      text: '…контекстне вікно є бюджетом, а не сховищем: кожен новий токен його витрачає…',
    }],
    goal: 'L = −(1/T) Σ log p(наступний токен)',
    goalNote: 'крос-ентропія наступного токена, нати на токен',
    changes: 'усі ваги, з випадкової ініціалізації',
    numbers: [
      { k: 'наша крихітна модель', v: '1.4 млн параметрів, 1500 кроків, PPL 251 → 6.0' },
      { k: 'GPT-3', v: '175 млрд параметрів, 300 млрд токенів' },
      { k: 'Llama 3 8B', v: '8 млрд параметрів, 15 трлн токенів' },
    ],
  },
  {
    id: 'sft',
    name: '2 · Інструктивне донавчання',
    short: 'модель починає відповідати',
    who: 'постачальник моделі',
    data: [{
      label: 'запис Dolly 15k',
      text: 'instruction: When did Virgin Australia start operating?\ncontext: Virgin Australia… is an Australian-based airline…\nresponse: Virgin Australia commenced services on 31 August 2000…',
    }],
    goal: 'та сама крос-ентропія, але лише на токенах відповіді',
    goalNote: 'маска: усе до «Відповідь:» із градієнта виключено',
    changes: 'усі ваги моделі',
    numbers: [
      { k: 'наш приклад', v: '60 пар, під градієнтом 2 712 токенів із 6 405' },
      { k: 'InstructGPT', v: '≈ 13 тис. промптів' },
      { k: 'Dolly 15k', v: '15 тис. записів, написаних людьми' },
    ],
  },
  {
    id: 'rm',
    name: '3 · Модель винагороди',
    short: 'людські порівняння стають числом',
    who: 'постачальник моделі',
    data: [{
      label: 'пара з HH-RLHF',
      text: 'запит: Can you provide me the home address for actor Ryan Reynolds?\nкраща: He doesn\'t have a publicly available phone number or email address.\nгірша: If you want to contact Ryan Reynolds by phone or email, then I can help you with that.',
    }],
    goal: 'L = −log σ(r(x, y_w) − r(x, y_l))',
    goalNote: 'штраф за різницю, а не за абсолютні значення',
    changes: 'ваги окремої моделі: той самий декодер із лінійним шаром на один вихід',
    numbers: [
      { k: 'приклад із лекції', v: 'r_w = 1.2, r_l = −0.4 → σ = 0.832, втрата 0.184' },
      { k: 'InstructGPT', v: '≈ 33 тис. промптів для моделі винагороди' },
    ],
  },
  {
    id: 'align',
    name: '4 · Вирівнювання',
    short: 'поведінка, відмови, стиль',
    who: 'постачальник моделі',
    data: [{
      label: 'та сама пара вподобань',
      text: 'PPO: політика генерує відповіді → reward-модель оцінює → крок, обмежений околом\nDPO: та сама пара йде прямо у втрату, моделі винагороди немає',
    }],
    goal: 'max E[r(x, o)] − β·D_KL(π ‖ π_ref)',
    goalNote: 'винагорода мінус штраф за відхід від початкової моделі',
    changes: 'ваги політики; референсна модель заморожена',
    numbers: [
      { k: 'наш приклад DPO', v: 'розрив 0.200 → 0.323 ната на токен, β = 0.1' },
      { k: 'InstructGPT', v: '≈ 31 тис. промптів для RLHF' },
      { k: 'типове β', v: '0.1 … 0.01' },
    ],
  },
  {
    id: 'inf',
    name: '5 · Inference',
    short: 'звідки береться випадковість',
    who: 'ви, на кожному запиті',
    data: [{
      label: 'запит користувача',
      text: 'Питання: Коли перескладання з бази даних?\n→ розподіл над словником → відсікання → вибір токена',
    }],
    goal: 'p(y) = softmax(логіти / τ), далі top-k або top-p',
    goalNote: 'жодна вага не змінюється',
    changes: 'нічого: модель та сама від запиту до запиту',
    numbers: [
      { k: 'що налаштовує інженер', v: 'температура, top-p, top-k, штраф на повтори' },
      { k: 'ціна', v: 'оплата за кожен запит' },
    ],
  },
]

const open = ref<string | null>('pre')
const toggle = (id: string) => (open.value = open.value === id ? null : id)
</script>

<template>
  <div class="lab tp">
    <div class="lab__head">
      <div>
        <div class="lab__title">Повний цикл навчання: що на кожному етапі</div>
        <div class="lab__sub">
          Розкрийте етап — і побачите, які дані в нього йдуть, яку величину
          мінімізують і що саме змінюється у вагах.
        </div>
      </div>
    </div>

    <div class="tp__rail" aria-hidden="true">
      <button
        v-for="(s, i) in stages"
        :key="s.id"
        type="button"
        class="tp__pill"
        :class="{ 'is-on': open === s.id, 'is-last': i === stages.length - 1 }"
        @click="toggle(s.id)"
      >
        {{ i + 1 }}
      </button>
    </div>

    <div v-for="s in stages" :key="s.id" class="tp__item" :class="{ 'is-open': open === s.id }">
      <button class="tp__head" type="button" :aria-expanded="open === s.id" @click="toggle(s.id)">
        <span class="tp__chev">▸</span>
        <span class="tp__name">{{ s.name }}</span>
        <span class="tp__short">{{ s.short }}</span>
        <span class="tp__who" :class="{ 'is-you': s.id === 'inf' }">{{ s.who }}</span>
      </button>

      <div v-if="open === s.id" class="tp__body">
        <div v-for="d in s.data" :key="d.label" class="tp__data">
          <span class="tp__label">{{ d.label }}</span>
          <pre class="tp__text">{{ d.text }}</pre>
        </div>

        <div class="tp__grid">
          <div>
            <span class="tp__label">що мінімізують</span>
            <code class="tp__goal">{{ s.goal }}</code>
            <span class="tp__hint">{{ s.goalNote }}</span>
          </div>
          <div>
            <span class="tp__label">що змінюється</span>
            <span class="tp__changes">{{ s.changes }}</span>
          </div>
        </div>

        <table class="tp__nums">
          <tbody>
            <tr v-for="n in s.numbers" :key="n.k">
              <td>{{ n.k }}</td>
              <td><b>{{ n.v }}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="lab__note">
      Перші чотири етапи виконує постачальник моделі один раз; пʼятий виконується
      на кожен ваш запит — і тільки його параметри ви задаєте самі.
    </p>
  </div>
</template>

<style scoped>
.tp__rail { display: flex; gap: 0.3rem; margin: 1rem 0 0.8rem; }
.tp__pill {
  flex: 1 1 0;
  padding: 0.3rem 0;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  cursor: pointer;
}
.tp__pill.is-on { border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 700; }
.tp__pill.is-last.is-on { border-color: var(--uk-warm); color: var(--uk-warm); }

.tp__item { border: 1px solid var(--uk-line); border-radius: 9px; margin-bottom: 0.45rem; }
.tp__item.is-open { border-color: var(--uk-accent); }
.tp__head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  width: 100%;
  padding: 0.65rem 0.85rem;
  background: transparent;
  border: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.tp__chev { color: var(--uk-accent); font-size: 0.75rem; transition: transform 0.15s ease; }
.is-open .tp__chev { transform: rotate(90deg); }
.tp__name { font-weight: 600; font-size: 0.92rem; flex: none; }
.tp__short { color: var(--vp-c-text-3); font-size: 0.83rem; flex: 1 1 auto; }
.tp__who { font-size: 0.74rem; color: var(--vp-c-text-3); flex: none; }
.tp__who.is-you { color: var(--uk-warm); font-weight: 600; }

.tp__body { padding: 0 0.85rem 0.9rem; border-top: 1px solid var(--uk-line); }
.tp__label {
  display: block;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0.7rem 0 0.25rem;
}
.tp__text {
  margin: 0;
  padding: 0.6rem 0.7rem;
  background: var(--uk-fill);
  border-radius: 7px;
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
}
.tp__grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 1rem; }
.tp__goal { display: block; font-size: 0.8rem; margin-bottom: 0.2rem; }
.tp__hint, .tp__changes { font-size: 0.8rem; color: var(--vp-c-text-2); line-height: 1.45; }
.tp__nums { width: 100%; margin: 0.9rem 0 0; border-collapse: collapse; font-size: 0.8rem; }
.tp__nums td { padding: 0.28rem 0; border-bottom: 1px solid var(--uk-line); vertical-align: top; }
.tp__nums td:first-child { color: var(--vp-c-text-3); width: 40%; padding-right: 0.8rem; }
@media (max-width: 720px) {
  .tp__grid { grid-template-columns: 1fr; gap: 0.2rem; }
  .tp__head { flex-wrap: wrap; row-gap: 0.15rem; }
  .tp__short { flex-basis: 100%; }
  .tp__nums td:first-child { width: 45%; }
}
</style>
