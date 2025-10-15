// ===================== TYPO RUSH GAME LOGIC (Firebase + Conquest Mode with 2 wrongs) =====================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ===== MUSIC HANDLING =====
  
  // Stop background music when game starts
  if (window.musicController) {
    window.musicController.stopMusicForGame();
  }

  // Get selected mode
  const selectedMode = localStorage.getItem("selectedMode") || "time";
  
  // Create mode-specific music
  let gameMusicAudio = null;
  let musicFile = '';
  
  if (selectedMode === 'survival') {
    musicFile = 'music/survivalmode_song.mp3';
  } else if (selectedMode === 'conquest') {
    musicFile = 'music/conquestmode_song.mp3';
  } else {
    musicFile = 'music/attackmode_song.mp3';
  }
  
  gameMusicAudio = new Audio(musicFile);
  gameMusicAudio.loop = true;
  gameMusicAudio.volume = 0.5;
  gameMusicAudio.play().catch(err => console.log('Music play failed:', err));

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

  // Conquest mode specific variables
  let wrongsLeft = 2; // Total wrongs allowed in conquest mode
  let consecutiveCorrect = 0; // Track consecutive correct words

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

  // --- Mode & Player Info ---
  const playerName = localStorage.getItem("username") || localStorage.getItem("playerName") || "Player";

  // Initialize time based on mode
  if (selectedMode === "survival") time = 30;
  else if (selectedMode === "conquest") time = 5;  // Start with 5 seconds for conquest
  else time = 60; // time attack default

  // --- Utility Functions ---
  function updateDisplays() {
    scoreDisplay.textContent = `Score: ${score}`;
    
    // Format time as digital clock (MM:SS)
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timeDisplay.textContent = formattedTime;
    
    // Update wrongs left display for conquest mode
    if (selectedMode === "conquest") {
      const wrongsDisplay = document.querySelector(".wrongs-left");
      if (wrongsDisplay) {
        wrongsDisplay.textContent = `Wrongs Left: ${wrongsLeft}`;
      }
    }
  }

  // Show +1 animation when wrongs are recovered
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
        endGame(selectedMode === "survival" ? "💀 Time's up in Survival!" : "⏳ Time's up!");
      }
    }, 1000);
  }

  function ensureConquestTimer() {
    // for conquest mode we may start interval only after first +time
    if (!timer) {
      timer = setInterval(() => {
        time--;
        updateDisplays();
        if (time <= 0) {
          endGame("⏳ Time's up in Conquest Mode!");
        }
      }, 1000);
    }
  }

  // --- Get a new random word (no repeats) ---
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
    
    if (!isExact) wrongs++;

    renderWordWithColors(currentWord, typed);

    // Mode-specific effects
    if (selectedMode === "conquest") {
      if (isExact) {
        // add time and ensure timer started
        time += 5;
        consecutiveCorrect++;
        
        // Check if 5 consecutive correct and there were wrongs before
        if (consecutiveCorrect >= 5 && wrongsLeft < 2) {
          wrongsLeft = Math.min(wrongsLeft + 1, 2); // Cap at 2
          consecutiveCorrect = 0; // Reset counter
          showRecoveryAnimation();
        }
        
        updateDisplays();
        ensureConquestTimer();
      } else {
        // wrong in conquest
        consecutiveCorrect = 0; // Reset consecutive counter
        wrongsLeft--;
        updateDisplays();
        
        if (wrongsLeft <= 0) {
          // small delay for player to see red
          setTimeout(() => endGame("💀 No more wrongs left in Conquest Mode!"), 450);
          return;
        }
      }
    } else if (selectedMode === "survival") {
      if (!isExact) {
        time -= 5;
        if (time < 0) time = 0;
        updateDisplays();
        if (time <= 0) {
          setTimeout(() => endGame("💀 You lost all time in Survival!"), 450);
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

  // --- End Game ---
  async function endGame(message = "Game Over!") {
    clearInterval(timer);
    timer = null;
    inputBox.disabled = true;
    
    // Stop mode-specific music
    if (gameMusicAudio) {
      gameMusicAudio.pause();
      gameMusicAudio.currentTime = 0;
    }
    
    const elapsedSec = Math.max(1, (Date.now() - (gameStartedAt || Date.now())) / 1000);
    const typingSpeed = (totalLettersTyped / elapsedSec).toFixed(2);

    // save stats for scores screen
    localStorage.setItem("finalScore", score);
    localStorage.setItem("finalWrongs", wrongs);
    localStorage.setItem("finalWords", totalWords);
    localStorage.setItem("typingSpeed", typingSpeed);
    localStorage.setItem("finalMessage", message);
    localStorage.setItem("finalMode", selectedMode);
    localStorage.setItem("playerName", playerName);

    // ✅ Save to Firestore leaderboard
    try {
      await addDoc(collection(db, "leaderboard"), {
        name: playerName,
        lps: parseFloat(typingSpeed)
      });
      console.log(`✅ Saved: ${playerName} - ${typingSpeed} LPS`);
    } catch (error) {
      console.error("❌ Error saving to leaderboard:", error);
    }

    wordsDisplay.textContent = `${message} Final Score: ${score}`;
    setTimeout(() => {
      window.location.href = "scoresc.html";
    }, 900);
  }

  // --- Start Game ---
  function startGame() {
    // Show wrongs left only in conquest mode
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
    
    // Start timer for non-conquest modes
    if (selectedMode !== "conquest") {
      startTimerIfNeeded();
    } else {
      // For conquest mode, start the timer immediately since we have 5 seconds
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
        
        // Stop mode-specific music
        if (gameMusicAudio) {
          gameMusicAudio.pause();
          gameMusicAudio.currentTime = 0;
        }
        
        // Resume menu music when going back
        if (window.musicController) {
          window.musicController.resumeMusicFromMenu();
        }
        
        window.location.href = "index.html";
      }
    });
  }

  // --- Load words and start ---
  await loadWordsFromFirebase();
});