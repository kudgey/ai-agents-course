<script setup lang="ts">
/**
 * Обмежене декодування на схемі {"abstained": true|false}.
 * На кожному кроці: стан автомата, дозволені токени, softmax до і після маски.
 * Логіти ілюстративні (так сказано в тексті), ймовірності пораховано з них
 * у lec05.json — ті самі числа, що в розділі «маска на пальцях».
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05.json'

type Step = {
  state: string
  allowed: string[]
  logits: number[]
  before: number[]
  after: number[]
  top_before: string
  top_allowed: boolean
}

const VOCAB = data.vocab as string[]
const STEPS = data.mask as Step[]
const step = ref(3) // стан S3 — той, що розібраний у тексті
const masked = ref(true)
const cur = computed(() => STEPS[step.value])

/** Згенерований префікс: на кожному попередньому кроці — найімовірніший дозволений токен. */
const prefix = computed(() =>
  STEPS.slice(0, step.value)
    .map((s) => VOCAB[s.after.indexOf(Math.max(...s.after))])
    .join(''),
)

const rows = computed(() =>
  VOCAB.map((tok, i) => ({
    tok,
    logit: cur.value.logits[i],
    p: masked.value ? cur.value.after[i] : cur.value.before[i],
    ok: cur.value.allowed.includes(tok),
  })),
)

const pick = computed(() => {
  const ps = masked.value ? cur.value.after : cur.value.before
  return VOCAB[ps.indexOf(Math.max(...ps))]
})

const show = (t: string) => t.trim()
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Маска граматики крок за кроком</div>
        <div class="lab__sub">
          Схема <code>{"abstained": true | false}</code>. Перемикайте стани автомата й
          вимикайте маску, щоб побачити, що модель згенерувала б без неї.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button
        v-for="(s, i) in STEPS" :key="s.state"
        class="lab__pill" :class="{ 'is-on': step === i }" @click="step = i"
      >S{{ i }} · {{ s.state }}</button>
    </div>

    <div class="mk__prefix">
      <span class="mk__lbl">уже згенеровано:</span>
      <code>{{ prefix || '∅' }}<span class="mk__cursor">▍</span></code>
    </div>

    <label class="mk__toggle">
      <input v-model="masked" type="checkbox" /> маска увімкнена
      <span class="mk__allowed">дозволено: <code v-for="a in cur.allowed" :key="a">{{ show(a) }}</code></span>
    </label>

    <div class="mk__rows">
      <div v-for="r in rows" :key="r.tok" class="lab__row" :class="{ 'is-off': masked && !r.ok }">
        <code class="mk__tok">{{ show(r.tok) }}</code>
        <span class="mk__logit">{{ masked && !r.ok ? '−∞' : r.logit.toFixed(1) }}</span>
        <div class="lab__bar"><i :class="{ 'is-ok': r.ok }" :style="{ width: r.p * 100 + '%' }" /></div>
        <span class="lab__num">{{ r.p.toFixed(2) }}</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="masked ? 'is-green' : (cur.top_allowed ? 'is-green' : 'is-warm')">
        <b>{{ show(pick) }}</b><span>наступний токен (найімовірніший)</span>
      </div>
      <div class="lab__stat">
        <b>{{ cur.before[VOCAB.indexOf(cur.top_before)].toFixed(2) }}</b>
        <span>без маски модель найбільше хоче «{{ show(cur.top_before) }}»</span>
      </div>
    </div>

    <p class="lab__note">
      Маска не підказує, яка відповідь правильна: у S3 вона лише прибирає неможливі
      токени, і softmax перераховується по двох, що лишилися, — 0.67 і 0.33. Логіти тут
      ілюстративні, а арифметика справжня. Без маски вже на кроці S0 модель почала б
      із «Звісно», і JSON не вийшло б узагалі.
    </p>
  </div>
</template>

<style scoped>
.mk__prefix {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  background: var(--uk-fill);
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  margin-bottom: 0.7rem;
}
.mk__prefix code { font-family: var(--vp-font-family-mono); font-size: 0.85rem; word-break: break-all; }
.mk__lbl { font-size: 0.75rem; color: var(--vp-c-text-3); }
.mk__cursor { color: var(--uk-accent); }
.mk__toggle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.6rem;
  cursor: pointer;
}
.mk__toggle input { accent-color: var(--uk-accent); }
.mk__allowed { margin-left: auto; font-size: 0.78rem; color: var(--vp-c-text-3); }
.mk__allowed code { margin-left: 0.3rem; font-size: 0.74rem; }
.mk__rows .lab__row { transition: opacity 0.2s ease; }
.mk__rows .lab__row.is-off { opacity: 0.35; }
.mk__tok { width: 7.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mk__logit {
  width: 2.4rem;
  flex: none;
  text-align: right;
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  color: var(--vp-c-text-3);
}
.lab__bar i { background: var(--uk-warm); }
.lab__bar i.is-ok { background: var(--uk-accent); }
@media (max-width: 620px) {
  .mk__tok { width: 5.6rem; }
  .mk__allowed { margin-left: 0; width: 100%; }
}
</style>
