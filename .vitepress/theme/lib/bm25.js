/**
 * BM25 у записі розділу 11 Jurafsky і Martin, з натуральним логарифмом — так само, як
 * генератор лекції 06 рахує ручний приклад. Чиста функція без Vue: її імпортує SearchLab,
 * а gen_lec06_toy.py --check викликає її через node і звіряє з Python.
 */

/** Як re.split(r"[^\w]+", s.lower()) у Python: нижній регістр, розбиття за не-словесними символами. */
export function tokenize(s) {
  return s.toLowerCase().split(/[^\p{L}\p{N}_]+/u).filter(Boolean)
}

export function buildIndex(texts) {
  const docs = texts.map(tokenize)
  const N = docs.length
  const avg = docs.reduce((s, d) => s + d.length, 0) / N
  const df = (t) => docs.filter((d) => d.includes(t)).length
  return { docs, N, avg, df }
}

/** Частка насичення tf / (k₁(1 − b + b·|d|/avg) + tf) — дріб із формули BM25. */
export function share(tf, len, avg, k1, b) {
  return tf ? tf / (k1 * (1 - b + (b * len) / avg) + tf) : 0
}

/** Скор кожного документа і внесок кожного терма запиту. */
export function score(index, query, k1, b) {
  const terms = tokenize(query)
  return index.docs.map((d, i) => {
    const parts = terms.map((t) => {
      const tf = d.filter((x) => x === t).length
      const n = index.df(t)
      const idf = n ? Math.log(index.N / n) : 0
      const sh = share(tf, d.length, index.avg, k1, b)
      return { t, tf, df: n, idf, share: sh, v: idf * sh }
    })
    return { i, len: d.length, parts, score: parts.reduce((s, p) => s + p.v, 0) }
  })
}
