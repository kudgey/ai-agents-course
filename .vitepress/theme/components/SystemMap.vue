<script setup lang="ts">
/** Дев'ять компонентів системи: за що відповідає, як ламається, де в курсі. */
import { ref } from 'vue'

const PARTS = [
  { id: 'model', name: 'Модель', duty: 'що генерує текст', breaks: 'мовчазна зміна версії міняє поведінку без жодної зміни у вашому коді', lect: ['01', '03', '09'] },
  { id: 'contract', name: 'Контракт виводу', duty: 'як код читає відповідь', breaks: 'модель повертає текст замість структури — парсер падає на проді', lect: ['05'] },
  { id: 'context', name: 'Контекст', duty: 'що модель бачить на вході', breaks: 'потрібний фрагмент опиняється в середині вікна і його не помічають', lect: ['02', '04'] },
  { id: 'retrieval', name: 'Пошук', duty: 'звідки береться знання', breaks: 'запит і документ написані різними словами — релевантне не знаходиться', lect: ['06', '07', '08'] },
  { id: 'tools', name: 'Інструменти', duty: 'як система діє в світі', breaks: 'модель викликає інструмент із неправильним аргументом і не бачить помилки', lect: ['12', '13'] },
  { id: 'memory', name: 'Стан і пам\'ять', duty: 'що живе між кроками', breaks: 'хибний запис переживає сесію і псує всі наступні відповіді', lect: ['14', '15'] },
  { id: 'eval', name: 'Оцінювання', duty: 'чим доводимо якість', breaks: 'демонстрація працює, а на двадцяти задачах різниця тоне в шумі', lect: ['08', '17'] },
  { id: 'obs', name: 'Спостережуваність', duty: 'як бачимо, що сталося', breaks: 'запит упав, і немає траси, за якою відновити крок відмови', lect: ['10', '17'] },
  { id: 'sec', name: 'Безпека', duty: 'що робимо з недовіреним входом', breaks: 'текст із документа стає інструкцією для агента', lect: ['18'] },
]

const active = ref<string | null>(null)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Дев'ять компонентів і як кожен ламається</div>
        <div class="lab__sub">
          Наведіть на плитку — з'явиться типова відмова цього компонента і лекції,
          у яких він розбирається.
        </div>
      </div>
    </div>

    <div class="sm__grid">
      <button
        v-for="p in PARTS" :key="p.id"
        class="sm__tile" :class="{ 'is-on': active === p.id }"
        @mouseenter="active = p.id" @focus="active = p.id" @click="active = p.id"
      >
        <span class="sm__name">{{ p.name }}</span>
        <span class="sm__duty">{{ p.duty }}</span>
        <span class="sm__lect">
          <i v-for="l in p.lect" :key="l">{{ l }}</i>
        </span>
      </button>
    </div>

    <div class="sm__detail" :class="{ 'is-empty': !active }">
      <template v-if="active">
        <b>Як ламається:</b>
        {{ PARTS.find((p) => p.id === active)!.breaks }}
      </template>
      <template v-else>
        Кожен компонент має власну зону відповідальності й власний спосіб відмовити.
        Одна цифра якості на виході не каже, який із дев'яти зламався.
      </template>
    </div>
  </div>
</template>

<style scoped>
.sm__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 0.5rem; }
.sm__tile {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  text-align: left;
  padding: 0.6rem 0.7rem 0.55rem;
  border: 1px solid var(--uk-line);
  border-radius: 9px;
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: all 0.16s ease;
}
.sm__tile:hover, .sm__tile.is-on {
  border-color: var(--uk-accent);
  background: var(--uk-accent-soft);
  transform: translateY(-1px);
}
.sm__name { font-size: 0.88rem; font-weight: 600; color: var(--vp-c-text-1); letter-spacing: -0.01em; }
.sm__duty { font-size: 0.76rem; line-height: 1.35; color: var(--vp-c-text-3); }
.sm__lect { display: flex; gap: 0.2rem; margin-top: 0.25rem; }
.sm__lect i {
  font-family: var(--vp-font-family-mono);
  font-style: normal;
  font-size: 0.64rem;
  padding: 0.05rem 0.28rem;
  border-radius: 3px;
  background: var(--uk-fill);
  color: var(--vp-c-text-3);
}
.sm__detail {
  margin-top: 0.85rem;
  padding: 0.7rem 0.85rem;
  border-radius: 8px;
  background: var(--uk-warm-soft);
  color: var(--uk-warm);
  font-size: 0.86rem;
  line-height: 1.55;
  min-height: 3.1rem;
  transition: background 0.2s ease, color 0.2s ease;
}
.sm__detail b { font-weight: 600; }
.sm__detail.is-empty { background: var(--uk-fill); color: var(--vp-c-text-3); }
</style>
