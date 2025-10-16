// ===================== TYPO RUSH GAME LOGIC - FIXED VERSION =====================

// ===== PRELOADER - IMPROVED =====
(function() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  if (!loadingOverlay) return;

  const assetsToLoad = [
    'gamesc.png',
    './fonts/super-pixel-font/SuperPixel-m2L8j.ttf',
    './fonts/digital-7-font/Digital7-rg1mL.ttf'
  ];

  let loadedCount = 0;
  const totalAssets = assetsToLoad.length;
  let hideTimeout = null;

  function checkAllLoaded() {
    loadedCount++;
    console.log(`Loaded ${loadedCount}/${totalAssets} assets`);
    
    if (loadedCount >= totalAssets) {
      // Clear any existing timeout
      if (hideTimeout) clearTimeout(hideTimeout);
      
      // Hide after small delay
      hideTimeout = setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.add('loaded');
        }
      }, 300);
    }
  }

  // Preload background image
  const img = new Image();
  img.onload = checkAllLoaded;
  img.onerror = checkAllLoaded;
  img.src = assetsToLoad[0];

  // Preload fonts
  if (document.fonts) {
    Promise.all([
      document.fonts.load('1em SuperPixel'),
      document.fonts.load('1em Digital7')
    ]).then(() => {
      checkAllLoaded();
      checkAllLoaded();
    }).catch(() => {
      checkAllLoaded();
      checkAllLoaded();
    });
  } else {
    checkAllLoaded();
    checkAllLoaded();
  }

  // Fallback: hide loader after 3 seconds regardless
  setTimeout(() => {
    if (loadingOverlay && !loadingOverlay.classList.contains('loaded')) {
      console.log('Fallback: hiding loader');
      loadingOverlay.classList.add('loaded');
    }
  }, 3000);
})();

// ===== MAIN GAME LOGIC =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ===== MUSIC HANDLING =====
  
  const correctBeep = new Audio("music/correct_beep.mp3");
  const wrongBeep = new Audio("music/wrong_beep.mp3");
  const gameOverSound = new Audio("music/gameoverfinal.mp3");
  
  correctBeep.volume = 0.7;
  wrongBeep.volume = 0.7;
  gameOverSound.volume = 1;

  // Stop background music when game starts
  if (window.musicController) {
    window.musicController.stopMusicForGame();
  }

  // Get selected mode
  const selectedMode = localStorage.getItem("selectedMode") || "time";
  
  // Switch to mode-specific music
  if (window.musicController) {
    let musicFile = '';
    
    if (selectedMode === 'survival') {
      musicFile = 'music/survivalmode_song.mp3';
    } else if (selectedMode === 'conquest') {
      musicFile = 'music/conquestmode_song.mp3';
    } else {
      musicFile = 'music/attackmode_song.mp3';
    }
    
    window.musicController.changeTrack(musicFile);
  }

  // --- Initialize Firebase ---
  const firebaseConfig = {
    apiKey: "AIzaSyBhCg2BMWcPgc44snQs9o5coDUEwIZyZjI",
    authDomain: "typo-rush-3551b.firebaseapp.com",
    projectId: "typo-rush-3551b",
    storageBucket: "typo-rush-3551b.firebasestorage.app",
    messagingSenderId: "769554999839",
    appId: "1:769554999839:web:8cd7f9b73040c9546bc32a"
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // --- DOM Elements ---
  const scoreDisplay = document.querySelector(".score");
  const timeDisplay = document.querySelector(".time");
  const inputBox = document.getElementById("input");
  const wordsDisplay = document.getElementById("words");
  const menuBtn = document.querySelector(".menu-btn");

  // --- Game State ---
  let wordsList = [];
  let usedWords = [];
  let currentWord = "";
  let score = 0;
  let wrongs = 0;
  let totalWords = 0;
  let totalLettersTyped = 0;
  let time;
  let timer = null;
  let gameStartedAt = null;
  let isSubmitting = false;

  let wrongsLeft = 2;
  let consecutiveCorrect = 0;

  // --- Load words from Firestore ---
  async function loadWordsFromFirebase() {
    try {
      const snapshot = await getDocs(collection(db, "words"));
      wordsList = snapshot.docs.map(doc => doc.data().word);
      console.log(`Loaded ${wordsList.length} words`);
      if (wordsList.length === 0) {
        wordsDisplay.textContent = "No words found in database!";
      } else {
        startGame();
      }
    } catch (error) {
      console.error("Error loading words:", error);
      wordsDisplay.textContent = "Error loading words!";
    }
  }

  const playerName = localStorage.getItem("username") || localStorage.getItem("playerName") || "Player";

  if (selectedMode === "survival") time = 30;
  else if (selectedMode === "conquest") time = 5;
  else time = 60;

  // --- Utility Functions ---
  function updateDisplays() {
    scoreDisplay.textContent = `Score: ${score}`;
    
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timeDisplay.textContent = formattedTime;
    
    if (selectedMode === "conquest") {
      const wrongsDisplay = document.querySelector(".wrongs-left");
      if (wrongsDisplay) {
        wrongsDisplay.textContent = `Wrongs Left: ${wrongsLeft}`;
      }
    }
  }

  function showRecoveryAnimation() {
    const recoveryEl = document.createElement('div');
    recoveryEl.className = 'recovery-animation';
    recoveryEl.textContent = '+1 Wrong Recovered!';
    
    document.body.appendChild(recoveryEl);

    setTimeout(() => {
      recoveryEl.remove();
    }, 2000);
  }

  function renderWordWithColors(target, typed = "") {
    const chars = Array.from(target);
    let html = "";
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const tch = typed[i];
      if (tch === undefined) {
        html += `<span class="letter">${escapeHtml(ch)}</span>`;
      } else if (tch === ch) {
        html += `<span class="letter" style="color:#00ff9a;font-weight:700">${escapeHtml(ch)}</span>`;
      } else {
        html += `<span class="letter" style="color:#ff4b4b;font-weight:700">${escapeHtml(ch)}</span>`;
      }
    }
    wordsDisplay.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function startTimerIfNeeded() {
    if (timer) return;
    timer = setInterval(() => {
      time--;
      updateDisplays();
      if (time <= 0) {
        endGame(selectedMode === "survival" ? "Time's up in Survival!" : "Time's up!");
      }
    }, 1000);
  }

  function ensureConquestTimer() {
    if (!timer) {
      timer = setInterval(() => {
        time--;
        updateDisplays();
        if (time <= 0) {
          endGame("Time's up in Conquest Mode!");
        }
      }, 1000);
    }
  }

  function getUniqueRandomWord() {
    if (usedWords.length === wordsList.length) usedWords = [];
    let word;
    do {
      const idx = Math.floor(Math.random() * wordsList.length);
      word = wordsList[idx];
    } while (usedWords.includes(word));
    usedWords.push(word);
    return word;
  }

  function nextWord() {
    if (wordsList.length === 0) return;
    isSubmitting = false;
    currentWord = getUniqueRandomWord();
    totalWords++;
    renderWordWithColors(currentWord, "");
    inputBox.value = "";
    inputBox.focus();
  }

  function submitTyped(typedRaw) {
    if (isSubmitting) return;
    isSubmitting = true;
    const typed = String(typedRaw);
    totalLettersTyped += typed.length;

    let correctLetters = 0;
    const minLen = Math.min(typed.length, currentWord.length);
    for (let i = 0; i < minLen; i++) {
      if (typed[i] === currentWord[i]) correctLetters++;
    }

    score += correctLetters;
    const typedTrim = typed.trim();
    const currentTrim = currentWord.trim();
    const isExact = typedTrim === currentTrim;

    if (isExact) {
      correctBeep.currentTime = 0;
      correctBeep.play().catch(() => {});
    } else {
      wrongBeep.currentTime = 0;
      wrongBeep.play().catch(() => {});
    }

    if (!isExact) wrongs++;

    renderWordWithColors(currentWord, typed);

    if (selectedMode === "conquest") {
      if (isExact) {
        time += 5;
        consecutiveCorrect++;
        
        if (consecutiveCorrect >= 5 && wrongsLeft < 2) {
          wrongsLeft = Math.min(wrongsLeft + 1, 2);
          consecutiveCorrect = 0;
          showRecoveryAnimation();
        }
        
        updateDisplays();
        ensureConquestTimer();
      } else {
        consecutiveCorrect = 0;
        wrongsLeft--;
        updateDisplays();
        
        if (wrongsLeft <= 0) {
          setTimeout(() => endGame("No more wrongs left in Conquest Mode!"), 450);
          return;
        }
      }
    } else if (selectedMode === "survival") {
      if (!isExact) {
        time -= 5;
        if (time < 0) time = 0;
        updateDisplays();
        if (time <= 0) {
          setTimeout(() => endGame("You lost all time in Survival!"), 450);
          return;
        }
      }
    }

    updateDisplays();

    wordsDisplay.classList.add("fade-out");
    setTimeout(() => {
      wordsDisplay.classList.remove("fade-out");
      nextWord();
    }, 400);
  }

  async function endGame(message = "Game Over!") {
    clearInterval(timer);
    timer = null;
    inputBox.disabled = true;

    // 🔇 CRITICAL FIX: Stop all background music IMMEDIATELY
    if (window.musicController && window.musicController.stopMusicHard) {
      window.musicController.stopMusicHard();
    }

    // Small delay to ensure music stops before game over sound
    await new Promise(resolve => setTimeout(resolve, 100));

    // 🎵 Play Game Over sound
    try {
      gameOverSound.pause();
      gameOverSound.currentTime = 0;
      await gameOverSound.play();
    } catch (err) {
      console.warn("Game Over sound failed:", err);
    }

    // Show "Game Over" text
    wordsDisplay.textContent = `${message} Final Score: ${score}`;

    // Save data
    const elapsedSec = Math.max(1, (Date.now() - (gameStartedAt || Date.now())) / 1000);
    const typingSpeed = (totalLettersTyped / elapsedSec).toFixed(2);

    localStorage.setItem("finalScore", score);
    localStorage.setItem("finalWrongs", wrongs);
    localStorage.setItem("finalWords", totalWords);
    localStorage.setItem("typingSpeed", typingSpeed);
    localStorage.setItem("finalMessage", message);
    localStorage.setItem("finalMode", selectedMode);
    localStorage.setItem("playerName", playerName);

    // Save to leaderboard in background
    addDoc(collection(db, "leaderboard"), {
      name: playerName,
      lps: parseFloat(typingSpeed)
    }).catch((error) => {
      console.error("Error saving to leaderboard:", error);
    });

    // Wait for game over sound to finish (1.2s)
    setTimeout(() => {
      window.location.href = "scoresc.html";
    }, 1200);
  }

  // --- Start Game ---
  function startGame() {
    if (selectedMode === "conquest") {
      document.body.setAttribute('data-mode', 'conquest');
      const wrongsDisplay = document.querySelector('.wrongs-left');
      if (wrongsDisplay) {
        wrongsDisplay.style.display = 'block';
      }
    }

    updateDisplays();
    inputBox.disabled = false;
    inputBox.focus();
    nextWord();

    if (selectedMode !== "conquest") {
      startTimerIfNeeded();
    } else {
      ensureConquestTimer();
    }

    inputBox.addEventListener("input", () => {
      if (gameStartedAt === null) gameStartedAt = Date.now();
      const typed = inputBox.value;
      renderWordWithColors(currentWord, typed);
      if (!isSubmitting && typed.length >= currentWord.length) {
        submitTyped(typed);
      }
    });

    inputBox.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (gameStartedAt === null) gameStartedAt = Date.now();
        submitTyped(inputBox.value);
      }
    });

    menuBtn.addEventListener("click", () => {
      if (confirm("Return to main menu? Progress will be lost.")) {
        clearInterval(timer);
        
        if (window.musicController) {
          window.musicController.stopMusicForGame();
          window.musicController.resumeMusicFromMenu();
        }

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 150);
      }
    });
  }

  await loadWordsFromFirebase();
});
