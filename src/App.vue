<script setup>
import { ref } from 'vue'
import SelectionMode   from './components/SelectionMode.vue'
import QuizMode        from './components/QuizMode.vue'
import KanjiQuizMode   from './components/KanjiQuizMode.vue'

const TYPES = [
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
  { value: 'kanji',    label: 'Kanji' },
]

const currentType    = ref('hiragana')
const quizStarted    = ref(false)
const quizCharacters = ref([])

function selectType(type) {
  currentType.value    = type
  quizStarted.value    = false
  quizCharacters.value = []
}

function startQuiz(characters) {
  quizCharacters.value = characters
  quizStarted.value    = true
}

function backToSelection() {
  quizStarted.value    = false
  quizCharacters.value = []
}
</script>

<template>
  <div class="container">
    <h1>Quiz Hiragana / Katakana / Kanji</h1>

    <div class="type-selector">
      <button
        v-for="t in TYPES"
        :key="t.value"
        class="type-btn"
        :class="{ active: currentType === t.value }"
        @click="selectType(t.value)"
      >{{ t.label }}</button>
    </div>

    <SelectionMode
      v-if="!quizStarted"
      :currentType="currentType"
      @start-quiz="startQuiz"
    />

    <KanjiQuizMode
      v-else-if="currentType === 'kanji'"
      :quizCharacters="quizCharacters"
      @back="backToSelection"
    />

    <QuizMode
      v-else
      :quizCharacters="quizCharacters"
      @back="backToSelection"
    />
  </div>
</template>
