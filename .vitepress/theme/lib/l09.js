// Арифметика лекції 09: та сама, що в tools/l09_calc.py. tools/check_l09.mjs викликає ці функції
// на даних lec09.json, і l09_calc.py --check звіряє результат із власним розрахунком.

const GB = 1e9

// 2 — ключ і значення; на кожен шар, кожну KV-голову, кожен вимір голови
export const kvPerToken = (m, bytes = 2) => 2 * m.layers * m.kv_heads * m.head_dim * bytes

// пул під KV = частка пам'яті, яку бере vLLM, мінус ваги й запас; запитів — скільки цілих влазить
export function budget(d, dev, fmt, kvBytes = 2, tokens = d.request.budget) {
  const total = dev.mem_gib * d.gib
  const pool = d.util * total - fmt.bytes / GB - d.overhead
  const per = (tokens * kvPerToken(d.model, kvBytes)) / GB
  return { total, pool, per, n: Math.max(0, Math.floor(pool / per)) }
}

// нижня межа кроку декоду: прочитати ваги один раз і кеш кожного запиту батча — або порахувати, що довше
export function step(d, dev, fmt, batch, kvBytes = 2) {
  const mem = (fmt.bytes + batch * d.request.decode_ctx * kvPerToken(d.model, kvBytes)) / (dev.bw * GB)
  const flops = (2 * d.model.params * batch) / (dev.tflops * 1e12)
  return { t: Math.max(mem, flops), mem, flops }
}
