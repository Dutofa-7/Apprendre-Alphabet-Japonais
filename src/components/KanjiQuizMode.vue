<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({ quizCharacters: Array })
const emit  = defineEmits(['back'])

const phase    = ref('settings') // 'settings' | 'quiz'
const quizMode = ref('all')      // 'all' | 'one'

const quizItems    = ref([])
const currentIndex = ref(0)
const currentInput = ref('')
const errorCount   = ref(0)
const inputRef     = ref(null)

const currentItem = computed(() => quizItems.value[currentIndex.value])

function normalizeRomaji(str) {
  return str.toLowerCase().trim()
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQuizItems() {
  return shuffle([...props.quizCharacters]).map(({ char, romaji, alts = [] }) => {
    const readings = [romaji, ...alts]
    return {
      char,
      readings,
      found: [],
      slots: readings.map((_, i) => ({
        state: i === 0 ? 'active' : 'pending',
        value: '',
      })),
    }
  })
}

function startQuiz() {
  quizItems.value    = buildQuizItems()
  currentIndex.value = 0
  currentInput.value = ''
  errorCount.value   = 0
  phase.value        = 'quiz'
  nextTick(() => inputRef.value?.focus())
}

function onInput(value) {
  currentInput.value = value
  if (!value) return

  const item      = currentItem.value
  const answer    = normalizeRomaji(value)
  const remaining = item.readings.filter(r => !item.found.includes(r))

  const isCorrect       = remaining.includes(answer)
  const isStillPossible = remaining.some(r => r.startsWith(answer))

  if (isCorrect) {
    const activeSlot = item.slots.find(s => s.state === 'active')
    if (activeSlot) {
      activeSlot.state = 'found'
      activeSlot.value = answer
    }
    item.found.push(answer)
    currentInput.value = ''

    const allFound      = item.found.length === item.readings.length
    const shouldAdvance = quizMode.value === 'one' || allFound

    if (shouldAdvance) {
      // Mark remaining slots as skipped in 'one' mode
      if (!allFound) {
        item.slots.forEach(s => { if (s.state !== 'found') s.state = 'skipped' })
      }
      setTimeout(nextKanji, 500)
    } else {
      const nextSlot = item.slots.find(s => s.state === 'pending')
      if (nextSlot) nextSlot.state = 'active'
      nextTick(() => inputRef.value?.focus())
    }
  } else if (!isStillPossible) {
    errorCount.value++
    currentInput.value = ''

    const activeSlot = item.slots.find(s => s.state === 'active')
    if (activeSlot) {
      activeSlot.state = 'incorrect'
      setTimeout(() => {
        activeSlot.state = 'active'
        inputRef.value?.focus()
      }, 500)
    }
    nextTick(() => inputRef.value?.focus())
  }
}

function skipKanji() {
  const item = currentItem.value
  item.slots.forEach(s => { if (s.state !== 'found') s.state = 'skipped' })
  errorCount.value++
  currentInput.value = ''
  setTimeout(nextKanji, 300)
}

function nextKanji() {
  if (currentIndex.value >= quizItems.value.length - 1) {
    showQuizEnd()
  } else {
    currentIndex.value++
    currentInput.value = ''
    nextTick(() => inputRef.value?.focus())
  }
}

function showQuizEnd() {
  const total   = quizItems.value.length
  const message = `Quiz terminé !\n\n${total} kanji parcourus\nErreurs : ${errorCount.value}`
  if (confirm(message + '\n\nVoulez-vous recommencer ?')) {
    emit('back')
  }
}
</script>

<template>
  <!-- Écran de paramètres -->
  <div v-if="phase === 'settings'" class="kanji-settings">
    <h2>Mode du quiz Kanji</h2>
    <p class="settings-subtitle">{{ quizCharacters.length }} kanji sélectionnés</p>

    <div class="mode-options">
      <label class="mode-option" :class="{ active: quizMode === 'all' }">
        <input type="radio" v-model="quizMode" value="all" />
        <div class="mode-option-text">
          <strong>Toutes les prononciations</strong>
          <span>Trouvez chaque prononciation avant de passer au suivant</span>
        </div>
      </label>
      <label class="mode-option" :class="{ active: quizMode === 'one' }">
        <input type="radio" v-model="quizMode" value="one" />
        <div class="mode-option-text">
          <strong>Une prononciation suffit</strong>
          <span>Dès qu'une est reconnue, on passe au kanji suivant</span>
        </div>
      </label>
    </div>

    <div class="mode-actions">
      <button class="action-btn primary" @click="startQuiz">Commencer</button>
      <button class="back-btn" style="align-self: center" @click="$emit('back')">← Retour</button>
    </div>
  </div>

  <!-- Quiz -->
  <div v-else class="kanji-quiz">
    <div class="quiz-header">
      <div class="progress">
        Kanji {{ currentIndex + 1 }} / {{ quizItems.length }}
      </div>
      <button class="back-btn" @click="$emit('back')">← Retour</button>
    </div>

    <!-- Kanji affiché -->
    <div class="kanji-display">{{ currentItem.char }}</div>

    <!-- Slots de prononciations -->
    <div class="pronunciation-slots">
      <div
        v-for="(slot, i) in currentItem.slots"
        :key="i"
        class="pron-slot"
        :class="slot.state"
      >
        <span v-if="slot.state === 'found'">{{ slot.value }}</span>
        <span v-else-if="slot.state === 'active'" class="slot-typing">
          {{ currentInput || '…' }}
        </span>
        <span v-else>—</span>
      </div>
    </div>

    <!-- Champ de saisie -->
    <div class="quiz-input-section">
      <label>Prononciation romaji :</label>
      <input
        ref="inputRef"
        type="text"
        :value="currentInput"
        @input="onInput($event.target.value)"
        placeholder="Entrez une prononciation"
        autocomplete="off"
      />
    </div>

    <div class="quiz-actions">
      <button class="skip-btn" @click="skipKanji">Passer →</button>
    </div>

    <div class="stats">
      <span>Erreurs : <strong>{{ errorCount }}</strong></span>
    </div>
  </div>
</template>

<style scoped>
/* ── Paramètres ── */
.kanji-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-subtitle {
  color: #888;
  margin-top: -12px;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  border: 2px solid #ddd;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-option:hover        { border-color: #667eea; }
.mode-option.active       { border-color: #667eea; background: #f0f3ff; }

.mode-option input[type="radio"] {
  margin-top: 4px;
  accent-color: #667eea;
  flex-shrink: 0;
}

.mode-option-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-option-text strong { font-size: 1em; }
.mode-option-text span   { font-size: 0.85em; color: #777; }

/* ── Quiz ── */
.kanji-quiz {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.kanji-display {
  text-align: center;
  font-size: 9em;
  line-height: 1;
  color: #333;
  padding: 10px 0;
}

.pronunciation-slots {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 320px;
  margin: 0 auto;
  width: 100%;
}

.pron-slot {
  padding: 12px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1.15em;
  text-align: center;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: white;
}

.pron-slot.found     { border-color: #4caf50; background: #e8f5e9; color: #2e7d32; font-weight: 600; }
.pron-slot.active    { border-color: #667eea; background: #f0f3ff; color: #667eea; }
.pron-slot.pending   { opacity: 0.35; }
.pron-slot.skipped   { opacity: 0.2; }
.pron-slot.incorrect { border-color: #f44336; background: #ffebee; animation: shake 0.4s ease; }

.slot-typing { font-style: italic; }

.quiz-actions {
  display: flex;
  justify-content: center;
}

.skip-btn {
  padding: 8px 24px;
  background: transparent;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  color: #999;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
</style>
