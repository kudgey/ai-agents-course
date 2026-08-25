<script setup lang="ts">
/**
 * Checkpointer наживо: вбити процес на будь-якому вузлі й відновитися.
 * Показано те, про що мовчить слово «відновлення»: перерваний вузол
 * виконається повторно, і побічний ефект перед точкою зупинки задвоїться.
 */
import { ref, computed } from 'vue'

type Node = { id: string; name: string; effect?: string; pure: boolean }

const NODES: Node[] = [
  { id: 'plan', name: 'plan', pure: true },
  { id: 'search', name: 'search', pure: true },
  { id: 'draft', name: 'draft_answer', pure: true },
  { id: 'write', name: 'create_ticket', effect: 'створює звернення до деканату', pure: false },
  { id: 'notify', name: 'notify_user', effect: 'надсилає лист студентові', pure: false },
]

const durability = ref<'sync' | 'async'>('sync')
const killAt = ref(3)
const phase = ref<'idle' | 'crashed' | 'resumed'>('idle')

/** За відкладеного запису останній завершений крок може не потрапити у знімок. */
const savedUpTo = computed(() => {
  const completed = killAt.value // вузли 0..killAt-1 завершені
  if (durability.value === 'sync') return completed
  return Math.max(0, completed - 1)
})

const rerun = computed(() => {
  const from = savedUpTo.value
  return NODES.slice(from, killAt.value + 1)
})

const doubled = computed(() => rerun.value.filter((n) => !n.pure))

function crash() { phase.value = 'crashed' }
function resume() { phase.value = 'resumed' }
function reset() { phase.value = 'idle' }

function stateOf(i: number) {
  if (phase.value === 'idle') return i < killAt.value ? 'done' : i === killAt.value ? 'running' : 'pending'
  if (phase.value === 'crashed') {
    if (i < savedUpTo.value) return 'saved'
    if (i < killAt.value) return 'lost'
    if (i === killAt.value) return 'killed'
    return 'pending'
  }
  if (i < savedUpTo.value) return 'saved'
  if (i <= killAt.value) return 'rerun'
  return 'pending'
}

const LABEL: Record<string, string> = {
  done: 'виконано', running: 'виконується', pending: 'не дійшло',
  saved: 'у знімку', lost: 'втрачено', killed: 'обірвано', rerun: 'виконано повторно',
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Checkpointer: падіння і відновлення</div>
        <div class="lab__sub">
          Оберіть вузол, на якому вбити процес, і подивіться, що саме повториться
          після відновлення. Гарантія тут at-least-once, а не exactly-once.
        </div>
      </div>
      <button class="lab__btn" @click="reset">Спочатку</button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Вбити процес на вузлі <b>{{ NODES[killAt].name }}</b></span>
        <input v-model.number="killAt" type="range" min="0" :max="NODES.length - 1" step="1"
               @input="reset" />
      </label>
      <label class="lab__ctl">
        <span>Режим запису <b>durability = "{{ durability }}"</b></span>
        <select v-model="durability" @change="reset">
          <option value="sync">sync — знімок після кожного супер-кроку</option>
          <option value="async">async — запис відкладено</option>
        </select>
      </label>
    </div>

    <div class="gl__flow">
      <template v-for="(n, i) in NODES" :key="n.id">
        <div class="gl__node" :class="'is-' + stateOf(i)">
          <b>{{ n.name }}</b>
          <span v-if="n.effect" class="gl__effect">{{ n.effect }}</span>
          <em>{{ LABEL[stateOf(i)] }}</em>
        </div>
        <span v-if="i < NODES.length - 1" class="gl__arrow">→</span>
      </template>
    </div>

    <div class="gl__actions">
      <button class="lab__btn" :disabled="phase !== 'idle'" @click="crash">kill -9</button>
      <button class="lab__btn" :disabled="phase !== 'crashed'" @click="resume">Відновити з checkpoint</button>
    </div>

    <div v-if="phase === 'crashed'" class="gl__box is-warm">
      Процес обірвано. Останній знімок містить {{ savedUpTo }}
      {{ savedUpTo === 1 ? 'вузол' : 'вузлів' }}.
      <template v-if="durability === 'async'">
        Запис був відкладений, тому в знімок не потрапив навіть один уже завершений крок —
        саме тому для відтворюваної демонстрації беруть <code>sync</code>.
      </template>
    </div>

    <div v-if="phase === 'resumed'" class="gl__box" :class="doubled.length ? 'is-warm' : 'is-green'">
      <b>Відновлено.</b>
      Повторно виконано вузлів: {{ rerun.length }} — {{ rerun.map((n) => n.name).join(', ') }}.
      <template v-if="doubled.length">
        Серед них є вузол із побічним ефектом: <b>{{ doubled.map((n) => n.name).join(', ') }}</b>.
        Без ключа ідемпотентності {{ doubled[0].effect }} — і зробить це вдруге.
      </template>
      <template v-else>
        Усі повторені вузли чисті, тому відновлення нічого не задвоїло.
      </template>
    </div>

    <p class="lab__note">
      Правило, яке рятує лабораторну 3: побічний ефект ставлять <b>після</b> точки зупинки,
      а на сам запис вішають ключ ідемпотентності, обчислений до виклику. Протокол
      відновлення обіцяє «щонайменше один раз», і сподіватися на «рівно один» не можна.
    </p>
  </div>
</template>

<style scoped>
.gl__flow { display: flex; flex-wrap: wrap; align-items: stretch; gap: 0.35rem; margin-bottom: 1rem; }
.gl__node {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
  min-width: 8.5rem;
  flex: 1;
  transition: all 0.2s ease;
}
.gl__node b { font-family: var(--vp-font-family-mono); font-size: 0.78rem; }
.gl__effect { font-size: 0.68rem; color: var(--uk-warm); line-height: 1.3; }
.gl__node em {
  font-style: normal;
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  margin-top: 0.1rem;
}
.gl__node.is-done, .gl__node.is-saved { border-color: var(--uk-green); background: var(--uk-green-soft); }
.gl__node.is-running { border-color: var(--uk-accent); background: var(--uk-accent-soft); }
.gl__node.is-killed { border-color: var(--uk-warm); background: var(--uk-warm-soft); }
.gl__node.is-lost { border-color: var(--uk-warm); border-style: dashed; }
.gl__node.is-rerun { border-color: var(--uk-accent); background: var(--uk-accent-soft); }
.gl__node.is-pending { opacity: 0.5; }
.gl__arrow { align-self: center; color: var(--vp-c-text-3); font-size: 0.9rem; }
.gl__actions { display: flex; gap: 0.4rem; }
.gl__box {
  margin-top: 0.85rem;
  padding: 0.7rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
.gl__box.is-warm { background: var(--uk-warm-soft); }
.gl__box.is-green { background: var(--uk-green-soft); }
.gl__box b { color: var(--vp-c-text-1); }
.gl__box code { font-family: var(--vp-font-family-mono); font-size: 0.8rem; }
</style>
