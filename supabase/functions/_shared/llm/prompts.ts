/**
 * Extra rule listing what the course already has, so a new round asks about
 * other things. Empty for the first round.
 */
export function avoidRule(avoid: string[], what: "questions" | "flashcards"): string {
  if (!avoid.length) return ""
  const label = what === "questions" ? "ces questions déjà posées" : "ces flashcards déjà créées"
  const list = avoid.map((a) => `  • ${a}`).join("\n")
  return `
- Ne reprends AUCUNE de ${label}, même reformulée : couvre d'autres notions du cours, ou la même notion sous un autre angle
${list}`
}

/**
 * How many questions of each kind to ask for. One passage (a short text with
 * 2-3 questions) from 6 questions up; the rest is a mix led by classic QCM.
 */
export function quizMix(n: number) {
  const passageQuestions = n >= 6 ? Math.min(3, Math.floor(n / 4)) : 0
  const rest = n - passageQuestions
  const multiple = Math.round(rest * 0.2)
  const trueFalse = Math.round(rest * 0.1)
  const written = Math.round(rest * 0.15) // short answers and cloze sentences
  const order = rest >= 6 ? 1 : 0
  const single = Math.max(1, rest - multiple - trueFalse - written - order)
  return { single, multiple, trueFalse, written, order, passageQuestions }
}

export function quizPrompt(n: number, courseText: string, avoid: string[] = []): string {
  const mix = quizMix(n)
  const passageRule = mix.passageQuestions
    ? `- 1 passage : un court texte (60 à 150 mots) tiré du cours ou un petit cas pratique inventé à partir du cours, suivi de ${mix.passageQuestions} questions qui ne se répondent qu'en le lisant (types single, multiple, true_false ou short)`
    : "- Aucun passage : \"passages\" est un tableau vide"
  return `Tu es un générateur de quiz pédagogique. À partir du texte de cours suivant, génère des questions variées.

Répartition demandée (adapte si le cours ne s'y prête pas, en remplaçant par des questions "single") :
- ${mix.single} questions "single" : 4 options, une seule correcte
- ${mix.multiple} questions "multiple" : 4 ou 5 options, 2 ou 3 correctes (dis-le dans la question, ex. « Lesquelles… ? (plusieurs réponses) »)
- ${mix.trueFalse} questions "true_false" : une affirmation, vraie ou fausse
- ${mix.written} questions "short" ou "cloze" : réponse écrite très courte (1 à 3 mots, un nombre, un sigle). Pour "cloze", la question est une phrase avec exactement un trou noté ___
- ${mix.order} question "order" : 3 à 6 éléments à remettre dans l'ordre (étapes, chronologie, couches…)
${passageRule}

Règles :
- Rédige tout dans la langue du cours
- Teste la compréhension, pas seulement la mémorisation
- Options toutes différentes ; varie la position des bonnes réponses
- Pour "short" et "cloze", donne dans "answers" toutes les variantes acceptables (sigle, nom complet, chiffre en lettres…)
- Pour "order", donne "items" DANS LE BON ORDRE (l'application les mélangera)
- Ajoute une courte explication (1-2 phrases) à chaque question
- Le texte peut contenir des coupures marquées [...] : ignore-les${avoidRule(avoid, "questions")}
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant/après, au format :
{
  "questions": [
    { "type": "single", "question": "...", "options": ["...", "...", "...", "..."], "answer_index": 0, "explication": "..." },
    { "type": "multiple", "question": "...", "options": ["...", "...", "...", "...", "..."], "answer_indexes": [0, 3], "explication": "..." },
    { "type": "true_false", "question": "Affirmation...", "answer": true, "explication": "..." },
    { "type": "short", "question": "...", "answers": ["...", "variante"], "explication": "..." },
    { "type": "cloze", "question": "Phrase avec un ___ à compléter.", "answers": ["mot"], "explication": "..." },
    { "type": "order", "question": "Remets dans l'ordre : ...", "items": ["premier", "deuxième", "troisième"], "explication": "..." }
  ],
  "passages": [
    { "text": "Le texte à lire...", "questions": [ { "type": "single", "question": "...", "options": ["...", "...", "...", "..."], "answer_index": 1, "explication": "..." } ] }
  ]
}

Texte du cours :
${courseText}`
}

export function flashcardPrompt(n: number, courseText: string, avoid: string[] = []): string {
  return `Tu es un générateur de flashcards de révision. À partir du texte de cours suivant, génère ${n} flashcards (recto = question/concept court, verso = réponse/définition claire).

Règles :
- Rédige les flashcards dans la langue du cours
- Recto court et précis (une question ou un terme clé)
- Verso concis mais complet (pas de blabla)
- Le texte peut contenir des coupures marquées [...] : ignore-les${avoidRule(avoid, "flashcards")}
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant/après, au format :
{
  "flashcards": [
    { "recto": "...", "verso": "..." }
  ]
}

Texte du cours :
${courseText}`
}
