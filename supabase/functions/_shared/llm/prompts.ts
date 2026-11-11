export function quizPrompt(n: number, courseText: string): string {
  return `Tu es un générateur de quiz pédagogique. À partir du texte de cours suivant, génère ${n} questions à choix multiples (QCM).

Règles :
- Rédige les questions dans la langue du cours
- Chaque question doit tester la compréhension, pas juste la mémorisation pure
- Exactement 4 options par question, toutes différentes, une seule correcte
- "bonne_reponse_index" est la position (0, 1, 2 ou 3) de l'option correcte dans "options"
- Varie la position de la bonne réponse d'une question à l'autre
- Ajoute une courte explication (1-2 phrases) justifiant la bonne réponse
- Le texte peut contenir des coupures marquées [...] : ignore-les
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant/après, au format :
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "bonne_reponse_index": 0,
      "explication": "..."
    }
  ]
}

Texte du cours :
${courseText}`
}

export function flashcardPrompt(n: number, courseText: string): string {
  return `Tu es un générateur de flashcards de révision. À partir du texte de cours suivant, génère ${n} flashcards (recto = question/concept court, verso = réponse/définition claire).

Règles :
- Rédige les flashcards dans la langue du cours
- Recto court et précis (une question ou un terme clé)
- Verso concis mais complet (pas de blabla)
- Le texte peut contenir des coupures marquées [...] : ignore-les
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant/après, au format :
{
  "flashcards": [
    { "recto": "...", "verso": "..." }
  ]
}

Texte du cours :
${courseText}`
}
