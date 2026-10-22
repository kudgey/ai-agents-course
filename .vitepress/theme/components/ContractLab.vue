<script setup lang="ts">
/**
 * Шість сирих відповідей лекції 05 і одна транспортна помилка
 * проходять ту саму послідовність перевірок, що описана в тексті:
 * HTTP-статус → stop_reason → Pydantic (форма) → Pydantic (правило контракту).
 * Тексти помилок не вигадані: це вивід Pydantic із того самого прогону,
 * що й блок коду лекції (дані — lec05.json).
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05.json'

type Kind = 'transport' | 'schema' | 'domain' | 'refusal' | 'ok'
type Case = {
  id: string
  label: string
  stop_reason?: string
  status?: number
  raw: string | null
  kind: Kind
  retry: string
  err_type: string | null
  err_msg: string | null
  err_loc: string | null
}

const CASES = data.cases as Case[]
const pick = ref(0)
const cur = computed(() => CASES[pick.value])

const STEPS = ['HTTP-статус', 'stop_reason', 'Pydantic: форма', 'Pydantic: правило']

/** На якому кроці зупинилась перевірка (−1 — пройдено все). */
const stopAt = computed(() => {
  const c = cur.value
  if (c.status && c.status >= 400) return 0
  if (c.stop_reason === 'refusal' || c.stop_reason === 'max_tokens') return 1
  if (c.err_type === 'value_error') return 3
  if (c.err_type) return 2
  return -1
})

function stepState(i: number) {
  if (stopAt.value === -1 || i < stopAt.value) return 'pass'
  if (i === stopAt.value) return 'fail'
  return 'skip'
}

const why = computed(() => {
  const c = cur.value
  switch (c.id) {
    case 'transport':
      return `HTTP ${c.status} · ${c.err_type}: виклик не дійшов до моделі, про зміст відповіді нічого не відомо.`
    case 'refusal':
      return 'stop_reason = "refusal": модель відмовилась. Це законна відповідь, а не збій формату.'
    case 'truncated':
      return 'stop_reason = "max_tokens": відповідь обірвана на ліміті токенів.'
    case 'domain':
      return 'Форма бездоганна, але порушено правило контракту: без відмови немає жодної цитати.'
    case 'ok':
      return "Об'єкт відповідає схемі й правилу контракту. Код може його читати."
    default:
      return c.err_loc ? `Поле «${c.err_loc}» не відповідає схемі.` : 'Відповідь не відповідає схемі.'
  }
})

/** Що сказав би Pydantic, якби перевірку stop_reason пропустили. */
const hidden = computed(() => {
  const c = cur.value
  return stopAt.value === 1 && c.err_type ? `${c.err_type}: ${c.err_msg}` : null
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
        <div class="lab__title">Шість відповідей і 529 крізь одну послідовність перевірок</div>
        <div class="lab__sub">
          Оберіть, що повернув сервіс. Перевірки йдуть у тому самому порядку, що в тексті:
          спершу статус, потім <code>stop_reason</code>, потім Pydantic.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="(c, i) in CASES" :key="c.id"
        class="lab__pill" :class="{ 'is-on': pick === i }" @click="pick = i"
      >{{ c.label }}</button>
    </div>

    <pre class="cn__raw"><code><span class="cn__meta">{{ cur.status ? `HTTP ${cur.status} · тіла з відповіддю моделі немає` : `stop_reason: "${cur.stop_reason}"` }}</span>
<template v-if="cur.raw">{{ cur.raw }}</template></code></pre>

    <ol class="cn__steps">
      <li v-for="(s, i) in STEPS" :key="s" :class="'is-' + stepState(i)">
        <span class="cn__dot">{{ stepState(i) === 'pass' ? '✓' : stepState(i) === 'fail' ? '✕' : '·' }}</span>
        {{ s }}
      </li>
    </ol>

    <div class="cn__result" :class="'is-' + cur.kind">
      <div class="cn__badge">{{ LABELS[cur.kind] }}</div>
      <div class="cn__body">
        <p>{{ why }}</p>
        <code v-if="cur.err_msg && stopAt >= 2" class="cn__err">{{ cur.err_type }}: {{ cur.err_msg }}</code>
        <div v-if="hidden" class="cn__hidden">
          Без перевірки <code>stop_reason</code> Pydantic побачив би лише
          <code>{{ hidden }}</code> — і жодного натяку на справжню причину.
        </div>
        <div class="cn__retry" :class="{ 'is-yes': cur.retry.startsWith('так') }">
          Повтор: {{ cur.retry }}
        </div>
      </div>
    </div>

    <p class="lab__note">
      Обрив і відмова для парсера виглядають однаково — <code>json_invalid</code>. Розрізняє
      їх лише <code>stop_reason</code>, тому його перевіряють раніше за схему. А порожні
      цитати проходять усі перевірки типів, і зупиняє їх тільки правило контракту.
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
  word-break: break-word;
  color: var(--vp-c-text-1);
}
.cn__meta { color: var(--vp-c-text-3); }
.cn__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  padding: 0;
  margin: 0 0 0.8rem;
}
.cn__steps li {
  margin: 0;
  font-size: 0.78rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--uk-line);
  color: var(--vp-c-text-3);
}
.cn__steps li.is-pass { color: var(--uk-green); border-color: var(--uk-green); }
.cn__steps li.is-fail { color: var(--uk-warm); border-color: var(--uk-warm); background: var(--uk-warm-soft); }
.cn__steps li.is-skip { opacity: 0.5; border-style: dashed; }
.cn__dot { font-weight: 600; margin-right: 0.15rem; }
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
.cn__body p { margin: 0 0 0.45rem; font-size: 0.86rem; line-height: 1.55; color: var(--vp-c-text-1); }
.cn__err {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  margin-bottom: 0.45rem;
  word-break: break-word;
}
.cn__hidden { font-size: 0.8rem; line-height: 1.5; color: var(--vp-c-text-2); margin-bottom: 0.45rem; }
.cn__hidden code { font-size: 0.74rem; word-break: break-word; }
.cn__retry { font-size: 0.8rem; color: var(--uk-warm); font-weight: 500; }
.cn__retry.is-yes { color: var(--uk-green); }
@media (max-width: 620px) {
  .cn__result { flex-direction: column; gap: 0.5rem; }
}
</style>
