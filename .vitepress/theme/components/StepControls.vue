<script setup lang="ts">
/** Кнопки покрокової візуалізації. Стан живе в useStepper, тут лише відображення. */
defineProps<{ playing: boolean; reduced: boolean; done: boolean; label?: string }>()
defineEmits<{ (e: 'step'): void; (e: 'play'): void; (e: 'reset'): void }>()
</script>

<template>
  <div class="sc">
    <button class="lab__btn" :disabled="done" @click="$emit('step')">крок →</button>
    <button
      class="lab__btn" :disabled="reduced"
      :title="reduced ? 'анімацію вимкнено налаштуванням «менше руху» — користуйтеся кнопкою «крок»' : ''"
      @click="$emit('play')"
    >{{ playing ? '❚❚ пауза' : '▶ відтворити' }}</button>
    <button class="lab__btn" @click="$emit('reset')">↺ скинути</button>
    <span v-if="label" class="sc__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.sc { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.85rem; }
.sc__label { font-size: 0.78rem; color: var(--vp-c-text-3); margin-left: 0.3rem; }
</style>
