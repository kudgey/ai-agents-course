<script setup lang="ts">
/**
 * Чотири класи помилок на живих відповідях.
 * Кожен випадок проганяється через ту саму послідовність перевірок,
 * що описана на слайді: транспорт → схема → домен → відмова.
 */
import { ref, computed } from 'vue'

type Kind = 'transport' | 'schema' | 'domain' | 'refusal' | 'ok'

const CASES: {
  label: string
  raw: string
  status?: number
  stop?: string
}[] = [
  {
    label: 'Коректна відповідь',
    raw: '{"answer": "з 3 по 14 лютого", "source": "наказ 1-476", "confidence": 0.86, "abstained": false}',
  },
  {
    label: 'Обірваний JSON',
    raw: '{"answer": "з 3 по 14 лютого", "source": "наказ 1-4',
  },
  {
    label: 'Зайве поле',
    raw: '{"answer": "з 3 по 14 лютого", "source": "наказ 1-476", "confidence": 0.9, "abstained": false, "note": "не впевнений"}',
  },
  {
    label: 'Поле не того типу',
    raw: '{"answer": "з 3 по 14 лютого", "source": "наказ 1-476", "confidence": "висока", "abstained": false}',
  },
  {
    label: 'Форма валідна, правило порушено',
    raw: '{"answer": "з 3 по 14 лютого", "source": "", "confidence": 0.91, "abstained": false}',
  },
  {
    label: 'Модель відмовилась',
    raw: '{"answer": "", "source": "", "confidence": 0.0, "abstained": true}',
    stop: 'refusal',
  },
  {
    label: 'Сервіс віддав 529',
    raw: '',
    status: 529,
  },
]

const pick = ref(0)
const cur = computed(() => CASES[pick.value])

const REQUIRED = ['answer', 'source', 'confidence', 'abstained']

/** Той самий порядок перевірок, що в коді лекції. */
const result = computed(() => {
  const c = cur.value

  if (c.status && c.status >= 400) {
    return {
      kind: 'transport' as Kind,
      step: 'до розбору справа не дійшла',
      msg: `HTTP ${c.status}: виклик не дійшов, про зміст відповіді нічого не відомо`,
      retry: 'так, з експоненційною затримкою і джитером',
      retryOk: true,
    }
  }

  if (c.stop === 'refusal') {
    return {
      kind: 'refusal' as Kind,
      step: 'stop_reason = refusal',
      msg: 'Модель відмовилась відповідати. Це законна відповідь, а не збій.',
      retry: 'ні — повтор дасть ту саму відмову',
      retryOk: false,
    }
  }

  let obj: any
  try {
    obj = JSON.parse(c.raw)
  } catch (e: any) {
    return {
      kind: 'schema' as Kind,
      step: 'JSON.parse',
      msg: `Розбір не вдався: ${String(e.message).slice(0, 60)}`,
      retry: 'так, але не більше двох спроб, і в промпт іде текст помилки',
      retryOk: true,
    }
  }

  const extra = Object.keys(obj).filter((k) => !REQUIRED.includes(k))
  if (extra.length)
    return {
      kind: 'schema' as Kind,
      step: 'additionalProperties: false',
      msg: `Поле поза контрактом: ${extra.join(', ')}. Без заборони воно мовчки пройшло б далі.`,
      retry: 'так, ≤ 2 спроби з текстом помилки валідатора',
      retryOk: true,
    }

  if (typeof obj.confidence !== 'number')
    return {
      kind: 'schema' as Kind,
      step: 'перевірка типів',
      msg: `confidence має бути числом, а прийшов ${typeof obj.confidence}`,
      retry: 'так, ≤ 2 спроби з текстом помилки валідатора',
      retryOk: true,
    }

  if (!obj.abstained && !obj.source)
    return {
      kind: 'domain' as Kind,
      step: 'доменне правило',
      msg: 'Відповідь без джерела, хоча abstained = false. За формою валідна, за правилами задачі — ні.',
      retry: 'ні — повторювати немає сенсу, це відповідь користувачу',
      retryOk: false,
    }

  if (obj.abstained)
    return {
      kind: 'refusal' as Kind,
      step: 'abstained = true',
      msg: 'Модель скористалась дозволом промовчати. Окрема гілка відповіді, не помилка.',
      retry: 'ні',
      retryOk: false,
    }

  return {
    kind: 'ok' as Kind,
    step: 'усі перевірки пройдено',
    msg: 'Об’єкт відповідає контракту і доменним правилам. Код може його читати.',
    retry: 'не потрібен',
    retryOk: false,
  }
})

const LABELS: Record<Kind, string> = {
  transport: 'Транспорт',
  schema: 'Схема',
  domain: 'Доменна',
  refusal: 'Відмова моделі',
  ok: 'Без помилки',
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Чотири класи помилок на живих відповідях</div>
        <div class="lab__sub">
          Оберіть, що повернув сервіс. Перевірки йдуть у тому самому порядку, що в коді:
          транспорт, потім схема, потім доменні правила, і лише тоді — відмова.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="(c, i) in CASES" :key="c.label"
        class="lab__pill" :class="{ 'is-on': pick === i }" @click="pick = i"
      >{{ c.label }}</button>
    </div>

    <pre class="cn__raw"><code>{{ cur.status ? `HTTP ${cur.status} — тіло відсутнє` : cur.raw }}</code></pre>

    <div class="cn__result" :class="'is-' + result.kind">
      <div class="cn__badge">{{ LABELS[result.kind] }}</div>
      <div class="cn__body">
        <div class="cn__step">спрацювало на кроці: <code>{{ result.step }}</code></div>
        <p>{{ result.msg }}</p>
        <div class="cn__retry" :class="{ 'is-yes': result.retryOk }">
          Повтор: {{ result.retry }}
        </div>
      </div>
    </div>

    <p class="lab__note">
      Три з чотирьох класів вимагають різної реакції, і саме тому слово «помилка» в логах
      марне. Питання для перевірки себе: чому доменну помилку не можна лікувати повтором,
      а відмову моделі — взагалі не можна називати помилкою.
    </p>
  </div>
</template>

<style scoped>
.cn__raw {
  margin: 0 0 0.8rem;
  padding: 0.7rem 0.85rem;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--vp-c-text-1);
}
.cn__result { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.8rem 0.9rem; border-radius: 9px; }
.cn__result.is-ok { background: var(--uk-green-soft); }
.cn__result.is-transport, .cn__result.is-schema { background: var(--uk-accent-soft); }
.cn__result.is-domain, .cn__result.is-refusal { background: var(--uk-warm-soft); }
.cn__badge {
  flex: none;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  background: var(--vp-c-bg);
  white-space: nowrap;
}
.is-ok .cn__badge { color: var(--uk-green); }
.is-transport .cn__badge, .is-schema .cn__badge { color: var(--uk-accent); }
.is-domain .cn__badge, .is-refusal .cn__badge { color: var(--uk-warm); }
.cn__body { min-width: 0; }
.cn__step { font-size: 0.75rem; color: var(--vp-c-text-3); }
.cn__step code { font-family: var(--vp-font-family-mono); font-size: 0.72rem; }
.cn__body p { margin: 0.3rem 0 0.45rem; font-size: 0.86rem; line-height: 1.55; color: var(--vp-c-text-1); }
.cn__retry { font-size: 0.8rem; color: var(--uk-warm); font-weight: 500; }
.cn__retry.is-yes { color: var(--uk-green); }
</style>
