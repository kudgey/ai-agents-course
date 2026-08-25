<script setup lang="ts">
/**
 * Живий токенізатор: справжній BPE, той самий, що в моделях OpenAI.
 * Ранги важать 2.3 МБ, тому вантажаться динамічно — сторінка малюється одразу.
 */
import { ref, computed, onMounted, shallowRef } from 'vue'

const PRESETS = [
  { label: 'Українською', text: 'Асистент навчального відділу відповідає на питання студентів.' },
  { label: 'Те саме англійською', text: 'The academic office assistant answers questions from students.' },
  { label: 'Прізвище й номер', text: 'Рязановський, група КН-21, наказ № 1-476 від 12.09.2026' },
  { label: 'Код', text: 'enc = tiktoken.get_encoding("o200k_base")' },
]

const ENCODINGS = [
  { id: 'o200k_base', label: 'o200k_base · GPT-4o, GPT-5' },
  { id: 'cl100k_base', label: 'cl100k_base · GPT-4, GPT-3.5' },
]

const text = ref(PRESETS[0].text)
const encName = ref('o200k_base')
const loading = ref(true)
const error = ref('')
const encoders = shallowRef<Record<string, any>>({})

async function load(name: string) {
  if (encoders.value[name]) return
  loading.value = true
  try {
    const { Tiktoken } = await import('js-tiktoken/lite')
    const ranks = await (name === 'o200k_base'
      ? import('js-tiktoken/ranks/o200k_base')
      : import('js-tiktoken/ranks/cl100k_base'))
    encoders.value = { ...encoders.value, [name]: new Tiktoken(ranks.default) }
  } catch (e: any) {
    error.value = String(e?.message ?? e)
  } finally {
    loading.value = false
  }
}

onMounted(() => load(encName.value))

async function pickEncoding(id: string) {
  encName.value = id
  await load(id)
}

const enc = computed(() => encoders.value[encName.value])

const tokens = computed(() => {
  const e = enc.value
  if (!e || !text.value) return [] as { id: number; piece: string }[]
  try {
    return e.encode(text.value).map((id: number) => ({ id, piece: e.decode([id]) }))
  } catch {
    return []
  }
})

const stats = computed(() => {
  const chars = [...text.value].length
  const bytes = new TextEncoder().encode(text.value).length
  const n = tokens.value.length
  return {
    chars,
    bytes,
    tokens: n,
    perToken: n ? (chars / n).toFixed(2) : '—',
  }
})

/** Порівняння двох мов на одному змісті — головний висновок картки. */
const compare = computed(() => {
  const e = enc.value
  if (!e) return null
  const ua = PRESETS[0].text
  const en = PRESETS[1].text
  const nu = e.encode(ua).length
  const ne = e.encode(en).length
  return { nu, ne, ratio: (nu / ne).toFixed(2), uaChars: [...ua].length, enChars: [...en].length }
})

// стабільний колір на токен — щоб межі було видно без легенди
const HUES = [212, 28, 155, 268, 340, 190, 48, 120]
function tint(i: number, alpha = 1) {
  return `hsla(${HUES[i % HUES.length]}, 62%, 52%, ${alpha})`
}
function display(p: string) {
  return p.replace(/ /g, '␣').replace(/\n/g, '⏎')
}
</script>

<template>
  <div class="tl">
    <div class="tl__head">
      <div>
        <div class="tl__title">Токенізатор наживо</div>
        <div class="tl__sub">Справжній BPE моделей OpenAI, рахується у вашому браузері</div>
      </div>
      <div class="tl__encs">
        <button
          v-for="e in ENCODINGS"
          :key="e.id"
          class="tl__enc"
          :class="{ 'is-on': encName === e.id }"
          @click="pickEncoding(e.id)"
        >
          {{ e.label }}
        </button>
      </div>
    </div>

    <textarea v-model="text" rows="3" class="tl__input" spellcheck="false" />

    <div class="tl__presets">
      <button v-for="p in PRESETS" :key="p.label" class="tl__preset" @click="text = p.text">
        {{ p.label }}
      </button>
    </div>

    <div v-if="loading" class="tl__note">Готуємо токенізатор — 2.3 МБ рангів…</div>
    <div v-else-if="error" class="tl__note tl__note--err">Не вдалося завантажити: {{ error }}</div>

    <template v-else>
      <div class="tl__tokens">
        <span
          v-for="(t, i) in tokens"
          :key="i"
          class="tl__tok"
          :style="{ background: tint(i, 0.14), borderColor: tint(i, 0.42), color: tint(i, 1) }"
          :title="`токен #${t.id}`"
        >{{ display(t.piece) }}</span>
      </div>

      <div class="tl__stats">
        <div class="tl__stat"><b>{{ stats.tokens }}</b><span>токенів</span></div>
        <div class="tl__stat"><b>{{ stats.chars }}</b><span>символів</span></div>
        <div class="tl__stat"><b>{{ stats.bytes }}</b><span>байтів UTF-8</span></div>
        <div class="tl__stat"><b>{{ stats.perToken }}</b><span>символів на токен</span></div>
      </div>

      <div v-if="compare" class="tl__cmp">
        <div class="tl__cmp-row">
          <span class="tl__cmp-lang">українською</span>
          <div class="tl__bar"><i :style="{ width: '100%', background: 'var(--uk-warm)' }" /></div>
          <b>{{ compare.nu }}</b>
        </div>
        <div class="tl__cmp-row">
          <span class="tl__cmp-lang">англійською</span>
          <div class="tl__bar">
            <i :style="{ width: (compare.ne / compare.nu) * 100 + '%', background: 'var(--uk-accent)' }" />
          </div>
          <b>{{ compare.ne }}</b>
        </div>
        <p class="tl__cmp-note">
          Довжина в символах майже однакова — {{ compare.uaChars }} проти {{ compare.enChars }} —
          а токенів українською виходить у <b>{{ compare.ratio }}</b> раза більше. Різниця не
          косметична: вона прямо переходить у ціну запиту, у розмір KV-cache і в те, скільки
          контексту насправді поміститься у вікно.
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tl {
  border: 1px solid var(--uk-line);
  border-radius: 12px;
  padding: 1.15rem 1.25rem 1.25rem;
  margin: 1.8rem 0;
  background: var(--vp-c-bg);
}
.tl__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}
.tl__title { font-weight: 600; font-size: 1.02rem; letter-spacing: -0.01em; }
.tl__sub { font-size: 0.83rem; color: var(--vp-c-text-3); margin-top: 0.1rem; }
.tl__encs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.tl__enc {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tl__enc:hover { border-color: var(--uk-accent); color: var(--uk-accent); }
.tl__enc.is-on { background: var(--uk-accent-soft); border-color: var(--uk-accent); color: var(--uk-accent); }
.tl__input {
  width: 100%;
  font-family: var(--vp-font-family-base);
  font-size: 0.98rem;
  line-height: 1.55;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  resize: vertical;
}
.tl__input:focus { outline: none; border-color: var(--uk-accent); }
.tl__presets { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.6rem 0 0.9rem; }
.tl__preset {
  font-size: 0.78rem;
  padding: 0.25rem 0.6rem;
  border: 1px dashed var(--uk-line);
  border-radius: 999px;
  color: var(--vp-c-text-2);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tl__preset:hover { border-style: solid; border-color: var(--uk-accent); color: var(--uk-accent); }
.tl__tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 0.75rem;
  background: var(--uk-fill);
  border-radius: 8px;
  min-height: 3rem;
}
.tl__tok {
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  line-height: 1.35;
  padding: 0.12rem 0.3rem;
  border: 1px solid;
  border-radius: 4px;
  white-space: pre;
}
.tl__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.6rem;
  margin-top: 0.9rem;
}
.tl__stat {
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  text-align: center;
}
.tl__stat b {
  display: block;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--uk-accent);
}
.tl__stat span { font-size: 0.76rem; color: var(--vp-c-text-3); }
.tl__cmp { margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--uk-line); }
.tl__cmp-row { display: flex; align-items: center; gap: 0.7rem; margin: 0.35rem 0; }
.tl__cmp-lang { font-size: 0.82rem; color: var(--vp-c-text-2); width: 8.5rem; flex: none; }
.tl__bar { flex: 1; height: 12px; background: var(--uk-fill); border-radius: 999px; overflow: hidden; }
.tl__bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.4s ease; }
.tl__cmp-row b { font-family: var(--vp-font-family-mono); font-size: 0.85rem; width: 2.5rem; text-align: right; }
.tl__cmp-note { font-size: 0.86rem; line-height: 1.55; color: var(--vp-c-text-2); margin: 0.7rem 0 0; }
.tl__note { font-size: 0.86rem; color: var(--vp-c-text-3); padding: 1rem 0; }
.tl__note--err { color: var(--uk-warm); }
</style>
