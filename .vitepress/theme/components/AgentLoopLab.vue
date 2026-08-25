<script setup lang="ts">
/**
 * Цикл агента з чотирма бюджетами. Крок за кроком видно, що зупиняє агента
 * саме код, а не прохання в промпті: детектор повтору спрацьовує сам.
 */
import { ref, computed } from 'vue'

type Step = { think: string; act: string; obs: string; tokens: number; ms: number; repeat?: boolean }

const SCRIPT: Step[] = [
  { think: 'Треба знайти дату перескладання', act: 'search("перескладання лютий")', obs: '3 чанки з наказу 1-476', tokens: 18, ms: 640 },
  { think: 'Чанк неповний, уточню запит', act: 'search("наказ 1-476 строки")', obs: '2 чанки, один той самий', tokens: 24, ms: 590 },
  { think: 'Перевірю розклад на конфлікт', act: 'schedule("КН-21", "лютий")', obs: 'збігів немає', tokens: 31, ms: 720 },
  { think: 'Знайду форму заяви', act: 'search("заява на перескладання")', obs: 'порожній результат', tokens: 21, ms: 610 },
  { think: 'Спробую той самий пошук інакше', act: 'search("заява перескладання")', obs: 'порожній результат', tokens: 19, ms: 600, repeat: true },
  { think: 'Ще раз, іншими словами', act: 'search("заява на перездачу")', obs: 'порожній результат', tokens: 22, ms: 580, repeat: true },
  { think: 'І ще раз', act: 'search("бланк заяви")', obs: 'порожній результат', tokens: 20, ms: 560, repeat: true },
  { think: 'Спробую пошук ще раз', act: 'search("заява деканат")', obs: 'порожній результат', tokens: 23, ms: 570, repeat: true },
]

const maxCalls = ref(8)
const maxMs = ref(3000)
const detector = ref(true)

const at = ref(0)

const done = computed(() => SCRIPT.slice(0, at.value))
const usedMs = computed(() => done.value.reduce((s, x) => s + x.ms, 0))
const usedTokens = computed(() => done.value.reduce((s, x) => s + x.tokens, 0))
const emptyStreak = computed(() => {
  let n = 0
  for (let i = done.value.length - 1; i >= 0; i--) {
    if (done.value[i].obs === 'порожній результат') n++
    else break
  }
  return n
})

const stop = computed(() => {
  if (at.value >= SCRIPT.length) return { why: 'сценарій вичерпано', c: 'warm' }
  if (done.value.length >= maxCalls.value) return { why: `бюджет викликів: ${maxCalls.value}`, c: 'warm' }
  if (usedMs.value >= maxMs.value) return { why: `бюджет часу: ${maxMs.value} мс`, c: 'warm' }
  if (detector.value && emptyStreak.value >= 3)
    return { why: 'детектор повтору: три порожні результати поспіль', c: 'green' }
  return null
})

function step() {
  if (stop.value || at.value >= SCRIPT.length) return
  at.value++
}
function runAll() {
  while (!stop.value && at.value < SCRIPT.length) at.value++
}
function reset() { at.value = 0 }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Цикл із бюджетами</div>
        <div class="lab__sub">
          Агент шукає форму заяви, якої в корпусі немає. Дивіться, що саме його зупинить —
          і чи зупинить узагалі, якщо зняти запобіжники.
        </div>
      </div>
      <button class="lab__btn" @click="reset">Спочатку</button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Ліміт викликів <b>{{ maxCalls }}</b></span>
        <input v-model.number="maxCalls" type="range" min="2" max="12" step="1" />
      </label>
      <label class="lab__ctl">
        <span>Бюджет часу <b>{{ (maxMs / 1000).toFixed(1) }} с</b></span>
        <input v-model.number="maxMs" type="range" min="1000" max="6000" step="250" />
      </label>
      <label class="lab__ctl al__check">
        <input type="checkbox" v-model="detector" />
        <span>Детектор повтору</span>
      </label>
    </div>

    <div class="al__actions">
      <button class="lab__btn" :disabled="!!stop" @click="step">Один крок →</button>
      <button class="lab__btn" :disabled="!!stop" @click="runAll">Прогнати до зупинки</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="{ 'is-warm': done.length >= maxCalls }">
        <b>{{ done.length }}/{{ maxCalls }}</b><span>викликів</span>
      </div>
      <div class="lab__stat" :class="{ 'is-warm': usedMs >= maxMs }">
        <b>{{ (usedMs / 1000).toFixed(1) }} с</b><span>з {{ (maxMs / 1000).toFixed(1) }} с</span>
      </div>
      <div class="lab__stat"><b>{{ usedTokens }}</b><span>токенів службового обміну</span></div>
      <div class="lab__stat" :class="{ 'is-warm': emptyStreak >= 2 }">
        <b>{{ emptyStreak }}</b><span>порожніх поспіль</span>
      </div>
    </div>

    <div class="al__trace">
      <div v-for="(s, i) in done" :key="i" class="al__step" :class="{ 'is-repeat': s.repeat }">
        <span class="al__n">{{ i + 1 }}</span>
        <div>
          <div class="al__think">думка: {{ s.think }}</div>
          <code class="al__act">{{ s.act }}</code>
          <div class="al__obs" :class="{ 'is-empty': s.obs === 'порожній результат' }">
            спостереження: {{ s.obs }}
          </div>
        </div>
      </div>
      <div v-if="!done.length" class="al__idle">Натисніть «Один крок», щоб почати цикл.</div>
    </div>

    <div v-if="stop" class="al__stop" :class="'is-' + stop.c">
      <b>Цикл зупинено</b> — {{ stop.why }}.
      <template v-if="stop.c === 'green'">
        Агент віддає зібране, позначає задачу незавершеною і передає людині.
      </template>
      <template v-else>
        Зупинку дав жорсткий ліміт, а не розуміння ситуації: агент так і не зрозумів,
        що документа не існує.
      </template>
    </div>

    <p class="lab__note">
      Зніміть детектор повтору й прогоніть ще раз: агент чотири рази поспіль шукає те саме
      різними словами, поки не впреться в ліміт. Прохання «не зациклюйся» в промпті
      обмеженням не є — обмеження живе в коді циклу.
    </p>
  </div>
</template>

<style scoped>
.al__check { display: flex; align-items: center; gap: 0.45rem; align-self: end; padding-bottom: 0.3rem; }
.al__check input { accent-color: var(--uk-accent); }
.al__check span { font-size: 0.82rem; color: var(--vp-c-text-2); margin: 0 !important; }
.al__actions { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
.al__trace { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 1rem; }
.al__step {
  display: flex;
  gap: 0.6rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
}
.al__step.is-repeat { border-color: var(--uk-warm); background: var(--uk-warm-soft); }
.al__n {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  flex: none;
  padding-top: 0.15rem;
}
.al__think { font-size: 0.78rem; color: var(--vp-c-text-3); }
.al__act {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--uk-accent);
  margin: 0.15rem 0;
}
.al__obs { font-size: 0.78rem; color: var(--vp-c-text-2); }
.al__obs.is-empty { color: var(--uk-warm); }
.al__idle { font-size: 0.83rem; color: var(--vp-c-text-3); padding: 0.6rem 0; }
.al__stop { margin-top: 0.8rem; padding: 0.7rem 0.85rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.55; }
.al__stop.is-green { background: var(--uk-green-soft); color: var(--vp-c-text-2); }
.al__stop.is-green b { color: var(--uk-green); }
.al__stop.is-warm { background: var(--uk-warm-soft); color: var(--vp-c-text-2); }
.al__stop.is-warm b { color: var(--uk-warm); }
</style>
