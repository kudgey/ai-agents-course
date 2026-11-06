<script setup lang="ts">
/**
 * Faithfulness на трьох прикладах відповіді: твердження звіряються з top-5 чанків питання q01.
 * Вердикти рахує l08_eval.py (рядок-доказ є в поданому чанку); тут лише показ.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec08.json'

const F = data.faith
const LABELS: Record<string, string> = { ok: 'усе підтверджено', partial: 'одне твердження вигадане', foreign: 'число з іншого документа' }
const id = ref('partial')
const cur = computed(() => F.find((f) => f.id === id.value)!)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Відповідь, твердження, вердикт</div>
        <div class="lab__sub">Відповідь розкладено на твердження, і кожне звірено з п'ятьма поданими чанками. Відповіді складено вручну.</div>
      </div>
    </div>
    <div class="lab__pills">
      <button v-for="f in F" :key="f.id" class="lab__pill" :class="{ 'is-on': id === f.id }" @click="id = f.id">{{ LABELS[f.id] }}</button>
    </div>
    <p class="ff__answer">{{ cur.answer }}</p>
    <div v-for="c in cur.claims" :key="c.text" class="ff__claim" :class="c.chunk_id ? 'is-ok' : 'is-no'">
      <b>{{ c.chunk_id ? '✓' : '✕' }}</b>
      <span>{{ c.text }}<small>{{ c.chunk_id ? `«${c.evidence}» є в ${c.chunk_id}` : `«${c.evidence}» немає в жодному з п'яти чанків` }}</small></span>
    </div>
    <div class="lab__stats">
      <div class="lab__stat" :class="cur.ok === cur.of ? 'is-green' : 'is-warm'"><b>F = {{ cur.ok }}/{{ cur.of }}</b><span>підтверджено тверджень: {{ cur.ok }} з {{ cur.of }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.lab__pill.is-on { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); font-weight: 600; }
.ff__answer { margin: 0.7rem 0; font-size: 0.86rem; line-height: 1.5; }
.ff__claim { display: flex; gap: 0.6rem; align-items: baseline; padding: 0.4rem 0.6rem; border-radius: 7px; margin-bottom: 0.35rem; font-size: 0.82rem; }
.ff__claim small { display: block; font-size: 0.72rem; color: var(--vp-c-text-2); }
.ff__claim.is-ok { background: var(--uk-accent-soft); }
.ff__claim.is-no { background: var(--uk-warm-soft); }
</style>
