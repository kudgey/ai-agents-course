<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{ src: string; alt?: string; mobile?: string }>()

// Сайт може жити в підкаталозі (GitHub Pages), тому абсолютний шлях
// до картинки треба пропустити через withBase, інакше буде 404.
const href = computed(() => withBase(props.src))
// Широка схема на 375 px стискається до 288 px, і підписи в ній стають
// нечитабельними. Якщо поруч лежить вертикальна версія, на вузькому екрані
// показуємо її; збільшення за кліком завжди відкриває повну.
const mobileHref = computed(() => (props.mobile ? withBase(props.mobile) : null))

const zoomed = ref<string | null>(null)

function open(src: string) {
  zoomed.value = src
  document.addEventListener('keydown', onKey)
}
function close() {
  zoomed.value = null
  document.removeEventListener('keydown', onKey)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <figure class="uk-figure">
    <div class="uk-figure__frame" @click="open(href)" :title="'Збільшити: ' + (alt || '')">
      <picture>
        <source v-if="mobileHref" :srcset="mobileHref" media="(max-width: 720px)" />
        <img :src="href" :alt="alt" loading="lazy" />
      </picture>
    </div>
    <figcaption class="uk-figure__caption">
      <slot />
    </figcaption>
  </figure>

  <Teleport to="body">
    <div v-if="zoomed" class="uk-lightbox" @click="close">
      <img :src="zoomed" :alt="alt" />
    </div>
  </Teleport>
</template>
