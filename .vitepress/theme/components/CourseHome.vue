<script setup lang="ts">
/** Головна: карта курсу за блоками. */
import { withBase } from 'vitepress'

const BLOCKS = [
  {
    code: 'A',
    name: "Модель як компонент системи",
    lead: "Що модель обчислює, звідки береться недетермінізм і як зробити її відповідь придатною для коду.",
    items: [
      { id: '01', t: "Велика мовна модель: архітектура Transformer і поведінка в системі" },
      { id: '02', t: "Токени, embeddings і attention: що модель бачить на вході" },
      { id: '03', t: "Як навчають модель: pre-training, вирівнювання та декодування" },
      { id: '04', t: "Промпт-інженерія та керування контекстом" },
      { id: '05', t: "Structured outputs: як зробити відповідь моделі придатною для коду" }
    ]
  },
  {
    code: 'B',
    name: "Знання поза вагами",
    lead: "Пошук потрібного фрагмента, збирання відповіді з цитатою і доказ, що прийом справді працює.",
    items: [
      { id: '06', t: "Векторний пошук: як знайти потрібний фрагмент серед мільйона" },
      { id: '07', t: "Архітектура RAG: від документа до відповіді з цитатою" },
      { id: '08', t: "Якість RAG: переписування запиту, реранкування та вимірювання" }
    ]
  },
  {
    code: 'C',
    name: "Де і за скільки виконується",
    lead: "Власне залізо проти API: пам'ять, квантизація, черги, кеші й поведінка під навантаженням.",
    items: [
      { id: '09', t: "Локальні та відкриті моделі: пам'ять, квантизація, сервінг" },
      { id: '10', t: "Production-архітектура LLM-сервісу: потужність, кеші, деградація" }
    ]
  },
  {
    code: 'D',
    name: "Агент як керований цикл",
    lead: "Цикл із бюджетами, інструменти, протоколи, пам'ять і людина в контурі.",
    items: [
      { id: '11', t: "Агент як керований цикл: стан, бюджети, межа автономії" },
      { id: '12', t: "Tool use і ReAct: як модель просить систему діяти" },
      { id: '13', t: "MCP і A2A: спільний протокол замість власних конекторів" },
      { id: '14', t: "Пам'ять агента і довготривалі процеси" },
      { id: '15', t: "Графові агенти: явний стан, checkpoint і людина в контурі" }
    ]
  },
  {
    code: 'E',
    name: "Масштаб, докази, ризик",
    lead: "Другий агент, доказ надійності числами і те, що ламається під атакою.",
    items: [
      { id: '16', t: "Мультиагентні системи: коли другий агент окупається" },
      { id: '17', t: "Оцінювання та observability agentic-систем" },
      { id: '18', t: "Безпека агентів і доказ готовності системи" }
    ]
  }
]

const FIGS = [
  { src: 'Anthropic, Building Effective Agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', got: 'розширена LLM, цикл агента, патерни воркфлоу' },
  { src: 'Anthropic, Effective context engineering', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', got: 'калібрування системного промпта' },
  { src: 'Jay Alammar, The Illustrated Transformer', url: 'https://jalammar.github.io/illustrated-transformer/', got: 'Q/K/V, ваги attention, логіти → softmax' },
  { src: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/', got: 'архітектура Transformer, GPT, схема RAG' },
  { src: 'Sebastian Raschka, LLMs from Scratch', url: 'https://github.com/rasbt/LLMs-from-scratch', got: 'конвеєр входу, таблиця embeddings' },
  { src: 'Hugging Face, Illustrating RLHF', url: 'https://huggingface.co/blog/rlhf', got: 'передтренування, reward-модель, цикл RLHF' },
  { src: 'Gao та ін., RAG Survey', url: 'https://arxiv.org/abs/2312.10997', got: 'конвеєр RAG, три покоління' },
  { src: 'Rafailov та ін., DPO', url: 'https://arxiv.org/abs/2305.18290', got: 'RLHF проти DPO' },
  { src: 'Kwon та ін., PagedAttention', url: 'https://arxiv.org/abs/2309.06180', got: 'архітектура сервінгу vLLM' },
  { src: 'Anthropic, Multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', got: 'оркестратор і пошукові підагенти' },
  { src: 'Debenedetti та ін., CaMeL', url: 'https://arxiv.org/abs/2503.18813', got: 'два інтерпретатори і граф даних' },
  { src: 'Ainslie та ін., GQA', url: 'https://arxiv.org/abs/2305.13245', got: 'multi-head, grouped-query і multi-query' },
  { src: 'Sumers та ін., CoALA', url: 'https://arxiv.org/abs/2309.02427', got: 'чотири типи памʼяті агента' },
  { src: 'Greshake та ін., Indirect Prompt Injection', url: 'https://arxiv.org/abs/2302.12173', got: 'ланцюг непрямої ін\'єкції' }
]

const LIT = [
  { t: 'Jurafsky D., Martin J. H. Speech and Language Processing', u: 'https://web.stanford.edu/~jurafsky/slp3/', n: '3rd ed. draft, 2026' },
  { t: 'Xiao T., Zhu J. Foundations of Large Language Models', u: 'https://arxiv.org/abs/2501.09223', n: 'arXiv:2501.09223, 2025' },
  { t: 'Raschka S. Build a Large Language Model (From Scratch)', u: 'https://github.com/rasbt/LLMs-from-scratch', n: 'Manning, 2024' },
  { t: 'Vaswani A. et al. Attention Is All You Need', u: 'https://arxiv.org/abs/1706.03762', n: 'NeurIPS, 2017' },
  { t: 'Model Context Protocol', u: 'https://modelcontextprotocol.io/', n: 'офіційна специфікація' },
  { t: 'LangGraph', u: 'https://docs.langchain.com/oss/python/langgraph/overview', n: 'документація' },
  { t: 'vLLM', u: 'https://docs.vllm.ai/', n: 'документація' },
  { t: 'Hugging Face Transformers', u: 'https://huggingface.co/docs/transformers', n: 'документація' }
]
</script>

<template>
  <div class="uk-hero">
    <div class="uk-hero__eyebrow">КПІ ім. Ігоря Сікорського · спеціальність F3 · бакалаврат, 4 курс · 2026/2027</div>
    <h1>Прикладні AI-агенти та LLM-орієнтовані системи</h1>
    <p class="uk-hero__lead">
      Вісімнадцять лекцій про те, як зібрати робочу систему навколо мовної моделі: від того,
      що модель обчислює всередині, до доказу, що зібране витримує навантаження й атаку.
      Наскрізний приклад — асистент навчального відділу — росте від типізованого клієнта
      до захищеного агента.
    </p>
    <p class="uk-hero__author">Kirill Riazanovskiy, PhD</p>
  </div>

  <div class="uk-blocks">
    <section v-for="b in BLOCKS" :key="b.code" class="uk-block">
      <div class="uk-block__tag">БЛОК {{ b.code }}</div>
      <h3>{{ b.name }}</h3>
      <p class="uk-block__lead">{{ b.lead }}</p>
      <ol>
        <li v-for="l in b.items" :key="l.id">
          <a :href="withBase(`/lectures/${l.id}`)">{{ l.t }}</a>
        </li>
      </ol>
    </section>
  </div>

  <section class="uk-sources">
    <h2>Джерела</h2>
    <p class="uk-sources__lead">
      Пріоритет — готові схеми з першоджерел; власні намальовано лише там, де готового
      аналога немає. Під кожною зовнішньою ілюстрацією стоїть посилання на джерело.
      Повні списки — наприкінці кожної лекції, поруч із темою, якої вони стосуються.
    </p>

    <h3>Ілюстрації</h3>
    <table class="uk-sources__table">
      <thead><tr><th>Джерело</th><th>Що взято</th></tr></thead>
      <tbody>
        <tr v-for="f in FIGS" :key="f.url">
          <td><a :href="f.url" target="_blank" rel="noopener">{{ f.src }}</a></td>
          <td>{{ f.got }}</td>
        </tr>
      </tbody>
    </table>
    <h3>Основна література й документація</h3>
    <ul class="uk-sources__lit">
      <li v-for="l in LIT" :key="l.u">
        <a :href="l.u" target="_blank" rel="noopener">{{ l.t }}</a>
        <span class="uk-sources__meta">{{ l.n }}</span>
      </li>
    </ul>

    <p class="uk-sources__note">
      <a :href="withBase('/syllabus-2026.pdf')">Силабус дисципліни у PDF</a>
    </p>
  </section>
</template>

<style scoped>
.uk-hero__author {
  margin: 1.1rem 0 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}
.uk-block__lead {
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--vp-c-text-3);
  margin: 0 0 0.7rem;
}
.uk-block ol { list-style: decimal; }
.uk-block ol li::marker { font-family: var(--vp-font-family-mono); font-size: 0.78rem; color: var(--vp-c-text-3); }

.uk-sources { margin: 3.5rem 0 0; padding-top: 2rem; border-top: 1px solid var(--uk-line); }
.uk-sources h2 { font-size: 1.35rem; margin: 0 0 0.6rem; border: 0; padding: 0; }
.uk-sources h3 { font-size: 0.95rem; margin: 1.8rem 0 0.6rem; }
.uk-sources__lead { font-size: 0.88rem; line-height: 1.6; color: var(--vp-c-text-2); max-width: 62ch; margin: 0; }
.uk-sources__table { font-size: 0.85rem; margin: 0; }
.uk-sources__table td:last-child { color: var(--vp-c-text-2); }
.uk-sources__note { font-size: 0.85rem; color: var(--vp-c-text-2); margin: 0.9rem 0 0; }
.uk-sources__lit { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.uk-sources__lit li { font-size: 0.85rem; line-height: 1.5; }
.uk-sources__meta { color: var(--vp-c-text-3); font-size: 0.78rem; margin-left: 0.45rem; }
</style>
