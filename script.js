// State
let currentType = "hiragana";
let selectionMode = "lines";
let selectedGroups = {};
let selectedCharacters = [];
let quizCharacters = [];
let quizLayout = [];
let currentCellCoordinates = { row: 0, col: 0 };
let correctCount = 0;
let errorCount = 0;

// DOM
const typeBtns = document.querySelectorAll(".type-btn");
const selectionModeDiv = document.getElementById("selectionMode");
const quizModeDiv = document.getElementById("quizMode");
const tabBtns = document.querySelectorAll(".tab-btn");
const linesTab = document.getElementById("linesTab");
const individualTab = document.getElementById("individualTab");
const groupsContainer = document.getElementById("groupsContainer");
const characterGrid = document.getElementById("characterGrid");
const selectAllLinesBtn = document.getElementById("selectAllLines");
const deselectAllLinesBtn = document.getElementById("deselectAllLines");
const selectAllCharsBtn = document.getElementById("selectAllChars");
const deselectAllCharsBtn = document.getElementById("deselectAllChars");
const startQuizBtn = document.getElementById("startQuiz");
const backToSelectionBtn = document.getElementById("backToSelection");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const quizGrid = document.getElementById("quizGrid");
const currentQuestion = document.getElementById("currentQuestion");
const totalQuestions = document.getElementById("totalQuestions");
const correctCountDisplay = document.getElementById("correctCount");
const errorCountDisplay = document.getElementById("errorCount");

// Lookup map built once: char → Set of all accepted romaji (primary + alts)
const charAccepted = new Map(
  Object.values(characterData).flat().map(({ char, romaji, alts = [] }) => [
    char,
    new Set([romaji, ...alts]),
  ])
);

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeRomaji(str) {
  return str.toLowerCase().trim();
}

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectionMode = btn.dataset.tab;

    if (selectionMode === "lines") {
      linesTab.classList.add("active");
      individualTab.classList.remove("active");
      selectedCharacters = [];
    } else {
      individualTab.classList.add("active");
      linesTab.classList.remove("active");
      selectedGroups = {};
      renderCharacterGrid();
    }
  });
});

// Type selection
typeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    typeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentType = btn.dataset.type;
    resetApp();
  });
});

function resetApp() {
  selectedGroups = {};
  selectedCharacters = [];
  quizCharacters = [];
  currentCellCoordinates = { row: 0, col: 0 };
  correctCount = 0;
  errorCount = 0;
  if (selectionMode === "lines") {
    renderGroupsGrid();
  } else {
    renderCharacterGrid();
  }
}

function renderGroupsGrid() {
  groupsContainer.innerHTML = "";
  const groups = characterGroups[currentType];
  Object.entries(groups).forEach(([groupId, groupData]) => {
    const btn = document.createElement("button");
    btn.className = "group-btn";
    if (selectedGroups[groupId]) btn.classList.add("selected");
    btn.textContent = groupData.label;
    btn.addEventListener("click", () => toggleGroup(groupId, btn));
    groupsContainer.appendChild(btn);
  });
}

function toggleGroup(groupId, element) {
  if (selectedGroups[groupId]) {
    delete selectedGroups[groupId];
    element.classList.remove("selected");
  } else {
    selectedGroups[groupId] = true;
    element.classList.add("selected");
  }
}

function renderCharacterGrid() {
  characterGrid.innerHTML = "";
  characterData[currentType].forEach((item) => {
    const charBox = document.createElement("div");
    charBox.className = "char-box";
    if (selectedCharacters.includes(item.char)) charBox.classList.add("selected");
    charBox.innerHTML = `<span>${item.char}</span><span class="romaji">${item.romaji}</span>`;
    charBox.addEventListener("click", () => toggleCharacter(item.char, charBox));
    characterGrid.appendChild(charBox);
  });
}

function toggleCharacter(char, element) {
  if (selectedCharacters.includes(char)) {
    selectedCharacters = selectedCharacters.filter((c) => c !== char);
    element.classList.remove("selected");
  } else {
    selectedCharacters.push(char);
    element.classList.add("selected");
  }
}

selectAllLinesBtn.addEventListener("click", () => {
  Object.keys(characterGroups[currentType]).forEach((id) => {
    selectedGroups[id] = true;
  });
  renderGroupsGrid();
});

deselectAllLinesBtn.addEventListener("click", () => {
  selectedGroups = {};
  renderGroupsGrid();
});

selectAllCharsBtn.addEventListener("click", () => {
  selectedCharacters = characterData[currentType].map((item) => item.char);
  renderCharacterGrid();
});

deselectAllCharsBtn.addEventListener("click", () => {
  selectedCharacters = [];
  renderCharacterGrid();
});

startQuizBtn.addEventListener("click", () => {
  if (selectionMode === "lines") {
    if (Object.keys(selectedGroups).length === 0) {
      alert("Veuillez sélectionner au moins une ligne!");
      return;
    }
    startQuizFromLines();
  } else {
    if (selectedCharacters.length === 0) {
      alert("Veuillez sélectionner au moins une lettre!");
      return;
    }
    startQuizFromIndividual();
  }
});

function startQuizFromLines() {
  const groups = characterGroups[currentType];
  quizCharacters = Object.keys(selectedGroups)
    .filter((id) => groups[id])
    .flatMap((id) => groups[id].chars);
  startQuizCommon();
}

function startQuizFromIndividual() {
  quizCharacters = characterData[currentType].filter((item) =>
    selectedCharacters.includes(item.char)
  );
  startQuizCommon();
}

function startQuizCommon() {
  quizCharacters = shuffle(quizCharacters);
  currentCellCoordinates = { row: 0, col: 0 };
  correctCount = 0;
  errorCount = 0;

  totalQuestions.textContent = quizCharacters.length;
  currentQuestion.textContent = "1";
  correctCountDisplay.textContent = 0;
  errorCountDisplay.textContent = 0;

  selectionModeDiv.classList.remove("active");
  quizModeDiv.classList.add("active");

  renderQuizQuestion();
  answerInput.focus();
}

backToSelectionBtn.addEventListener("click", () => {
  selectionModeDiv.classList.add("active");
  quizModeDiv.classList.remove("active");
  resetApp();
});

function renderQuizQuestion() {
  quizGrid.innerHTML = "";
  const shuffled = shuffle(quizCharacters.map((item) => item.char));

  quizLayout = [];
  let row = [];
  shuffled.forEach((char, index) => {
    row.push({ char, index });
    if (row.length === 5 || index === shuffled.length - 1) {
      quizLayout.push(row);
      row = [];
    }
  });

  quizLayout.forEach((rowItems, rowIndex) => {
    rowItems.forEach((item, colIndex) => {
      const cell = document.createElement("div");
      cell.className = "quiz-cell";
      cell.dataset.row = rowIndex;
      cell.dataset.col = colIndex;
      cell.textContent = item.char;
      cell.addEventListener("click", () => selectCellByCoordinates(rowIndex, colIndex));
      quizGrid.appendChild(cell);
    });
  });

  selectCellByCoordinates(0, 0);
  answerInput.value = "";
  feedback.className = "feedback";
  feedback.textContent = "";
}

function getNextCellCoordinates() {
  let { row, col } = currentCellCoordinates;
  col++;
  if (col >= quizLayout[row].length) {
    row++;
    col = 0;
    if (row >= quizLayout.length) return null;
  }
  return { row, col };
}

function selectCellByCoordinates(row, col) {
  const oldCell = quizGrid.querySelector(".quiz-cell.selected");
  if (oldCell) oldCell.classList.remove("selected");

  const newCell = quizGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (newCell && !newCell.classList.contains("correct")) {
    newCell.classList.add("selected");
    currentCellCoordinates = { row, col };
    answerInput.focus();
  }
}

answerInput.addEventListener("input", () => {
  const answer = normalizeRomaji(answerInput.value);
  if (!answer) return;

  const selectedCell = quizGrid.querySelector(".quiz-cell.selected");
  if (!selectedCell) return;

  const accepted = charAccepted.get(selectedCell.textContent);
  if (!accepted) return;

  const isCorrect = accepted.has(answer);
  const isStillPossible = [...accepted].some((r) => r.startsWith(answer));

  if (isCorrect) {
    selectedCell.classList.remove("selected");
    selectedCell.classList.add("correct");

    correctCount++;
    correctCountDisplay.textContent = correctCount;
    currentQuestion.textContent = correctCount + 1;

    answerInput.value = "";
    feedback.className = "feedback";
    feedback.textContent = "";

    const next = getNextCellCoordinates();
    if (next === null) {
      setTimeout(showQuizEnd, 300);
    } else {
      selectCellByCoordinates(next.row, next.col);
    }
  } else if (!isStillPossible) {
    // Typed string can no longer lead to correct answer
    errorCount++;
    errorCountDisplay.textContent = errorCount;

    answerInput.value = "";
    selectedCell.classList.add("incorrect");

    setTimeout(() => {
      selectedCell.classList.remove("incorrect");
      answerInput.focus();
    }, 500);
  }
});

function showQuizEnd() {
  const percentage = Math.round((correctCount / quizCharacters.length) * 100);
  const message = `Quiz terminé!\n\nCorrect: ${correctCount}/${quizCharacters.length}\nErreurs: ${errorCount}\n\nPourcentage: ${percentage}%`;
  if (confirm(message + "\n\nVoulez-vous recommencer?")) {
    selectionModeDiv.classList.add("active");
    quizModeDiv.classList.remove("active");
    resetApp();
  }
}

resetApp();
