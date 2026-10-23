/**
 * Спільне керування покроковими візуалізаціями: «крок», «відтворити», «скинути».
 *
 * Стан за замовчуванням задає віджет (зазвичай — той, що описаний у тексті), тож
 * сторінка без жодного натискання показує ті самі числа, що й проза. Автозапуску
 * немає. Якщо користувач просить менше руху (prefers-reduced-motion), «відтворити»
 * вимикається і лишається тільки «крок».
 */
import { ref, computed, onMounted, onBeforeUnmount, type Ref } from 'vue'

export function useStepper(total: Ref<number> | (() => number), opts: { start?: number; interval?: number } = {}) {
  const last = () => (typeof total === 'function' ? total() : total.value)
  const step = ref(opts.start ?? last())
  const playing = ref(false)
  const reduced = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    reduced.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  })

  function stop() {
    playing.value = false
    if (timer) clearInterval(timer)
    timer = undefined
  }
  function next() {
    stop()
    if (step.value < last()) step.value++
  }
  function reset() {
    stop()
    step.value = 0
  }
  function play() {
    if (playing.value) return stop()
    if (reduced.value) return next()
    if (step.value >= last()) step.value = 0
    playing.value = true
    timer = setInterval(() => {
      if (step.value >= last()) stop()
      else step.value++
    }, opts.interval ?? 900)
  }
  /** Перейти до конкретного стану (наприклад, до наступної події), зупинивши відтворення. */
  function jump(to: number) {
    stop()
    step.value = Math.max(0, Math.min(last(), to))
  }

  onBeforeUnmount(stop)
  return { step, playing, reduced, next, play, reset, jump, stop, done: computed(() => step.value >= last()) }
}
