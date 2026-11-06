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

/** Лекція 08. Грубе обрізання закінчень: та сама регулярка, що в tools/l08_eval.py. */
const ENDINGS = /(ого|ому|ими|ями|ами|ові|еві|ої|ою|ій|ий|ім|их|ах|ях|ів|ям|ам|ом|ем|ею|а|я|у|ю|і|и|е|о|ь)$/
export const endings = ENDINGS.source
export function stem(w) {
  return w.length >= 5 && /^[а-щьюяіїєґ]+$/.test(w) ? w.replace(ENDINGS, '') : w
}
export const tokenizeStem = (s) => tokenize(s).map(stem)

/** Видача BM25 як у l08_eval.py: кожен терм запиту один раз, чанк без спільних слів не входить. */
export function rank(question, chunks, T = tokenize, k1 = 1.5, b = 0.75) {
  const docs = chunks.map((c) => T(c.text))
  const n = docs.length
  const avg = docs.reduce((s, d) => s + d.length, 0) / n
  const terms = [...new Set(T(question))]
  const out = chunks.map((c, i) => {
    let s = 0
    for (const t of terms) {
      const df = docs.filter((d) => d.includes(t)).length
      const tf = docs[i].filter((x) => x === t).length
      if (df && tf) s += Math.log(n / df) * share(tf, docs[i].length, avg, k1, b)
    }
    return { chunk_id: c.chunk_id, score: s }
  })
  return out.filter((r) => r.score > 0).sort((x, y) => y.score - x.score)
}

/** Reciprocal Rank Fusion: сума 1/(k + ранг) по списках; ranks — місця чанка в кожному списку. */
export function rrf(lists, k = 60) {
  const m = new Map()
  lists.forEach((ls, j) => ls.forEach((r, i) => {
    const e = m.get(r.chunk_id) ?? { chunk_id: r.chunk_id, score: 0, ranks: lists.map(() => null) }
    e.score += 1 / (k + i + 1)
    e.ranks[j] = i + 1
    m.set(r.chunk_id, e)
  }))
  return [...m.values()].sort((x, y) => y.score - x.score)
}
