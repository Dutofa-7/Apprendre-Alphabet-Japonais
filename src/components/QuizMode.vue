<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({ quizCharacters: Array })
const emit  = defineEmits(['back'])

// Map: char → Set of all accepted romaji (primary + alts)
const charAccepted = computed(() => {
  const map = new Map()
  props.quizCharacters.forEach(({ char, romaji, alts = [] }) => {
    map.set(char, new Set([romaji, ...alts]))
  })
  return map
})

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function normalizeRomaji(str) {
  return str.toLowerCase().trim()
}

const answerInput       = ref('')
const correctCount      = ref(0)
const errorCount        = ref(0)
const currentCoords     = ref({ row: 0, col: 0 })
const quizLayout        = ref([]) // 2D array of { char, state }
const inputRef          = ref(null)

function buildLayout() {
  const shuffled = shuffle(props.quizCharacters.map(item => item.char))
  const layout = []
  let row = []
  shuffled.forEach((char, index) => {
    row.push({ char, state: 'idle' })
    if (row.length === 5 || index === shuffled.length - 1) {
      layout.push(row)
      row = []
    }
  })
  return layout
}

function currentCell() {
  const { row, col } = currentCoords.value
  return quizLayout.value[row]?.[col]
}

function selectCell(row, col) {
  const target = quizLayout.value[row]?.[col]
  if (!target || target.state === 'correct') return

  const prev = currentCell()
  if (prev && prev.state === 'selected') prev.state = 'idle'

  target.state = 'selected'
  currentCoords.value = { row, col }
  nextTick(() => inputRef.value?.focus())
}

function getNextCoords() {
  let { row, col } = currentCoords.value
  col++
  if (col >= quizLayout.value[row].length) {
    row++
    col = 0
    if (row >= quizLayout.value.length) return null
  }
  return { row, col }
}

function initQuiz() {
  quizLayout.value    = buildLayout()
  correctCount.value  = 0
  errorCount.value    = 0
  answerInput.value   = ''
  currentCoords.value = { row: 0, col: 0 }
  quizLayout.value[0][0].state = 'selected'
  nextTick(() => inputRef.value?.focus())
}

function onInput() {
  const answer = normalizeRomaji(answerInput.value)
  if (!answer) return

  const cell = currentCell()
  if (!cell || cell.state !== 'selected') return

  const accepted = charAccepted.value.get(cell.char)
  if (!accepted) return

  const isCorrect       = accepted.has(answer)
  const isStillPossible = [...accepted].some(r => r.startsWith(answer))

  if (isCorrect) {
    cell.state = 'correct'
    correctCount.value++
    answerInput.value = ''

    const next = getNextCoords()
    if (next === null) {
      setTimeout(showQuizEnd, 300)
    } else {
      selectCell(next.row, next.col)
    }
  } else if (!isStillPossible) {
    errorCount.value++
    answerInput.value = ''
    cell.state = 'incorrect'
    setTimeout(() => {
      cell.state = 'selected'
      inputRef.value?.focus()
    }, 500)
  }
}

function showQuizEnd() {
  const total      = props.quizCharacters.length
  const percentage = Math.round((correctCount.value / total) * 100)
  const message    = `Quiz terminé!\n\nCorrect: ${correctCount.value}/${total}\nErreurs: ${errorCount.value}\n\nPourcentage: ${percentage}%`
  if (confirm(message + '\n\nVoulez-vous recommencer?')) {
    emit('back')
  }
}

onMounted(initQuiz)
</script>

<template>
  <div>
    <div class="quiz-header">
      <div class="progress">
        <span>{{ Math.min(correctCount + 1, quizCharacters.length) }}</span>
        /
        <span>{{ quizCharacters.length }}</span>
      </div>
      <button class="back-btn" @click="$emit('back')">← Retour</button>
    </div>

    <div class="quiz-container">
      <div class="quiz-input-section">
        <label>Prononciation romaji :</label>
        <input
          ref="inputRef"
          type="text"
          v-model="answerInput"
          @input="onInput"
          placeholder="Entrez la prononciation"
          autocomplete="off"
        />
      </div>

      <div class="quiz-grid">
        <template v-for="(rowItems, rowIndex) in quizLayout" :key="rowIndex">
          <div
            v-for="(item, colIndex) in rowItems"
            :key="colIndex"
            class="quiz-cell"
            :class="item.state !== 'idle' ? item.state : ''"
            @click="selectCell(rowIndex, colIndex)"
          >{{ item.char }}</div>
        </template>
      </div>

      <div class="stats">
        <span>Correct : <strong>{{ correctCount }}</strong></span>
        <span>Erreurs : <strong>{{ errorCount }}</strong></span>
      </div>
    </div>
  </div>
</template>
