<script setup lang="ts">
/**
 * Косинус на скороченій матриці спільних входжень із підручника.
 * Значення 0.018 і 0.996 у таблиці лекції відтворюються цим самим розрахунком.
 */
import { ref, computed } from 'vue'

const DIMS = ['pie', 'data', 'computer']
const rows = ref([
  { word: 'cherry', v: [442, 8, 2] },
  { word: 'digital', v: [5, 1683, 1670] },
  { word: 'information', v: [5, 3982, 3325] },
])

const a = ref(0)
const b = ref(2)

const A = computed(() => rows.value[a.value])
const B = computed(() => rows.value[b.value])

const dot = computed(() => A.value.v.reduce((s, x, i) => s + x * B.value.v[i], 0))
const normA = computed(() => Math.hypot(...A.value.v))
const normB = computed(() => Math.hypot(...B.value.v))
const cos = computed(() => (normA.value && normB.value ? dot.value / (normA.value * normB.value) : 0))
const angle = computed(() => (Math.acos(Math.min(1, Math.max(-1, cos.value))) * 180) / Math.PI)

function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' млн'
  if (n >= 1e4) return Math.round(n).toLocaleString('uk-UA')
  return n.toFixed(n < 10 ? 3 : 1)
}

// два промені під обчисленим кутом — геометрія «напрямок, а не довжина»
const R = 92
const rayA = computed(() => ({ x: 120 + R, y: 110 }))
const rayB = computed(() => {
  const t = (-angle.value * Math.PI) / 180
  return { x: 120 + R * Math.cos(t), y: 110 - R * Math.sin(t) * -1 }
})
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Косинус на матриці спільних входжень</div>
        <div class="lab__sub">
          Ті самі три слова і три виміри, що в таблиці. Змініть будь-яке число — косинус
          перерахується, і стане видно, що він міряє напрямок, а не величину.
        </div>
      </div>
    </div>

    <table class="cl__matrix">
      <thead>
        <tr>
          <th>Слово</th>
          <th v-for="d in DIMS" :key="d">{{ d }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, ri) in rows" :key="r.word" :class="{ 'is-a': ri === a, 'is-b': ri === b }">
          <td>
            <code>{{ r.word }}</code>
            <button class="cl__pick" :class="{ 'is-on': ri === a }" @click="a = ri">A</button>
            <button class="cl__pick" :class="{ 'is-on': ri === b }" @click="b = ri">B</button>
          </td>
          <td v-for="(x, xi) in r.v" :key="xi">
            <input v-model.number="r.v[xi]" type="number" min="0" class="cl__cell" />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="cl__grid">
      <svg viewBox="0 0 240 180" class="cl__viz" role="img" aria-label="Кут між векторами">
        <line x1="24" y1="150" x2="228" y2="150" stroke="var(--uk-line)" stroke-width="1" />
        <line x1="24" y1="150" x2="24" y2="16" stroke="var(--uk-line)" stroke-width="1" />
        <g :transform="`translate(24 150)`">
          <line x1="0" y1="0" :x2="R" y2="0" stroke="var(--uk-accent)" stroke-width="2.5" stroke-linecap="round" />
          <line
            x1="0" y1="0"
            :x2="R * Math.cos((angle * Math.PI) / 180)"
            :y2="-R * Math.sin((angle * Math.PI) / 180)"
            stroke="var(--uk-warm)" stroke-width="2.5" stroke-linecap="round"
          />
          <path
            :d="`M 30 0 A 30 30 0 0 0 ${30 * Math.cos((angle * Math.PI) / 180)} ${-30 * Math.sin((angle * Math.PI) / 180)}`"
            fill="none" stroke="var(--vp-c-text-3)" stroke-width="1" stroke-dasharray="3 2"
          />
          <text x="38" y="-8" font-size="11" fill="var(--vp-c-text-2)">{{ angle.toFixed(1) }}°</text>
        </g>
        <text x="118" y="166" font-size="10" fill="var(--uk-accent)">A · {{ A.word }}</text>
        <text x="118" y="14" font-size="10" fill="var(--uk-warm)">B · {{ B.word }}</text>
      </svg>

      <div class="cl__calc">
        <div class="lab__row">
          <span class="lab__label">A · B</span>
          <span class="cl__eq">= {{ A.v.map((x, i) => `${x}·${B.v[i]}`).join(' + ') }}</span>
          <b class="lab__num">{{ fmt(dot) }}</b>
        </div>
        <div class="lab__row">
          <span class="lab__label">‖A‖</span>
          <span class="cl__eq">= √({{ A.v.map((x) => x + '²').join(' + ') }})</span>
          <b class="lab__num">{{ fmt(normA) }}</b>
        </div>
        <div class="lab__row">
          <span class="lab__label">‖B‖</span>
          <span class="cl__eq">= √({{ B.v.map((x) => x + '²').join(' + ') }})</span>
          <b class="lab__num">{{ fmt(normB) }}</b>
        </div>
        <div class="cl__result">
          <span>cos(A, B)</span>
          <b>{{ cos.toFixed(3) }}</b>
        </div>
        <div class="cl__meter">
          <i :style="{ width: Math.max(0, cos) * 100 + '%' }" />
        </div>
      </div>
    </div>

    <p class="lab__note">
      Помножте всі координати <code>{{ A.word }}</code> на десять — довжина вектора зросте вдесятеро,
      а косинус не зміниться на жодну соту. Саме тому векторний пошук порівнює напрямки:
      довге й коротке речення про одне й те саме мають опинитися поруч.
    </p>
  </div>
</template>

<style scoped>
.cl__matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  margin-bottom: 1.1rem;
}
.cl__matrix th {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  text-transform: none;
  letter-spacing: 0;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--uk-line);
}
.cl__matrix th:first-child { text-align: left; }
.cl__matrix td { padding: 0.28rem 0.4rem; border-bottom: 1px solid var(--uk-line); }
.cl__matrix tr.is-a code { color: var(--uk-accent); }
.cl__matrix tr.is-b code { color: var(--uk-warm); }
.cl__matrix code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  margin-right: 0.4rem;
}
.cl__pick {
  font-size: 0.66rem;
  width: 1.25rem;
  height: 1.25rem;
  line-height: 1;
  border: 1px solid var(--uk-line);
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  margin-right: 0.15rem;
}
.cl__pick.is-on { border-color: var(--uk-accent); color: var(--uk-accent); background: var(--uk-accent-soft); }
.cl__cell {
  width: 100%;
  max-width: 5.5rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  text-align: center;
  padding: 0.2rem 0.25rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--uk-fill);
  color: var(--vp-c-text-1);
}
.cl__cell:focus { outline: none; border-color: var(--uk-accent); }
.cl__grid { display: grid; grid-template-columns: minmax(200px, 260px) 1fr; gap: 1.2rem; align-items: center; }
.cl__viz { width: 100%; height: auto; }
.cl__eq {
  flex: 1;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cl__result {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 0.7rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--uk-line);
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
}
.cl__result b {
  font-family: var(--vp-font-family-mono);
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--uk-accent);
  letter-spacing: -0.02em;
}
.cl__meter { height: 8px; background: var(--uk-fill); border-radius: 999px; overflow: hidden; margin-top: 0.5rem; }
.cl__meter i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--uk-warm), var(--uk-accent));
  border-radius: 999px;
  transition: width 0.4s ease;
}
@media (max-width: 700px) {
  .cl__grid { grid-template-columns: 1fr; }
}
</style>
