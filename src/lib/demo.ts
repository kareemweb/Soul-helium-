/** Canned, markdown-rich replies used by demo mode. */

const quantum = `Think of a normal computer bit as a **light switch**: it is either *on* or *off*. A **qubit** is more like a dimmer dial that can rest anywhere in between — until you look at it.

## Three ideas that matter

- **Superposition** — a qubit can hold a blend of 0 and 1 at once, so many possibilities are explored together.
- **Entanglement** — two qubits can be linked so that measuring one instantly tells you about the other.
- **Interference** — algorithms nudge probabilities so wrong answers cancel out and right ones get louder.

> Quantum computers are not "faster at everything". They are astonishingly good at a *few* specific problems.

| Task | Classical | Quantum |
| --- | --- | --- |
| Everyday apps | Excellent | Not useful |
| Factoring huge numbers | Impractical | Promising |
| Simulating molecules | Very hard | Natural fit |

Want me to go deeper on any of these, or sketch a tiny circuit in code?`;

const code = `Here's a small, readable take. It counts word frequency and returns the top results.

\`\`\`python
from collections import Counter
import re

def top_words(text: str, n: int = 5) -> list[tuple[str, int]]:
    """Return the n most common words in text."""
    words = re.findall(r"[a-z']+", text.lower())
    return Counter(words).most_common(n)

print(top_words("the soul of the machine is the story it tells"))
\`\`\`

And the same idea in TypeScript:

\`\`\`typescript
export function topWords(text: string, n = 5): [string, number][] {
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z']+/g) ?? []) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n);
}
\`\`\`

A few notes:

1. \`Counter\` does the heavy lifting in Python, so it stays \`O(n)\`.
2. The regex keeps apostrophes so *don't* stays a single word.
3. Swap \`n\` for a larger number when you want a longer leaderboard.

Run it with \`python words.py\` and tell me what you'd like to extend.`;

const trip = `A gentle three days in **Kyoto**, paced so you can breathe between the wonders.

## Day 1 — Higashiyama, slow and golden
- **Morning:** Kiyomizu-dera at opening time, before the crowds arrive
- **Afternoon:** Wander Ninenzaka & Sannenzaka lanes, matcha at a tea house
- **Evening:** Gion at dusk — look for geiko hurrying to appointments

## Day 2 — Bamboo and stillness
- **Morning:** Arashiyama Bamboo Grove, then Tenryū-ji gardens
- **Afternoon:** Riverside lunch and the Togetsukyō bridge
- **Evening:** Kaiseki dinner — worth the splurge once

## Day 3 — Gates and mountains
1. Fushimi Inari at sunrise (hike past the first crowded gates)
2. Nishiki Market for tasting snacks
3. Philosopher's Path as the light turns amber

> **Tip:** Buy an IC card on arrival. Buses and trains are effortless with it.

Shall I turn this into a packing list, or adapt it for rainy weather?`;

const names = `Let's find something with *presence*. I like names that are short, sayable and a little bit alive.

## Directions to explore

- **Light & motion** — Lumen, Halo, Drift, Aurelia
- **Calm tech** — Stillwater, Quiet, Ember, Tidal
- **Invented words** — Noviq, Elara, Vessa, Orbis

| Name | Feeling | Risk |
| --- | --- | --- |
| **Halo** | Warm, protective | Often used already |
| **Noviq** | Fresh, futuristic | Needs explaining |
| **Stillwater** | Calm, trustworthy | A bit long |

My pick: **Noviq** — it's ownable, easy to say, and leaves room for a story.

Tell me about the product and who it's for, and I'll narrow this down to three finalists with taglines.`;

const hello = `Hello — I'm **SOUL**. It's good to meet you.

I can help you think, write, plan and build. Try asking me to:

- explain something complicated *simply*
- draft or polish a message
- write and explain code
- brainstorm ideas with you

What's on your mind?`;

const generic = (prompt: string) => `That's a thoughtful thing to explore. Let me turn it over for a moment.

> ${prompt.length > 140 ? prompt.slice(0, 140) + "…" : prompt}

## How I'd approach it

1. **Clarify the goal** — what would a great outcome look like for you?
2. **Break it into small steps** — momentum matters more than perfection.
3. **Test early** — a quick experiment teaches more than a long plan.

\`\`\`js
// a tiny mental model
const progress = (clarity, action) => clarity * action;
\`\`\`

I'm running in **demo mode**, so this reply is simulated. Open **Settings** to connect a real LLM endpoint and I'll answer for real.`;

export function demoReply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (/^(hi|hello|hey|yo|hola)\b/.test(p.trim()) && p.length < 30) return hello;
  if (/quantum/.test(p)) return quantum;
  if (/(code|python|function|script|react|typescript|javascript|bug|regex|api)\b/.test(p)) return code;
  if (/(trip|travel|kyoto|itinerary|vacation|plan a)/.test(p)) return trip;
  if (/(brainstorm|name|ideas|startup|brand)/.test(p)) return names;
  return generic(prompt);
}
