<script setup lang="ts">
/**
 * Attention покроково на прозорому прикладі.
 * Ключі зроблено одиничними ортами, тому скалярний добуток дорівнює відповідній
 * координаті запиту — видно, звідки береться кожне число, без чорної скриньки.
 */
import { ref, computed } from 'vue'

const TOKENS = ['Студент', 'склав', 'іспит', 'достроково']
const AXES = ['агент', 'дія', "об'єкт", 'час']

// K — одиничні орти семантичних осей; Q — що саме шукає кожен токен
const K = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]
const Q = [
  [0.2, 0.9, 0.1, 0.0],
  [0.9, 0.2, 0.8, 0.1],
  [0.1, 0.9, 0.2, 0.3],
  [0.0, 0.8, 0.3, 0.2],
]

const dk = 4
const row = ref(2)
const causal = ref(true)
const scaled = ref(true)

const scores = computed(() =>
  Q.map((q) => K.map((k) => q.reduce((s, x, i) => s + x * k[i], 0)))
)

const scaledScores = computed(() =>
  scores.value.map((r) => r.map((v) => (scaled.value ? v / Math.sqrt(dk) : v) * 6))
)

/** маска майбутнього + softmax по рядку */
const weights = computed(() =>
  scaledScores.value.map((r, i) => {
    const masked = r.map((v, j) => (causal.value && j > i ? -Infinity : v))
    const mx = Math.max(...masked.filter((v) => isFinite(v)))
    const ex = masked.map((v) => (isFinite(v) ? Math.exp(v - mx) : 0))
    const s = ex.reduce((a, b) => a + b, 0)
    return ex.map((v) => v / s)
  })
)

const current = computed(() => weights.value[row.value])

const output = computed(() => {
  const w = current.value
  return AXES.map((_, d) => w.reduce((s, wi, i) => s + wi * K[i][d], 0))
})

function heat(v: number) {
  return `hsla(230, 68%, 54%, ${(0.06 + v * 0.88).toFixed(3)})`
}
function textOn(v: number) {
  return v > 0.55 ? '#fff' : 'var(--vp-c-text-1)'
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Attention крок за кроком</div>
        <div class="lab__sub">
          Ключі тут — одиничні орти чотирьох семантичних осей, тому скалярний добуток
          дорівнює координаті запиту. Кожне число видно від початку до кінця.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': causal }" @click="causal = !causal">
        Маска майбутнього
      </button>
      <button class="lab__pill" :class="{ 'is-on': scaled }" @click="scaled = !scaled">
        Ділити на √d<sub>k</sub>
      </button>
    </div>

    <div class="at__grid">
      <div>
        <div class="at__cap">Матриця ваг: рядок — хто дивиться, стовпець — на кого</div>
        <table class="at__heat">
          <thead>
            <tr>
              <th></th>
              <th v-for="t in TOKENS" :key="t">{{ t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in weights" :key="i" :class="{ 'is-sel': i === row }" @click="row = i">
              <th>{{ TOKENS[i] }}</th>
              <td
                v-for="(w, j) in r" :key="j"
                :style="{ background: heat(w), color: textOn(w) }"
              >{{ w < 0.005 ? '—' : w.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="at__steps">
        <div class="at__cap">
          Розбір рядка <b>{{ TOKENS[row] }}</b>
        </div>

        <div class="at__step">
          <span class="at__num">1</span>
          <div>
            <div class="at__lbl">Скалярний добуток Q·Kᵀ</div>
            <div class="at__vals">
              <code v-for="(s, j) in scores[row]" :key="j">{{ s.toFixed(2) }}</code>
            </div>
          </div>
        </div>

        <div class="at__step">
          <span class="at__num">2</span>
          <div>
            <div class="at__lbl">
              {{ scaled ? 'Поділити на √dₖ = 2' : 'Без масштабування' }}
              <em v-if="!scaled">softmax загострюється зайве</em>
            </div>
            <div class="at__vals">
              <code v-for="(s, j) in scaledScores[row]" :key="j">{{ (s / 6).toFixed(2) }}</code>
            </div>
          </div>
        </div>

        <div class="at__step">
          <span class="at__num">3</span>
          <div>
            <div class="at__lbl">
              Softmax по рядку<em v-if="causal">майбутнє закрите маскою</em>
            </div>
            <div class="at__rows">
              <div v-for="(w, j) in current" :key="j" class="lab__row">
                <span class="at__tok">{{ TOKENS[j] }}</span>
                <div class="lab__bar"><i :style="{ width: w * 100 + '%' }" /></div>
                <b class="lab__num">{{ w.toFixed(3) }}</b>
              </div>
            </div>
          </div>
        </div>

        <div class="at__step">
          <span class="at__num">4</span>
          <div>
            <div class="at__lbl">Зважена сума значень — новий вектор токена</div>
            <div class="at__out">
              <div v-for="(v, d) in output" :key="d" class="at__outcell">
                <b>{{ v.toFixed(2) }}</b>
                <span>{{ AXES[d] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="lab__note">
      Зніміть маску майбутнього — перший рядок почне дивитися вперед, і модель, навчена так,
      просто списувала б відповідь замість передбачати її. Зніміть ділення на √d<sub>k</sub> —
      softmax загострюється, майже вся вага йде одному токену, і градієнти на навчанні гаснуть.
    </p>
  </div>
</template>

<style scoped>
.at__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 1.4rem; align-items: start; }
.at__grid > div { min-width: 0; }
.at__cap { font-size: 0.78rem; color: var(--vp-c-text-3); margin-bottom: 0.45rem; }
.at__cap b { color: var(--uk-accent); font-family: var(--vp-font-family-mono); }
.at__heat { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 2px; font-size: 0.74rem; }
.at__heat th {
  font-weight: 500;
  font-size: 0.68rem;
  text-transform: none;
  letter-spacing: 0;
  color: var(--vp-c-text-3);
  padding: 0.2rem 0.15rem;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}
.at__heat td { padding: 0.32rem 0.1rem; }
.at__heat tbody th { text-align: right; }
.at__heat td {
  font-family: var(--vp-font-family-mono);
  text-align: center;
  padding: 0.32rem 0.2rem;
  border-radius: 4px;
  transition: background 0.3s ease;
}
.at__heat tbody tr { cursor: pointer; }
.at__heat tbody tr.is-sel th { color: var(--uk-accent); font-weight: 600; }
.at__heat tbody tr.is-sel td { outline: 1px solid var(--uk-accent); }
.at__steps { display: flex; flex-direction: column; gap: 0.7rem; }
.at__step { display: flex; gap: 0.6rem; align-items: flex-start; }
.at__num {
  flex: none;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: var(--uk-accent-soft);
  color: var(--uk-accent);
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.1rem;
}
.at__step > div { flex: 1; min-width: 0; }
.at__lbl { font-size: 0.8rem; color: var(--vp-c-text-2); margin-bottom: 0.3rem; }
.at__lbl em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--uk-warm);
  margin-left: 0.4rem;
}
.at__vals { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.at__vals code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  background: var(--uk-fill);
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
  color: var(--vp-c-text-2);
}
.at__rows { display: flex; flex-direction: column; gap: 0.2rem; }
.at__tok { font-size: 0.75rem; color: var(--vp-c-text-2); width: 5.2rem; flex: none; }
.at__out { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem; }
.at__outcell {
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  padding: 0.35rem 0.2rem;
  text-align: center;
}
.at__outcell b {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.88rem;
  color: var(--uk-accent);
}
.at__outcell span { font-size: 0.65rem; color: var(--vp-c-text-3); }
@media (max-width: 780px) {
  .at__grid { grid-template-columns: 1fr; }
}
</style>
