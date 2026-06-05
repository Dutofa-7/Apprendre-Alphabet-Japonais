<script setup>
import { ref, computed, watch } from 'vue'
import { characterGroups, characterData } from '../data.js'

const props = defineProps({ currentType: String })
const emit  = defineEmits(['start-quiz'])

const selectionMode      = ref('lines')
const selectedGroups     = ref({})
const selectedCharacters = ref([])
const showRomaji         = ref(false)

const groups = computed(() => characterGroups[props.currentType])
const chars  = computed(() => characterData[props.currentType])

watch(() => props.currentType, () => {
  selectedGroups.value     = {}
  selectedCharacters.value = []
})

function switchTab(tab) {
  selectionMode.value = tab
  if (tab === 'lines') {
    selectedCharacters.value = []
  } else {
    selectedGroups.value = {}
  }
}

function toggleGroup(groupId) {
  if (selectedGroups.value[groupId]) {
    delete selectedGroups.value[groupId]
  } else {
    selectedGroups.value[groupId] = true
  }
}

function toggleCharacter(char) {
  const idx = selectedCharacters.value.indexOf(char)
  if (idx !== -1) {
    selectedCharacters.value.splice(idx, 1)
  } else {
    selectedCharacters.value.push(char)
  }
}

function selectAllLines() {
  Object.keys(groups.value).forEach(id => { selectedGroups.value[id] = true })
}
function deselectAllLines() { selectedGroups.value = {} }

function selectAllChars() {
  selectedCharacters.value = chars.value.map(item => item.char)
}
function deselectAllChars() { selectedCharacters.value = [] }

function startQuiz() {
  let characters = []

  if (selectionMode.value === 'lines') {
    if (Object.keys(selectedGroups.value).length === 0) {
      alert('Veuillez sélectionner au moins une ligne!')
      return
    }
    characters = Object.keys(selectedGroups.value)
      .filter(id => groups.value[id])
      .flatMap(id => groups.value[id].chars)
  } else {
    if (selectedCharacters.value.length === 0) {
      alert('Veuillez sélectionner au moins une lettre!')
      return
    }
    characters = chars.value.filter(item => selectedCharacters.value.includes(item.char))
  }

  emit('start-quiz', characters)
}
</script>

<template>
  <div>
    <h2>Étape 1 : Sélectionner les lettres</h2>

    <div class="selection-tabs">
      <button
        class="tab-btn"
        :class="{ active: selectionMode === 'lines' }"
        @click="switchTab('lines')"
      >Par lignes (KA, RA, etc.)</button>
      <button
        class="tab-btn"
        :class="{ active: selectionMode === 'individual' }"
        @click="switchTab('individual')"
      >Lettres individuelles</button>
    </div>

    <!-- Onglet par lignes -->
    <div v-if="selectionMode === 'lines'" class="tab-content">
      <div class="selection-controls">
        <button class="control-btn" @click="selectAllLines">Tous</button>
        <button class="control-btn" @click="deselectAllLines">Aucun</button>
      </div>
      <div class="groups-container">
        <button
          v-for="(groupData, groupId) in groups"
          :key="groupId"
          class="group-btn"
          :class="{ selected: selectedGroups[groupId] }"
          @click="toggleGroup(groupId)"
        >{{ groupData.label }}</button>
      </div>
    </div>

    <!-- Onglet lettres individuelles -->
    <div v-else class="tab-content">
      <div class="selection-controls">
        <button class="control-btn" @click="selectAllChars">Tous</button>
        <button class="control-btn" @click="deselectAllChars">Aucun</button>
        <button class="romaji-toggle-btn" :class="{ active: showRomaji }" @click="showRomaji = !showRomaji">
          {{ showRomaji ? '👁 Masquer' : '👁 Prononciations' }}
        </button>
      </div>
      <div class="character-grid">
        <div
          v-for="item in chars"
          :key="item.char"
          class="char-box"
          :class="{ selected: selectedCharacters.includes(item.char) }"
          @click="toggleCharacter(item.char)"
        >
          <span>{{ item.char }}</span>
          <span v-if="showRomaji" class="romaji">{{ item.romaji }}</span>
        </div>
      </div>
    </div>

    <div class="mode-actions">
      <button class="action-btn primary" @click="startQuiz">Commencer le Quiz</button>
    </div>
  </div>
</template>
