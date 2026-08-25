---
title: Про курс
outline: [2, 2]
---

# Про курс

Магістерський курс кафедри штучного інтелекту КПІ ім. Ігоря Сікорського,
спеціальність 122 «Комп'ютерні науки», освітня програма «Системи і методи штучного інтелекту».
Обсяг — 120 годин, 4 кредити ЄКТС: 36 годин лекцій, 18 годин лабораторних, 66 годин
самостійної роботи. Семестровий контроль — залік і модульна контрольна робота.

[Силабус у PDF](/Силабус_Прикладні_ШІ-агенти_2026.pdf)

## Логіка курсу

Курс побудований як одна історія, а не як набір тем. Він починається з того, що модель —
це стек блоків Transformer, який повертає розподіл над наступним токеном, і закінчується
доказом, що зібрана навколо неї система витримує навантаження й недовірений вхід.

| Блок | Питання, на яке відповідає | Лекції |
|---|---|---|
| A | що модель обчислює і як зробити її відповідь придатною для коду | 1–5 |
| B | звідки береться знання, якого немає у вагах | 6–8 |
| C | де це виконується і скільки коштує | 9–10 |
| D | як перетворити виклик моделі на керований цикл | 11–15 |
| E | коли потрібен другий агент, чим доводити якість і що ламається | 16–18 |

## Наскрізний приклад

Через усі вісімнадцять лекцій проходить одна система — **асистент навчального відділу**.
Він відповідає на питання студентів за документами факультету, перевіряє розклад і створює
звернення до деканату. У лекції 5 він стає типізованим клієнтом, у 7 отримує пошук по
документах, у 11 — цикл із бюджетами, у 14 — пам'ять, у 18 — його атакують непрямою
ін'єкцією і дивляться, що встояло.

## Звідки взято ілюстрації

Пріоритет — готові схеми з першоджерел; власні намальовано лише там, де готового аналога
немає. Під кожною зовнішньою ілюстрацією стоїть посилання на джерело.

| Джерело | Що взято |
|---|---|
| [Anthropic, Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) | розширена LLM, цикл агента, патерни воркфлоу |
| [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | калібрування системного промпта |
| [Jay Alammar, The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) | Q/K/V, ваги attention, логіти → softmax |
| [Wikimedia Commons](https://commons.wikimedia.org/) | архітектура Transformer, GPT, схема RAG |
| [Sebastian Raschka, LLMs from Scratch](https://github.com/rasbt/LLMs-from-scratch) | конвеєр входу, таблиця embeddings |
| [Hugging Face, Illustrating RLHF](https://huggingface.co/blog/rlhf) | передтренування, reward-модель, цикл RLHF |
| [Gao та ін., RAG Survey](https://arxiv.org/abs/2312.10997) | конвеєр RAG, три покоління |
| [Rafailov та ін., DPO](https://arxiv.org/abs/2305.18290) | RLHF проти DPO |

Власні схеми курсу відкриті за ліцензією CC BY 4.0:
[github.com/kudgey/ai-agents-course-figures](https://github.com/kudgey/ai-agents-course-figures).

## Як улаштований цей сайт

Джерело курсу одне — вісімнадцять файлів розмітки. З них складається і ця сторінка,
і колоди у Gamma, тому розійтися вони не можуть.

Інтерактивні вставки рахують усе **у браузері**, без сервера й без ключів API: токенізатор
працює на справжніх рангах BPE, довірчі інтервали й пам'ять KV-cache рахуються тими самими
формулами, що стоять на слайдах. Блоки з позначкою **«Результат виконання»** справді
запускали — це фактичний вивід, а не переказ.

Клавіша <kbd>P</kbd> вмикає режим презентації: більший шрифт, приховані панелі.

## Основна література

1. Jurafsky D., Martin J. H. [Speech and Language Processing](https://web.stanford.edu/~jurafsky/slp3/), 3rd ed. draft, 2026.
2. Xiao T., Zhu J. [Foundations of Large Language Models](https://arxiv.org/abs/2501.09223). arXiv:2501.09223, 2025.
3. Raschka S. [Build a Large Language Model (From Scratch)](https://github.com/rasbt/LLMs-from-scratch). Manning, 2024.
4. Vaswani A. et al. [Attention Is All You Need](https://arxiv.org/abs/1706.03762). NeurIPS, 2017.
5. Офіційна документація: [Model Context Protocol](https://modelcontextprotocol.io/), [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview), [vLLM](https://docs.vllm.ai/), [Hugging Face Transformers](https://huggingface.co/docs/transformers).

Повні списки джерел — наприкінці кожної лекції, поруч із темою, якої вони стосуються.
