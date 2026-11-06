<script setup lang="ts">
/**
 * Промпт кроку переписування запиту, який стоїть поруч із кодом розділу 2 лекції 08.
 * Текст — examples/prompts/l08_rewrite.txt через lec08.json.
 */
import data from '../../data/lec08.json'

const PARTS = ['is-sys', 'is-rule', 'is-doc']
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Промпт для переписування запиту</div>
        <div class="lab__sub">
          Кольори — ролі частин: <span class="rp__k is-sys">роль</span> <span class="rp__k is-rule">правила</span>
          <span class="rp__k is-doc">формат</span> <span class="rp__k is-q">питання</span>.
        </div>
      </div>
    </div>
    <div class="rp__msg"><div class="rp__role">system</div>
      <pre v-for="(p, i) in data.prompt" :key="i" class="rp__part" :class="PARTS[i]">{{ p }}</pre>
    </div>
    <div class="rp__msg"><div class="rp__role">user</div><pre class="rp__part is-q">{{ data.presets[0] }}</pre></div>
  </div>
</template>

<style scoped>
.rp__msg { border: 1px solid var(--uk-line); border-radius: 10px; padding: 0.6rem 0.7rem 0.7rem; margin-bottom: 0.7rem; }
.rp__msg:last-child { margin-bottom: 0; }
.rp__role { font-family: var(--vp-font-family-mono); font-size: 0.7rem; color: var(--vp-c-text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.35rem; }
.is-sys { --c: #2E6B4F; --s: #e2f0e9; } .is-rule { --c: #7A4BB0; --s: #efe7f8; } .is-doc { --c: #55556A; --s: #f1f1f6; } .is-q { --c: #3D4EC4; --s: #e5e8fa; }
.dark .is-sys { --s: #1f3a2d; } .dark .is-rule { --s: #34264a; } .dark .is-doc { --s: #2d2d36; } .dark .is-q { --s: #2b3160; }
.rp__part { margin: 0.3rem 0 0; padding: 0.55rem 0.7rem; border-left: 3px solid var(--c); background: var(--s); border-radius: 6px; font-family: var(--vp-font-family-mono); font-size: 0.76rem; line-height: 1.55; white-space: pre-wrap; color: var(--vp-c-text-1); }
.rp__k { padding: 0 0.35rem; border-radius: 4px; font-weight: 600; font-size: 0.78rem; background: var(--s); color: var(--c); }
</style>
