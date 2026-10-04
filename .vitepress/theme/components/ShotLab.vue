<script setup lang="ts">
/**
 * Три промпти на одній задачі: zero-, one- і few-shot поруч.
 * Підсвічування показує, чим саме відрізняються проміжки — інструкцією
 * і демонстраціями, — щоб «3-shot» перестало бути числом нізвідки.
 */
import { ref } from 'vue'

type Line = { t: string; kind?: 'instr' | 'demo' | 'query' }

const SHOTS: { id: string; name: string; k: string; lines: Line[]; what: string }[] = [
  {
    id: 'zero',
    name: 'Zero-shot',
    k: 'K = 0 демонстрацій',
    what: 'Працює лише інструкція: і задача, і множина допустимих відповідей описані словами.',
    lines: [
      { t: 'Визнач тональність відгуку.', kind: 'instr' },
      { t: 'Відповідай одним словом:', kind: 'instr' },
      { t: 'позитивна, негативна або нейтральна.', kind: 'instr' },
      { t: '' },
      { t: 'Відгук: «Прийшло на день раніше,', kind: 'query' },
      { t: 'працює тихо.»', kind: 'query' },
      { t: 'Тональність:', kind: 'query' },
    ],
  },
  {
    id: 'one',
    name: 'One-shot',
    k: 'K = 1 демонстрація',
    what: 'Інструкції немає — її замінила демонстрація. Але з одного прикладу не видно меж: що таке «нейтральна» і чи буває вона взагалі.',
    lines: [
      { t: 'Відгук: «Зламався через тиждень.»', kind: 'demo' },
      { t: 'Тональність: негативна', kind: 'demo' },
      { t: '' },
      { t: 'Відгук: «Прийшло на день раніше,', kind: 'query' },
      { t: 'працює тихо.»', kind: 'query' },
      { t: 'Тональність:', kind: 'query' },
    ],
  },
  {
    id: 'few',
    name: 'Few-shot',
    k: 'K = 3 демонстрації',
    what: 'Кожен клас показано принаймні раз. Разом демонстрації задають не лише формат, а й поділ простору відповідей.',
    lines: [
      { t: 'Відгук: «Зламався через тиждень.»', kind: 'demo' },
      { t: 'Тональність: негативна', kind: 'demo' },
      { t: '' },
      { t: 'Відгук: «Доставили вчасно, все як в описі.»', kind: 'demo' },
      { t: 'Тональність: позитивна', kind: 'demo' },
      { t: '' },
      { t: 'Відгук: «Коробка помʼята, сам товар цілий.»', kind: 'demo' },
      { t: 'Тональність: нейтральна', kind: 'demo' },
      { t: '' },
      { t: 'Відгук: «Прийшло на день раніше,', kind: 'query' },
      { t: 'працює тихо.»', kind: 'query' },
      { t: 'Тональність:', kind: 'query' },
    ],
  },
]

const legend = ref(true)
</script>

<template>
  <div class="lab sl3">
    <div class="lab__head">
      <div>
        <div class="lab__title">Той самий запит із різною кількістю демонстрацій</div>
        <div class="lab__sub">
          Задача одна — тональність відгуку. Міняється тільки те, скільки розвʼязаних
          прикладів лежить у промпті перед запитанням.
        </div>
      </div>
      <button class="lab__btn" @click="legend = !legend">
        {{ legend ? 'Сховати' : 'Показати' }} підсвічування
      </button>
    </div>

    <div v-if="legend" class="sl3__legend">
      <span class="sl3__key is-instr">інструкція</span>
      <span class="sl3__key is-demo">демонстрація</span>
      <span class="sl3__key is-query">власне запит</span>
    </div>

    <div class="sl3__grid">
      <div v-for="s in SHOTS" :key="s.id" class="sl3__col">
        <div class="sl3__name">{{ s.name }}</div>
        <div class="sl3__k">{{ s.k }}</div>
        <pre class="sl3__prompt"><span
          v-for="(l, i) in s.lines"
          :key="i"
          class="sl3__line"
          :class="legend && l.kind ? 'is-' + l.kind : ''"
        >{{ l.t }}
</span></pre>
        <p class="sl3__what">{{ s.what }}</p>
      </div>
    </div>

    <p class="lab__note">
      Це показані промпти, а не прогони: ми їх не виконуємо. Зверніть увагу, що
      демонстрації мають покривати класи, а не просто бути численними — три приклади
      на три класи працюють краще за десять прикладів одного класу.
    </p>
  </div>
</template>

<style scoped>
.sl3__legend { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.9rem 0 0.7rem; }
.sl3__key { font-size: 0.72rem; padding: 0.12rem 0.5rem; border-radius: 5px; }
.sl3__key.is-instr { background: var(--uk-accent-soft); color: var(--uk-accent); }
.sl3__key.is-demo { background: var(--uk-green-soft); color: var(--uk-green); }
.sl3__key.is-query { background: var(--uk-warm-soft); color: var(--uk-warm); }

.sl3__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; }
.sl3__col { border: 1px solid var(--uk-line); border-radius: 9px; padding: 0.7rem 0.75rem; }
.sl3__name { font-weight: 600; font-size: 0.88rem; }
.sl3__k { font-size: 0.72rem; color: var(--vp-c-text-3); margin-bottom: 0.5rem; }
.sl3__prompt {
  margin: 0;
  padding: 0.6rem 0.55rem;
  background: var(--uk-fill);
  border-radius: 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
.sl3__line { display: block; border-radius: 3px; }
.sl3__line.is-instr { background: var(--uk-accent-soft); }
.sl3__line.is-demo { background: var(--uk-green-soft); }
.sl3__line.is-query { background: var(--uk-warm-soft); }
.sl3__what { font-size: 0.78rem; color: var(--vp-c-text-2); line-height: 1.5; margin: 0.6rem 0 0; }
@media (max-width: 760px) {
  .sl3__grid { grid-template-columns: 1fr; }
  .sl3__prompt { font-size: 0.74rem; }
}
</style>
