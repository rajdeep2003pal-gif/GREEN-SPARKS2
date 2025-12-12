// ✓ Import Firebase (v9+ Modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ------------------------------
// ✓ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDcf9bn4c1jRyImcDmQ9mVC9KJpzOWEMdE",
  authDomain: "http://mine-dewatering-system.firebaseapp.com/",
  databaseURL: "https://mine-dewatering-system-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "mine-dewatering-system",
  storageBucket: "http://mine-dewatering-system.firebasestorage.app/",
  messagingSenderId: "182172317789",
  appId: "1:182172317789:web:9a94b24b2b2bce5a9e35b4",
  measurementId: "G-BJSBQ49539"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ========== MULTI-USER EMAIL NOTIFICATION SYSTEM ==========
import { get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const EMAIL_CONFIG = {
  serviceID: "service_2wb0x6h",
  templateID: "template_04m88ia",
  publicKey: "BOv1N_XamnuD--Nv4"
};

let lastEmailSent = {};
let emailNotificationsEnabled = false;
let userEmail = null;
let userName = null;
let currentUserId = null;

// Initialize email system for current user
async function initEmailSystem() {
  const loggedInUser = localStorage.getItem('loggedInUser');
  if (!loggedInUser) {
    console.log("No user logged in");
    return;
  }

  try {
    const user = JSON.parse(loggedInUser);
    userEmail = user.email;
    userName = user.name || user.username || 'User';
    currentUserId = user.email.replace(/\./g, '_'); // Firebase key-safe

    console.log("✉ Email system initialized for:", userEmail);

    // Load THIS user's email preference from Firebase
    await loadUserEmailPreference();

  } catch (e) {
    console.error("Error initializing email system:", e);
  }
}

// Load user's email notification preference from Firebase
async function loadUserEmailPreference() {
  if (!currentUserId) return;

  try {
    const userPrefRef = ref(db, `users/${currentUserId}/settings/emailNotifications`);
    const snapshot = await get(userPrefRef);

    if (snapshot.exists()) {
      emailNotificationsEnabled = snapshot.val();
      console.log(`✉ Email notifications for ${userEmail}:`, emailNotificationsEnabled ? 'ON' : 'OFF');
    } else {
      // Default: OFF for new users
      emailNotificationsEnabled = false;
      await saveUserEmailPreference();
    }

    updateEmailButtonUI();

  } catch (error) {
    console.error("Error loading email preference:", error);
    // Fallback to localStorage
    emailNotificationsEnabled = localStorage.getItem(`emailNotifications_${currentUserId}`) === 'true';
    updateEmailButtonUI();
  }
}

// Save user's email notification preference to Firebase
async function saveUserEmailPreference() {
  if (!currentUserId) return;

  try {
    const userPrefRef = ref(db, `users/${currentUserId}/settings/emailNotifications`);
    await set(userPrefRef, emailNotificationsEnabled);

    // Also save to localStorage as backup
    localStorage.setItem(`emailNotifications_${currentUserId}`, emailNotificationsEnabled);

    console.log(`💾 Saved email preference for ${userEmail}:`, emailNotificationsEnabled);

  } catch (error) {
    console.error("Error saving email preference:", error);
    // Fallback to localStorage only
    localStorage.setItem(`emailNotifications_${currentUserId}`, emailNotificationsEnabled);
  }
}

// Update email button UI
function updateEmailButtonUI() {
  const btn = document.getElementById('emailNotificationToggle');
  const emailSlash = document.getElementById('emailSlash');
  if (!btn) return;

  if (!userEmail) {
    btn.disabled = true;
    if (emailSlash) emailSlash.style.display = 'block';
    return;
  }

  btn.disabled = false;

  if (emailNotificationsEnabled) {
    btn.classList.add('enabled');
    if (emailSlash) emailSlash.style.display = 'none';
  } else {
    btn.classList.remove('enabled');
    if (emailSlash) emailSlash.style.display = 'block';
  }
}

// Toggle email notifications
async function toggleEmailNotifications() {
  if (!userEmail) {
    alert('Please login to enable email notifications');
    return;
  }

  emailNotificationsEnabled = !emailNotificationsEnabled;

  // Save to Firebase (persists across devices)
  await saveUserEmailPreference();

  updateEmailButtonUI();

  const message = emailNotificationsEnabled
    ? `✓ Email notifications enabled for ${userEmail}`
    : `ℹ️ Email notifications disabled for ${userEmail}`;

  showEmailToast(message, emailNotificationsEnabled ? 'success' : 'info');
  speak(emailNotificationsEnabled ? 'Email notifications enabled' : 'Email notifications disabled');
}

// Send email notification (only to current logged-in user)
async function sendEmailNotification(alertType, message, priority = 'normal') {
  // Check if user is logged in
  if (!userEmail) {
    console.log("✕ No user logged in - email not sent");
    return;
  }

  // Check if user has enabled email notifications
  if (!emailNotificationsEnabled) {
    console.log(`✕ Email disabled for ${userEmail} - notification not sent`);
    return;
  }

  const alertKey = `${alertType}_${priority}`;
  const now = Date.now();
  const cooldown = 300000; // 5 minutes

  // Check cooldown (prevent spam)
  if (lastEmailSent[alertKey] && (now - lastEmailSent[alertKey]) < cooldown) {
    console.log(`⏳ Email cooldown active for: ${alertKey}`);
    return;
  }

  try {
    const templateParams = {
      to_email: userEmail,           // ← THIS is the logged-in user's email
      user_name: userName,            // ← THIS is the logged-in user's name
      alert_type: alertType,
      alert_message: message,
      priority: priority,
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: 'Asia/Kolkata'
      }),
      dashboard_link: window.location.origin + '/index.html'
    };

    console.log(`✉ Sending email to: ${userEmail}`);
    console.log(`📨 Alert: ${alertType}`);

    await emailjs.send(
      EMAIL_CONFIG.serviceID,
      EMAIL_CONFIG.templateID,
      templateParams
    );

    lastEmailSent[alertKey] = now;
    console.log(`✓ Email sent successfully to ${userEmail}`);
    showEmailToast(`Email sent to ${userEmail}`, 'success');

  } catch (error) {
    console.error("✕ Email send failed:", error);
    showEmailToast('Failed to send email', 'error');
  }
}

// Show toast notification
function showEmailToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? 'rgba(118, 185, 0, 0.95)' : type === 'error' ? 'rgba(230, 57, 70, 0.95)' : 'rgba(0, 217, 255, 0.95)'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideInEmail 0.3s ease;
  `;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutEmail 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInEmail {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutEmail {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize on load
setTimeout(initEmailSystem, 1000);

// Email toggle button event
const emailToggleBtn = document.getElementById('emailNotificationToggle');
if (emailToggleBtn) {
  emailToggleBtn.addEventListener('click', toggleEmailNotifications);
}

console.log("✉ Multi-user email notification system loaded");
// ========== END EMAIL SYSTEM ==========


// ------------------------------
// Database References
const telemetryRef = ref(db, "telemetry/device01");
const commandRef = ref(db, "commands/device01");

// ═══════════════════════════════════════════════════════════
// $ COST & CO2 SAVINGS TRACKER - Firebase Integration
// ═══════════════════════════════════════════════════════════

// Configuration - Adjust these based on your actual values
const SAVINGS_CONFIG = {
  electricityCostPerKWh: 8.5,        // ₹ per kWh (India average)
  pumpPowerKW: 2.5,                   // Pump power consumption in kW
  solarPowerKW: 3.0,                  // Solar panel capacity in kW
  co2PerKWh: 0.82,                    // kg CO2 per kWh (India grid)
  gridEfficiency: 0.85,               // 85% efficiency
};

// Global savings data
let savingsData = {
  totalRuntime: 0,                    // Total seconds pump has run
  dailyRuntime: 0,                    // Today's runtime in seconds
  monthlyRuntime: 0,                  // This month's runtime
  yearlyRuntime: 0,                   // This year's runtime
  lastResetDay: new Date().getDate(),
  lastResetMonth: new Date().getMonth(),
  lastResetYear: new Date().getFullYear(),
  dailySavings: { cost: 0, co2: 0, energy: 0 },
  monthlySavings: { cost: 0, co2: 0, energy: 0 },
  yearlySavings: { cost: 0, co2: 0, energy: 0 },
  totalSavings: { cost: 0, co2: 0, energy: 0, spent: 0, emitted: 0 },
};

// Firebase reference for savings data
const savingsRef = ref(db, "savings/device01");

// ═══════════════════════════════════════════════════════════
// ▤ LOAD SAVINGS DATA FROM FIREBASE
// ═══════════════════════════════════════════════════════════
async function loadSavingsFromFirebase() {
  try {
    const snapshot = await new Promise((resolve, reject) => {
      const unsubscribe = onValue(savingsRef, (snapshot) => {
        unsubscribe();
        resolve(snapshot);
      }, (error) => {
        unsubscribe();
        reject(error);
      });
    });

    const data = snapshot.val();
    if (data) {
      console.log("✓ Loading savings data from Firebase");
      savingsData = {
        ...savingsData,
        ...data,
      };

      // Check if we need to reset daily/monthly/yearly counters
      checkAndResetCounters();
      updateSavingsDisplay();
    } else {
      console.log("▤ No savings data found, starting fresh");
      saveSavingsToFirebase();
    }
  } catch (error) {
    console.error("✕ Error loading savings:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// 💾 SAVE SAVINGS DATA TO FIREBASE
// ═══════════════════════════════════════════════════════════
let saveSavingsTimeout = null;
function saveSavingsToFirebase() {
  if (saveSavingsTimeout) {
    clearTimeout(saveSavingsTimeout);
  }

  saveSavingsTimeout = setTimeout(async () => {
    try {
      await update(savingsRef, {
        ...savingsData,
        lastUpdate: Date.now(),
      });
      console.log("💾 Savings data saved to Firebase");
    } catch (error) {
      console.error("✕ Error saving savings:", error);
    }
  }, 5000); // Save every 5 seconds to avoid too many writes
}

// ═══════════════════════════════════════════════════════════
// ↻ CHECK AND RESET DAILY/MONTHLY/YEARLY COUNTERS
// ═══════════════════════════════════════════════════════════
function checkAndResetCounters() {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Reset daily counter if it's a new day
  if (currentDay !== savingsData.lastResetDay) {
    console.log("↻ New day detected - resetting daily counters");
    savingsData.dailyRuntime = 0;
    savingsData.dailySavings = { cost: 0, co2: 0, energy: 0 };
    savingsData.lastResetDay = currentDay;
  }

  // Reset monthly counter if it's a new month
  if (currentMonth !== savingsData.lastResetMonth) {
    console.log("↻ New month detected - resetting monthly counters");
    savingsData.monthlyRuntime = 0;
    savingsData.monthlySavings = { cost: 0, co2: 0, energy: 0 };
    savingsData.lastResetMonth = currentMonth;
  }

  // Reset yearly counter if it's a new year
  if (currentYear !== savingsData.lastResetYear) {
    console.log("↻ New year detected - resetting yearly counters");
    savingsData.yearlyRuntime = 0;
    savingsData.yearlySavings = { cost: 0, co2: 0, energy: 0 };
    savingsData.lastResetYear = currentYear;
  }
}

// ═══════════════════════════════════════════════════════════
// 🧮 CALCULATE SAVINGS
// ═══════════════════════════════════════════════════════════
function calculateSavings(runtimeSeconds, solarPercentage) {
  const runtimeHours = runtimeSeconds / 3600;
  const solarDecimal = solarPercentage / 100;

  // Energy consumed by pump (kWh)
  const totalEnergyConsumed = runtimeHours * SAVINGS_CONFIG.pumpPowerKW;

  // Energy from solar (kWh)
  const solarEnergyUsed = totalEnergyConsumed * solarDecimal;

  // Energy from grid (kWh)
  const gridEnergyUsed = totalEnergyConsumed - solarEnergyUsed;

  // Cost savings (solar is free, grid costs money)
  const costSaved = solarEnergyUsed * SAVINGS_CONFIG.electricityCostPerKWh;
  const costSpent = gridEnergyUsed * SAVINGS_CONFIG.electricityCostPerKWh;

  // CO2 savings (solar = 0 emissions, grid = emissions)
  const co2Saved = solarEnergyUsed * SAVINGS_CONFIG.co2PerKWh;
  const co2Emitted = gridEnergyUsed * SAVINGS_CONFIG.co2PerKWh;

  return {
    cost: costSaved,
    co2: co2Saved,
    energy: solarEnergyUsed,
    spent: costSpent,
    emitted: co2Emitted,
  };
}

// ═══════════════════════════════════════════════════════════
// ▲ UPDATE SAVINGS ON PUMP RUNTIME
// ═══════════════════════════════════════════════════════════
let lastSavingsUpdate = Date.now();

function updateSavingsTracking() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastSavingsUpdate) / 1000);

  if (elapsedSeconds < 1) return; // Update every second

  lastSavingsUpdate = now;

  // Get current solar percentage from Firebase
  onValue(ref(db, "telemetry/device01/solar"), (snapshot) => {
    const solarPercentage = snapshot.val() || 0;

    // Get pump status
    onValue(ref(db, "telemetry/device01/pumpStatus"), (statusSnapshot) => {
      const pumpStatus = statusSnapshot.val();

      if (pumpStatus === "ON") {
        // Increment runtimes
        savingsData.totalRuntime += elapsedSeconds;
        savingsData.dailyRuntime += elapsedSeconds;
        savingsData.monthlyRuntime += elapsedSeconds;
        savingsData.yearlyRuntime += elapsedSeconds;

        // Calculate savings for this period
        const periodSavings = calculateSavings(elapsedSeconds, solarPercentage);

        // Update total savings
        savingsData.totalSavings.cost += periodSavings.cost;
        savingsData.totalSavings.co2 += periodSavings.co2;
        savingsData.totalSavings.energy += periodSavings.energy;
        savingsData.totalSavings.spent += periodSavings.spent;
        savingsData.totalSavings.emitted += periodSavings.emitted;

        // Update period savings
        savingsData.dailySavings.cost += periodSavings.cost;
        savingsData.dailySavings.co2 += periodSavings.co2;
        savingsData.dailySavings.energy += periodSavings.energy;

        savingsData.monthlySavings.cost += periodSavings.cost;
        savingsData.monthlySavings.co2 += periodSavings.co2;
        savingsData.monthlySavings.energy += periodSavings.energy;

        savingsData.yearlySavings.cost += periodSavings.cost;
        savingsData.yearlySavings.co2 += periodSavings.co2;
        savingsData.yearlySavings.energy += periodSavings.energy;

        // Update display
        updateSavingsDisplay();

        // Save to Firebase (throttled)
        saveSavingsToFirebase();
      }
    }, { onlyOnce: true });
  }, { onlyOnce: true });

  // Check if counters need reset
  checkAndResetCounters();
}

// Start updating savings every second
setInterval(updateSavingsTracking, 1000);

// ═══════════════════════════════════════════════════════════
// 🎨 UPDATE SAVINGS DISPLAY IN UI
// ═══════════════════════════════════════════════════════════
function updateSavingsDisplay() {
  // Format currency
  const formatCurrency = (value) => `₹${value.toFixed(2)}`;

  // Format CO2
  const formatCO2 = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} tons`;
    }
    return `${value.toFixed(2)} kg`;
  };

  // Format energy
  const formatEnergy = (value) => `${value.toFixed(2)} kWh`;

  // Update Total Savings
  const totalCostEl = document.getElementById('totalCostSaved');
  if (totalCostEl) {
    totalCostEl.textContent = formatCurrency(savingsData.totalSavings.cost);
  }

  const totalCO2El = document.getElementById('totalCO2Saved');
  if (totalCO2El) {
    totalCO2El.textContent = formatCO2(savingsData.totalSavings.co2);
  }

  const totalEnergyEl = document.getElementById('totalEnergySaved');
  if (totalEnergyEl) {
    totalEnergyEl.textContent = formatEnergy(savingsData.totalSavings.energy);
  }

  const costSpentEl = document.getElementById('costSpent');
  if (costSpentEl) {
    costSpentEl.textContent = formatCurrency(savingsData.totalSavings.spent);
  }

  const co2EmittedEl = document.getElementById('co2Emitted');
  if (co2EmittedEl) {
    co2EmittedEl.textContent = formatCO2(savingsData.totalSavings.emitted);
  }

  // Update Daily Savings
  const dailyCostEl = document.getElementById('dailyCostSaved');
  if (dailyCostEl) {
    dailyCostEl.textContent = formatCurrency(savingsData.dailySavings.cost);
  }

  const dailyCO2El = document.getElementById('dailyCO2Saved');
  if (dailyCO2El) {
    dailyCO2El.textContent = formatCO2(savingsData.dailySavings.co2);
  }

  const dailyEnergyEl = document.getElementById('dailyEnergySaved');
  if (dailyEnergyEl) {
    dailyEnergyEl.textContent = formatEnergy(savingsData.dailySavings.energy);
  }

  // Update Monthly Savings
  const monthlyCostEl = document.getElementById('monthlyCostSaved');
  if (monthlyCostEl) {
    monthlyCostEl.textContent = formatCurrency(savingsData.monthlySavings.cost);
  }

  const monthlyCO2El = document.getElementById('monthlyCO2Saved');
  if (monthlyCO2El) {
    monthlyCO2El.textContent = formatCO2(savingsData.monthlySavings.co2);
  }

  const monthlyEnergyEl = document.getElementById('monthlyEnergySaved');
  if (monthlyEnergyEl) {
    monthlyEnergyEl.textContent = formatEnergy(savingsData.monthlySavings.energy);
  }

  // Update Yearly Savings
  const yearlyCostEl = document.getElementById('yearlyCostSaved');
  if (yearlyCostEl) {
    yearlyCostEl.textContent = formatCurrency(savingsData.yearlySavings.cost);
  }

  const yearlyCO2El = document.getElementById('yearlyCO2Saved');
  if (yearlyCO2El) {
    yearlyCO2El.textContent = formatCO2(savingsData.yearlySavings.co2);
  }

  const yearlyEnergyEl = document.getElementById('yearlyEnergySaved');
  if (yearlyEnergyEl) {
    yearlyEnergyEl.textContent = formatEnergy(savingsData.yearlySavings.energy);
  }

}

// ═══════════════════════════════════════════════════════════
// 🚀 INITIALIZE SAVINGS TRACKER
// ═══════════════════════════════════════════════════════════
function initializeSavingsTracker() {
  console.log("$ Initializing Cost & CO2 Savings Tracker");

  // Load existing data from Firebase
  loadSavingsFromFirebase();

  // Update display immediately
  updateSavingsDisplay();

  console.log("✓ Savings Tracker initialized");
}

// Initialize on page load
setTimeout(initializeSavingsTracker, 2000);

// ═══════════════════════════════════════════════════════════
// 🔧 MANUAL RESET FUNCTIONS (Optional)
// ═══════════════════════════════════════════════════════════
function resetDailySavings() {
  savingsData.dailyRuntime = 0;
  savingsData.dailySavings = { cost: 0, co2: 0, energy: 0 };
  saveSavingsToFirebase();
  updateSavingsDisplay();
  console.log("↻ Daily savings reset");
}

function resetMonthlySavings() {
  savingsData.monthlyRuntime = 0;
  savingsData.monthlySavings = { cost: 0, co2: 0, energy: 0 };
  saveSavingsToFirebase();
  updateSavingsDisplay();
  console.log("↻ Monthly savings reset");
}

function resetYearlySavings() {
  savingsData.yearlyRuntime = 0;
  savingsData.yearlySavings = { cost: 0, co2: 0, energy: 0 };
  saveSavingsToFirebase();
  updateSavingsDisplay();
  console.log("↻ Yearly savings reset");
}

function resetAllSavings() {
  if (confirm("⚠️ Are you sure you want to reset ALL savings data? This cannot be undone!")) {
    savingsData = {
      totalRuntime: 0,
      dailyRuntime: 0,
      monthlyRuntime: 0,
      yearlyRuntime: 0,
      lastResetDay: new Date().getDate(),
      lastResetMonth: new Date().getMonth(),
      lastResetYear: new Date().getFullYear(),
      dailySavings: { cost: 0, co2: 0, energy: 0 },
      monthlySavings: { cost: 0, co2: 0, energy: 0 },
      yearlySavings: { cost: 0, co2: 0, energy: 0 },
      totalSavings: { cost: 0, co2: 0, energy: 0, spent: 0, emitted: 0 },
    };
    saveSavingsToFirebase();
    updateSavingsDisplay();
    console.log("↻ All savings data reset");
  }
}

console.log("$ Cost & CO2 Savings Tracker loaded successfully!");

// ------------------------------
// 🔇 MUTE FUNCTIONALITY
let isMuted = localStorage.getItem('soundMuted') === 'true';
const muteToggle = document.getElementById("muteToggle");

// Initialize mute button state
if (muteToggle) {
  updateMuteButton();

  muteToggle.addEventListener("click", () => {
    isMuted = !isMuted;
    localStorage.setItem('soundMuted', isMuted);
    updateMuteButton();

    if (isMuted) {
      // Stop all speech when muting
      speechSynthesis.cancel();
      speechQueue = [];
      isSpeaking = false;
    }
  });
}

function updateMuteButton() {
  if (muteToggle) {
    if (isMuted) {
      muteToggle.textContent = "🔇";
      muteToggle.classList.add("muted");
    } else {
      muteToggle.textContent = "♪";
      muteToggle.classList.remove("muted");
    }
    muteToggle.style.border = "none";
  }
}

// ------------------------------
// DOM Elements
const pumpSwitch = document.getElementById("pumpSwitch");
const runtime = document.getElementById("runtime");
const waterFill = document.querySelector(".water-fill");
const waterText = document.querySelector(".water-text");
const flowCircle = document.querySelector(".circle");
const modeToggle = document.getElementById("modeToggle");
const aiRecommendation = document.getElementById("ai-recommendation");
const aiWaterLimit = document.getElementById("aiWaterLimit");
const batteryEl = document.getElementById("battery");
const solarEl = document.getElementById("solar");
const weatherEl = document.getElementById("weather");
const clockEl = document.getElementById("clock");
const statusText = document.getElementById("pumpStatus");
const statusDot = document.getElementById("statusDot");
const pumpStatusText = document.getElementById("pumpStatusText");

// ------------------------------
// ▤ MULTIPLE CHARTS WITH SWIPE NAVIGATION
let currentChartIndex = 0;
const chartCanvases = [
  document.getElementById("dataChart"),
  document.getElementById("batteryChart"),
  document.getElementById("solarChart")
];

const chartContainers = [
  document.querySelector(".chart-container"),
  document.querySelector(".battery-chart-container"),
  document.querySelector(".solar-chart-container")
];

// Initialize all charts
const ctx1 = chartCanvases[0]?.getContext("2d");
const ctx2 = chartCanvases[1]?.getContext("2d");
const ctx3 = chartCanvases[2]?.getContext("2d");

// Chart 1: Water Level + Flow Rate
const dataChart = ctx1 ? new Chart(ctx1, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Water Level (%)",
        data: [],
        borderColor: "#00bcd4",
        backgroundColor: "rgba(0,188,212,0.1)",
        tension: 0.3,
        fill: true,
        borderWidth: window.innerWidth <= 768 ? 3 : 2,
        pointRadius: window.innerWidth <= 768 ? 4 : 3,
        pointHoverRadius: window.innerWidth <= 768 ? 6 : 5,
        yAxisID: 'y'
      },
      {
        label: "Flow Rate (L/min)",
        data: [],
        borderColor: "limegreen",
        backgroundColor: "rgba(50,205,50,0.1)",
        tension: 0.3,
        fill: true,
        borderWidth: window.innerWidth <= 768 ? 3 : 2,
        pointRadius: window.innerWidth <= 768 ? 4 : 3,
        pointHoverRadius: window.innerWidth <= 768 ? 6 : 5,
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: window.innerWidth <= 768 ? 5 : 10,
        right: window.innerWidth <= 768 ? 5 : 10,
        top: window.innerWidth <= 768 ? 5 : 10,
        bottom: window.innerWidth <= 768 ? 30 : 10  // Add bottom padding for mobile
      }
    },
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        max: 100,
        ticks: {
          color: "#ffffff",
          font: {
            size: window.innerWidth <= 768 ? 14 : 13,
            weight: '600',
            family: 'Arial, sans-serif'
          },
          padding: 5,
          stepSize: 25,
          maxTicksLimit: 5,
          callback: function (value) {
            if (window.innerWidth <= 768) {
              return [0, 25, 50, 75, 100].includes(value) ? value : '';
            }
            return value;
          },
        },
        grid: {
          color: window.innerWidth <= 768 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
          lineWidth: window.innerWidth <= 768 ? 1.5 : 1,
          drawOnChartArea: true,
          drawTicks: true
        }
      },
      y1: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        max: 10,
        grid: { drawOnChartArea: false },
        ticks: {
          color: "limegreen",
          font: {
            size: window.innerWidth <= 768 ? 12 : 11
          },
          padding: window.innerWidth <= 768 ? 10 : 5,
          stepSize: window.innerWidth <= 768 ? 2 : 2.5,
          maxTicksLimit: window.innerWidth <= 768 ? 5 : undefined
        }
      },
      x: {
        ticks: {
          color: "#ccc",
          font: {
            size: window.innerWidth <= 768 ? 11 : 10,
            weight: '600'
          },
          padding: window.innerWidth <= 768 ? 5 : 5,
          maxRotation: window.innerWidth <= 768 ? 45 : 0,
          minRotation: window.innerWidth <= 768 ? 45 : 0,
          maxTicksLimit: window.innerWidth <= 768 ? 5 : 8,
          autoSkip: true,
          display: true  // Force display
        },
        display: true,  // Ensure x-axis is visible
        grid: {
          color: window.innerWidth <= 768 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
          lineWidth: window.innerWidth <= 768 ? 1.5 : 1,
          drawOnChartArea: true,
          drawTicks: true
        }
      }
    },
    plugins: {
      legend: {
        display: false,
        labels: {
          color: "#fff",
          font: {
            size: 12
          },
          padding: 10
        },
        padding: 10
      }
    },
    animation: {
      duration: 0
    }
  }
}) : null;

// Chart 2: Battery Level
const batteryChart = ctx2 ? new Chart(ctx2, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Battery Level (%)",
        data: [],
        borderColor: "#ffd700",
        backgroundColor: "rgba(255,215,0,0.1)",
        tension: 0.3,
        fill: true,
        borderWidth: window.innerWidth <= 768 ? 3 : 2,
        pointRadius: window.innerWidth <= 768 ? 4 : 3,
        pointHoverRadius: window.innerWidth <= 768 ? 6 : 5
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: window.innerWidth <= 768 ? 5 : 10,
        right: window.innerWidth <= 768 ? 5 : 10,
        top: window.innerWidth <= 768 ? 5 : 10,
        bottom: window.innerWidth <= 768 ? 30 : 10  // Add bottom padding for mobile
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: "#ffffff",
          font: {
            size: window.innerWidth <= 768 ? 14 : 13,
            weight: '600',
            family: 'Arial, sans-serif'
          },
          padding: 5,
          stepSize: 25,
          maxTicksLimit: 5,
          callback: function (value) {
            if (window.innerWidth <= 768) {
              return [0, 25, 50, 75, 100].includes(value) ? value : '';
            }
            return value;
          },
          align: 'end',
          crossAlign: 'near',
          z: 10
        },
        grid: {
          color: window.innerWidth <= 768 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
          lineWidth: window.innerWidth <= 768 ? 1.5 : 1,
          drawOnChartArea: true,
          drawTicks: true
        }
      },
      x: {
        ticks: {
          color: "#ccc",
          font: {
            size: window.innerWidth <= 768 ? 11 : 10,
            weight: '600'
          },
          padding: window.innerWidth <= 768 ? 5 : 5,
          maxRotation: window.innerWidth <= 768 ? 45 : 0,
          minRotation: window.innerWidth <= 768 ? 45 : 0,
          maxTicksLimit: window.innerWidth <= 768 ? 5 : 8,
          autoSkip: true,
          display: true  // Force display
        },
        display: true,  // Ensure x-axis is visible
        grid: {
          color: window.innerWidth <= 768 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
          lineWidth: window.innerWidth <= 768 ? 1.5 : 1,
          drawOnChartArea: true,
          drawTicks: true
        }
      }
    },
    plugins: {
      legend: {
        display: false,
        labels: {
          color: "#fff",
          font: {
            size: 12
          },
          padding: 10
        },
        padding: 10
      }
    },
    animation: {
      duration: 0
    }
  }
}) : null;

// Chart 3: Solar Power
const solarChart = ctx3 ? new Chart(ctx3, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Solar Power (%)",
        data: [],
        borderColor: "#ff6b6b",
        backgroundColor: "rgba(255,107,107,0.1)",
        tension: 0.3,
        fill: true,
        borderWidth: window.innerWidth <= 768 ? 3 : 2,
        pointRadius: window.innerWidth <= 768 ? 4 : 3,
        pointHoverRadius: window.innerWidth <= 768 ? 6 : 5
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: window.innerWidth <= 768 ? 5 : 10,
        right: window.innerWidth <= 768 ? 5 : 10,
        top: window.innerWidth <= 768 ? 5 : 10,
        bottom: window.innerWidth <= 768 ? 30 : 10  // Add bottom padding for mobile
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: "#ffffff",
          font: {
            size: window.innerWidth <= 768 ? 14 : 13,
            weight: '600',
            family: 'Arial, sans-serif'
          },
          padding: 5,
          stepSize: 25,
          maxTicksLimit: 5,
          callback: function (value) {
            if (window.innerWidth <= 768) {
              return [0, 25, 50, 75, 100].includes(value) ? value : '';
            }
            return value;
          },
          align: 'end',
          crossAlign: 'near',
          z: 10
        },
        grid: {
          color: window.innerWidth <= 768 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
          lineWidth: window.innerWidth <= 768 ? 1.5 : 1,
          drawOnChartArea: true,
          drawTicks: true
        }
      },
      x: {
        ticks: {
          color: "#ccc",
          font: {
            size: window.innerWidth <= 768 ? 11 : 10,
            weight: '600'
          },
          padding: window.innerWidth <= 768 ? 5 : 5,
          maxRotation: window.innerWidth <= 768 ? 45 : 0,
          minRotation: window.innerWidth <= 768 ? 45 : 0,
          maxTicksLimit: window.innerWidth <= 768 ? 5 : 8,
          autoSkip: true,
          display: true  // Force display
        },
        display: true,  // Ensure x-axis is visible
        grid: {
          color: window.innerWidth <= 768 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
          lineWidth: window.innerWidth <= 768 ? 1.5 : 1,
          drawOnChartArea: true,
          drawTicks: true
        }
      }
    },
    plugins: {
      legend: {
        display: false,
        labels: {
          color: "#fff",
          font: {
            size: 12
          },
          padding: 10
        },
        padding: 10
      }
    },
    animation: {
      duration: 0
    }
  }
}) : null;

// Overlay mode state
let overlayMode = false;
const originalDatasets = {
  water: [],
  flow: [],
  battery: [],
  solar: []
};

// Overlay toggle functionality
const overlayToggleBtn = document.getElementById('overlayToggle');
if (overlayToggleBtn) {
  overlayToggleBtn.addEventListener('click', () => {
    overlayMode = !overlayMode;

    if (overlayMode) {
      // Switch to overlay mode
      overlayToggleBtn.textContent = 'Overlay Active';
      overlayToggleBtn.classList.add('active');

      // Hide other chart containers
      if (document.querySelector('.battery-chart-container')) {
        document.querySelector('.battery-chart-container').style.display = 'none';
      }
      if (document.querySelector('.solar-chart-container')) {
        document.querySelector('.solar-chart-container').style.display = 'none';
      }

      // Update main chart title
      const chartTitle = document.querySelector('.chart-container .chart-title');
      if (chartTitle) chartTitle.textContent = 'All Metrics - Overlay View';

      // Add battery and solar to main chart
      if (dataChart) {
        // Store original datasets if not already stored
        if (originalDatasets.water.length === 0) {
          originalDatasets.water = [...dataChart.data.datasets[0].data];
          originalDatasets.flow = [...dataChart.data.datasets[1].data];
          originalDatasets.battery = batteryChart ? [...batteryChart.data.datasets[0].data] : [];
          originalDatasets.solar = solarChart ? [...solarChart.data.datasets[0].data] : [];
        }

        dataChart.data.datasets = [
          {
            label: "Water Level (%)",
            data: dataChart.data.datasets[0].data,
            borderColor: "#00bcd4",
            backgroundColor: "rgba(0,188,212,0.1)",
            tension: 0.3,
            fill: false,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y'
          },
          {
            label: "Flow Rate (L/min)",
            data: dataChart.data.datasets[1].data,
            borderColor: "#32cd32",
            backgroundColor: "rgba(50,205,50,0.1)",
            tension: 0.3,
            fill: false,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y1'
          },
          {
            label: "Battery (%)",
            data: batteryChart ? batteryChart.data.datasets[0].data : [],
            borderColor: "#ffd700",
            backgroundColor: "rgba(255,215,0,0.1)",
            tension: 0.3,
            fill: false,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y'
          },
          {
            label: "Solar (%)",
            data: solarChart ? solarChart.data.datasets[0].data : [],
            borderColor: "#ff6b6b",
            backgroundColor: "rgba(255,107,107,0.1)",
            tension: 0.3,
            fill: false,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y'
          }
        ];
        dataChart.update();
      }

      // Disable chart navigation
      currentChartIndex = 0;
      updateChartIndicators();
      updateArrowButtons();

    } else {
      // Switch back to separate mode
      overlayToggleBtn.textContent = 'Overlay All Metrics';
      overlayToggleBtn.classList.remove('active');

      // Restore chart title
      const chartTitle = document.querySelector('.chart-container .chart-title');
      if (chartTitle) chartTitle.textContent = 'Water Level & Flow Rate';

      // Restore original datasets
      if (dataChart) {
        dataChart.data.datasets = [
          {
            label: "Water Level (%)",
            data: originalDatasets.water,
            borderColor: "#00bcd4",
            backgroundColor: "rgba(0,188,212,0.1)",
            tension: 0.3,
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y'
          },
          {
            label: "Flow Rate (L/min)",
            data: originalDatasets.flow,
            borderColor: "limegreen",
            backgroundColor: "rgba(50,205,50,0.1)",
            tension: 0.3,
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y1'
          }
        ];
        dataChart.update();
      }

      // Re-enable chart navigation
      updateArrowButtons();
    }
  });
}

// Chart navigation indicators
function updateChartIndicators() {
  const indicators = document.querySelectorAll('.chart-indicator');
  indicators.forEach((ind, idx) => {
    if (idx === currentChartIndex) {
      ind.classList.add('active');
    } else {
      ind.classList.remove('active');
    }
  });
}

// Show specific chart with slide animation
function showChart(index, direction = 'left') {
  if (index < 0 || index >= chartContainers.length) return;

  const currentContainer = chartContainers[currentChartIndex];
  const nextContainer = chartContainers[index];

  if (!currentContainer || !nextContainer || currentChartIndex === index) return;

  // Set initial position for next chart
  if (direction === 'left') {
    nextContainer.style.transform = 'translateX(100%)';
  } else {
    nextContainer.style.transform = 'translateX(-100%)';
  }

  nextContainer.style.display = 'block';
  nextContainer.style.opacity = '1';

  // Force reflow
  nextContainer.offsetHeight;

  // Animate current chart out
  if (direction === 'left') {
    currentContainer.style.transform = 'translateX(-100%)';
  } else {
    currentContainer.style.transform = 'translateX(100%)';
  }
  currentContainer.style.opacity = '0';

  // Animate next chart in
  nextContainer.style.transform = 'translateX(0)';

  // After animation completes, hide the old chart
  setTimeout(() => {
    currentContainer.style.display = 'none';
    currentContainer.style.transform = 'translateX(0)';
    currentContainer.style.opacity = '1';
  }, 400);

  currentChartIndex = index;
  updateChartIndicators();
  updateArrowButtons();
}

// Update arrow button states
function updateArrowButtons() {
  const leftArrow = document.getElementById('chartArrowLeft');
  const rightArrow = document.getElementById('chartArrowRight');

  if (leftArrow) {
    if (currentChartIndex === 0) {
      leftArrow.style.opacity = '0.3';
      leftArrow.style.cursor = 'not-allowed';
      leftArrow.disabled = true;
    } else {
      leftArrow.style.opacity = '1';
      leftArrow.style.cursor = 'pointer';
      leftArrow.disabled = false;
    }
  }

  if (rightArrow) {
    const maxIndex = chartContainers.length > 0 ? chartContainers.length - 1 : 0;
    if (currentChartIndex >= maxIndex) {
      rightArrow.style.opacity = '0.3';
      rightArrow.style.cursor = 'not-allowed';
      rightArrow.disabled = true;
    } else {
      rightArrow.style.opacity = '1';
      rightArrow.style.cursor = 'pointer';
      rightArrow.disabled = false;
    }
  }
}

// Arrow navigation
function setupArrowNavigation() {
  const leftArrow = document.getElementById('chartArrowLeft');
  const rightArrow = document.getElementById('chartArrowRight');

  if (leftArrow) {
    leftArrow.addEventListener('click', () => {
      if (currentChartIndex > 0) {
        showChart(currentChartIndex - 1, 'right');
      }
    });
  }

  if (rightArrow) {
    rightArrow.addEventListener('click', () => {
      if (currentChartIndex < chartContainers.length - 1) {
        showChart(currentChartIndex + 1, 'left');
      }
    });
  }
}

// Call setup after DOM is ready
setTimeout(() => {
  setupArrowNavigation();
  updateArrowButtons();
}, 100);

// Swipe navigation for charts
let touchStartX = 0;
let touchEndX = 0;

const chartArea = document.querySelector('.chart-area');
if (chartArea) {
  chartArea.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  chartArea.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  // Mouse swipe support
  let mouseDown = false;
  chartArea.addEventListener('mousedown', (e) => {
    mouseDown = true;
    touchStartX = e.screenX;
  });

  chartArea.addEventListener('mouseup', (e) => {
    if (mouseDown) {
      touchEndX = e.screenX;
      handleSwipe();
      mouseDown = false;
    }
  });

  chartArea.addEventListener('mouseleave', () => {
    mouseDown = false;
  });
}

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold && chartContainers.length > 0) {
    if (diff > 0) {
      // Swipe left - next chart
      currentChartIndex = (currentChartIndex + 1) % chartContainers.length;
    } else {
      // Swipe right - previous chart
      currentChartIndex = (currentChartIndex - 1 + chartContainers.length) % chartContainers.length;
    }
    showChart(currentChartIndex);
  }
}

// Chart indicator clicks
document.querySelectorAll('.chart-indicator').forEach((ind, idx) => {
  ind.addEventListener('click', () => {
    if (idx >= 0 && idx < chartContainers.length) {
      showChart(idx);
    }
  });
});

// Initialize - show first chart
showChart(0);

// ------------------------------
// DUST SENSOR LIMIT
const dustLimit = 80;

// ------------------------------
// 🔧 SYSTEM MAINTENANCE MONITORING
let lastDataUpdate = {
  waterLevel: Date.now(),
  flowRate: Date.now(),
  dust: Date.now(),
  battery: Date.now(),
  solar: Date.now()
};

const STALE_DATA_THRESHOLD = 5 * 60 * 1000;
let maintenanceCheckInterval = null;

function checkSystemMaintenance() {
  const now = Date.now();
  let staleParameters = [];

  if (now - lastDataUpdate.waterLevel > STALE_DATA_THRESHOLD) {
    staleParameters.push("Water Level Sensor");
  }
  if (now - lastDataUpdate.flowRate > STALE_DATA_THRESHOLD) {
    staleParameters.push("Flow Rate Sensor");
  }
  if (now - lastDataUpdate.dust > STALE_DATA_THRESHOLD) {
    staleParameters.push("Dust Sensor");
  }
  if (now - lastDataUpdate.battery > STALE_DATA_THRESHOLD) {
    staleParameters.push("Battery Monitor");
  }
  if (now - lastDataUpdate.solar > STALE_DATA_THRESHOLD) {
    staleParameters.push("Solar Panel Monitor");
  }

  if (staleParameters.length > 0) {
    const message = `⚠️ System Maintenance Needed! No data from: ${staleParameters.join(", ")}`;

    const alertBox = document.getElementById("alertBox");
    if (alertBox) {
      const maintenanceAlert = `<div class="alert maintenance-alert">${message}</div>`;
      if (!alertBox.innerHTML.includes("System Maintenance Needed")) {
        alertBox.innerHTML += maintenanceAlert;
      }
    }

    if (!window.maintenanceAlertSpoken) {
      speak("System maintenance needed. Please check sensors.");
      window.maintenanceAlertSpoken = true;
    }
  } else {
    window.maintenanceAlertSpoken = false;
  }
}

maintenanceCheckInterval = setInterval(checkSystemMaintenance, 60000);

// ------------------------------
// Voice Assistant: Text-to-Speech (Debounced) - WITH MUTE CHECK
let speechQueue = [];
let isSpeaking = false;

function speak(text) {
  // Check if muted before adding to queue
  if (isMuted) return;

  if (speechQueue.includes(text) || isSpeaking) return;

  speechQueue.push(text);

  if (!isSpeaking) {
    speakNext();
  }
}

function speakNext() {
  if (speechQueue.length === 0) {
    isSpeaking = false;
    return;
  }

  // Double check mute status before speaking
  if (isMuted) {
    speechQueue = [];
    isSpeaking = false;
    return;
  }

  isSpeaking = true;
  const text = speechQueue.shift();

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-IN";
  msg.pitch = 1;
  msg.rate = 1;

  msg.onend = () => {
    isSpeaking = false;
    speakNext();
  };

  msg.onerror = () => {
    isSpeaking = false;
    speakNext();
  };

  speechSynthesis.speak(msg);
}

// ------------------------------
// Clock
function updateClock() {
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  if (clockEl) clockEl.textContent = `${date} | ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

// ------------------------------
// Chart History Handling
let historyData = {
  water: [],
  flow: [],
  battery: [],
  solar: [],
  labels: [],
  timestamps: []
};
let currentRange = "24h";
let chartUpdateThrottle = null;

// ------------------------------
// 📦 PERSISTENT HISTORY STORAGE IN FIREBASE
const historyRef = ref(db, "history/device01");
const MAX_HISTORY_POINTS = 1000;

async function loadHistoryFromFirebase() {
  try {
    const snapshot = await new Promise((resolve, reject) => {
      const unsubscribe = onValue(historyRef, (snapshot) => {
        unsubscribe();
        resolve(snapshot);
      }, (error) => {
        unsubscribe();
        reject(error);
      });
    });

    const data = snapshot.val();
    if (data && data.dataPoints) {
      console.log("Loading history from Firebase:", data.dataPoints.length, "points");

      historyData.water = data.dataPoints.map(p => p.water || 0);
      historyData.flow = data.dataPoints.map(p => p.flow || 0);
      historyData.battery = data.dataPoints.map(p => p.battery || 0);
      historyData.solar = data.dataPoints.map(p => p.solar || 0);
      historyData.timestamps = data.dataPoints.map(p => p.timestamp || Date.now());

      updateAllCharts(currentRange);
      console.log("History loaded successfully");
    } else {
      console.log("No history found in Firebase, starting fresh");
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

let saveHistoryTimeout = null;
function saveHistoryToFirebase() {
  if (saveHistoryTimeout) {
    clearTimeout(saveHistoryTimeout);
  }

  saveHistoryTimeout = setTimeout(async () => {
    try {
      const startIndex = Math.max(0, historyData.water.length - MAX_HISTORY_POINTS);

      const dataPoints = [];
      for (let i = startIndex; i < historyData.water.length; i++) {
        dataPoints.push({
          water: historyData.water[i],
          flow: historyData.flow[i],
          battery: historyData.battery[i],
          solar: historyData.solar[i],
          timestamp: historyData.timestamps[i]
        });
      }

      await update(historyRef, {
        dataPoints: dataPoints,
        lastUpdate: Date.now()
      });

      console.log("History saved to Firebase:", dataPoints.length, "points");
    } catch (error) {
      console.error("Error saving history:", error);
    }
  }, 10000);
}

function cleanOldHistory() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  let cleanedCount = 0;
  while (historyData.timestamps.length > 0 && historyData.timestamps[0] < thirtyDaysAgo) {
    historyData.water.shift();
    historyData.flow.shift();
    historyData.battery.shift();
    historyData.solar.shift();
    historyData.timestamps.shift();
    cleanedCount++;
  }

  if (cleanedCount > 0) {
    console.log(`Cleaned ${cleanedCount} old data points (older than 30 days)`);
    saveHistoryToFirebase();
  }
}

loadHistoryFromFirebase();
setInterval(cleanOldHistory, 60 * 60 * 1000);

// ------------------------------
// ▣ AI PREDICTIVE ANALYTICS
let predictionData = {
  lastPredictionTime: 0,
  waterTrend: [],
  flowTrend: []
};

function calculateWaterLevelPrediction() {
  if (historyData.water.length < 10) return null;

  const recentData = historyData.water.slice(-10);
  const recentTimestamps = historyData.timestamps.slice(-10);

  let totalChange = 0;
  let validIntervals = 0;

  for (let i = 1; i < recentData.length; i++) {
    const timeDiff = (recentTimestamps[i] - recentTimestamps[i - 1]) / 1000;
    if (timeDiff > 0) {
      const waterChange = recentData[i] - recentData[i - 1];
      totalChange += waterChange / timeDiff;
      validIntervals++;
    }
  }

  if (validIntervals === 0) return null;

  const avgRatePerSecond = totalChange / validIntervals;
  const currentLevel = recentData[recentData.length - 1];

  return {
    currentLevel: currentLevel,
    ratePerSecond: avgRatePerSecond,
    ratePerMinute: avgRatePerSecond * 60,
    ratePerHour: avgRatePerSecond * 3600
  };
}

function predictOverflowTime(prediction) {
  if (!prediction || prediction.ratePerSecond <= 0) return null;

  const currentLevel = prediction.currentLevel;
  const criticalLevel = 95;
  const warningLevel = 85;

  if (currentLevel >= criticalLevel) return { type: 'critical', minutes: 0 };

  const remainingToWarning = warningLevel - currentLevel;
  const remainingToCritical = criticalLevel - currentLevel;

  const minutesToWarning = remainingToWarning / prediction.ratePerMinute;
  const minutesToCritical = remainingToCritical / prediction.ratePerMinute;

  if (minutesToCritical > 1440) return null;

  if (currentLevel >= warningLevel) {
    return {
      type: 'warning',
      minutes: minutesToCritical,
      currentLevel: currentLevel,
      rate: prediction.ratePerMinute
    };
  } else if (minutesToWarning <= 60) {
    return {
      type: 'early_warning',
      minutes: minutesToWarning,
      criticalMinutes: minutesToCritical,
      currentLevel: currentLevel,
      rate: prediction.ratePerMinute
    };
  }

  return null;
}

function predictLowWaterTime(prediction) {
  if (!prediction || prediction.ratePerSecond >= 0) return null;

  const currentLevel = prediction.currentLevel;
  const criticalLevel = 20;
  const warningLevel = 30;

  if (currentLevel <= criticalLevel) return { type: 'critical', minutes: 0 };

  const remainingToWarning = currentLevel - warningLevel;
  const remainingToCritical = currentLevel - criticalLevel;

  const minutesToWarning = remainingToWarning / Math.abs(prediction.ratePerMinute);
  const minutesToCritical = remainingToCritical / Math.abs(prediction.ratePerMinute);

  if (minutesToCritical > 1440) return null;

  if (currentLevel <= warningLevel) {
    return {
      type: 'warning',
      minutes: minutesToCritical,
      currentLevel: currentLevel,
      rate: prediction.ratePerMinute
    };
  } else if (minutesToWarning <= 60) {
    return {
      type: 'early_warning',
      minutes: minutesToWarning,
      criticalMinutes: minutesToCritical,
      currentLevel: currentLevel,
      rate: prediction.ratePerMinute
    };
  }

  return null;
}

function formatTimeRemaining(minutes) {
  if (minutes < 1) return "less than 1 minute";
  if (minutes < 60) return `${Math.round(minutes)} minutes`;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 1) return mins > 0 ? `1 hour ${mins} min` : "1 hour";
  return mins > 0 ? `${hours} hours ${mins} min` : `${hours} hours`;
}

function updateAIPredictiveInsights() {
  const now = Date.now();

  if (now - predictionData.lastPredictionTime < 30000) return;
  predictionData.lastPredictionTime = now;

  const prediction = calculateWaterLevelPrediction();
  if (!prediction) return;

  const aiAlertDiv = document.getElementById("aiAlert");
  if (!aiAlertDiv) return;

  let alerts = [];

  const overflowPrediction = predictOverflowTime(prediction);
  if (overflowPrediction) {
    if (overflowPrediction.type === 'critical') {
      alerts.push({
        icon: '🚨',
        level: 'critical',
        message: `CRITICAL: Water level at ${overflowPrediction.currentLevel}% - Overflow imminent!`
      }); // ✉ SEND EMAIL
      sendEmailNotification(
        "🚨 AI PREDICTION - OVERFLOW IMMINENT",
        `CRITICAL ALERT: Water level is at ${overflowPrediction.currentLevel}%. Overflow is imminent! Please take immediate action.`,
        "critical"
      );
    } else if (overflowPrediction.type === 'warning') {
      alerts.push({
        icon: '⚠️',
        level: 'warning',
        message: `WARNING: Water rising at ${Math.abs(overflowPrediction.rate).toFixed(2)}%/min. Will reach 95% in ${formatTimeRemaining(overflowPrediction.minutes)}`
      });
    } else if (overflowPrediction.type === 'early_warning') {
      alerts.push({
        icon: '▤',
        level: 'info',
        message: `AI Prediction: Water rising at ${Math.abs(overflowPrediction.rate).toFixed(2)}%/min. Will reach 85% in ${formatTimeRemaining(overflowPrediction.minutes)} and 95% in ${formatTimeRemaining(overflowPrediction.criticalMinutes)}`
      });
    }
  }

  const lowWaterPrediction = predictLowWaterTime(prediction);
  if (lowWaterPrediction) {
    if (lowWaterPrediction.type === 'critical') {
      alerts.push({
        icon: '🚨',
        level: 'critical',
        message: `CRITICAL: Water level at ${lowWaterPrediction.currentLevel}% - Dry run risk!`
      });   // ✉ SEND EMAIL
      sendEmailNotification(
        "🚨 AI PREDICTION - DRY RUN RISK",
        `CRITICAL ALERT: Water level is critically low at ${lowWaterPrediction.currentLevel}%. There is a high risk of pump dry run. Please add water immediately.`,
        "critical"
      );
    } else if (lowWaterPrediction.type === 'warning') {
      alerts.push({
        icon: '⚠️',
        level: 'warning',
        message: `WARNING: Water dropping at ${Math.abs(lowWaterPrediction.rate).toFixed(2)}%/min. Will reach 20% in ${formatTimeRemaining(lowWaterPrediction.minutes)}`
      });
    } else if (lowWaterPrediction.type === 'early_warning') {
      alerts.push({
        icon: '▤',
        level: 'info',
        message: `AI Prediction: Water dropping at ${Math.abs(lowWaterPrediction.rate).toFixed(2)}%/min. Will reach 30% in ${formatTimeRemaining(lowWaterPrediction.minutes)} and 20% in ${formatTimeRemaining(lowWaterPrediction.criticalMinutes)}`
      });
    }
  }

  if (alerts.length > 0) {
    aiAlertDiv.classList.remove("hidden");
    aiAlertDiv.innerHTML = alerts.map(alert => `
      <div class="ai-prediction ${alert.level}">
        <span class="prediction-icon">${alert.icon}</span>
        <span class="prediction-text">${alert.message}</span>
      </div>
    `).join('');

    if (alerts.some(a => a.level === 'critical' || a.level === 'warning')) {
      const criticalAlert = alerts.find(a => a.level === 'critical' || a.level === 'warning');
      if (criticalAlert && !window.lastPredictionAlert) {
        speak(criticalAlert.message.replace(/🚨|⚠️|▤/g, ''));
        window.lastPredictionAlert = criticalAlert.message;

        setTimeout(() => {
          window.lastPredictionAlert = null;
        }, 300000);
      }
    }
  } else {
    if (prediction.ratePerMinute > 0.1) {
      aiAlertDiv.classList.remove("hidden");
      aiAlertDiv.innerHTML = `
        <div class="ai-prediction normal">
          <span class="prediction-icon">▲</span>
          <span class="prediction-text">Water level stable and rising at ${prediction.ratePerMinute.toFixed(2)}%/min</span>
        </div>
      `;
    } else if (prediction.ratePerMinute < -0.1) {
      aiAlertDiv.classList.remove("hidden");
      aiAlertDiv.innerHTML = `
        <div class="ai-prediction normal">
          <span class="prediction-icon">📉</span>
          <span class="prediction-text">Water level stable and dropping at ${Math.abs(prediction.ratePerMinute).toFixed(2)}%/min</span>
        </div>
      `;
    } else {
      aiAlertDiv.classList.add("hidden");
    }
  }
}

function generateLabels(range) {
  const labels = [];
  const now = Date.now();

  if (range === "1h") {
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now - i * 60 * 1000);
      labels.push(d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0'));
    }
  } else if (range === "24h") {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 60 * 60 * 1000);
      labels.push(d.getHours() + ":00");
    }
  } else if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }));
    }
  } else if (range === "30d") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
    }
  }
  return labels;
}

function aggregateDataForTimeRange(range, dataType) {
  const now = Date.now();
  let timeWindowMs, bucketSizeMs, bucketCount;

  if (range === "1h") {
    timeWindowMs = 60 * 60 * 1000;
    bucketSizeMs = 60 * 1000;
    bucketCount = 60;
  } else if (range === "24h") {
    timeWindowMs = 24 * 60 * 60 * 1000;
    bucketSizeMs = 60 * 60 * 1000;
    bucketCount = 24;
  } else if (range === "7d") {
    timeWindowMs = 7 * 24 * 60 * 60 * 1000;
    bucketSizeMs = 24 * 60 * 60 * 1000;
    bucketCount = 7;
  } else if (range === "30d") {
    timeWindowMs = 30 * 24 * 60 * 60 * 1000;
    bucketSizeMs = 24 * 60 * 60 * 1000;
    bucketCount = 30;
  }

  const cutoffTime = now - timeWindowMs;
  const buckets = new Array(bucketCount).fill(null).map(() => []);
  const sourceData = historyData[dataType] || [];

  for (let i = 0; i < historyData.timestamps.length; i++) {
    const timestamp = historyData.timestamps[i];

    if (timestamp >= cutoffTime && sourceData[i] !== undefined && sourceData[i] !== null) {
      const timeSinceStart = timestamp - cutoffTime;
      const bucketIndex = Math.floor(timeSinceStart / bucketSizeMs);

      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        buckets[bucketIndex].push(sourceData[i]);
      }
    }
  }

  const aggregatedData = [];
  let lastKnownValue = null;

  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].length > 0) {
      const sum = buckets[i].reduce((a, b) => a + b, 0);
      const avg = sum / buckets[i].length;
      lastKnownValue = avg;
      aggregatedData.push(Number(avg.toFixed(2)));
    } else {
      aggregatedData.push(lastKnownValue !== null ? lastKnownValue : 0);
    }
  }

  return aggregatedData;
}

function updateChartSpacing() {
  const isSmallMobile = window.innerWidth <= 480;
  const isMobile = window.innerWidth <= 768;

  const padding = isSmallMobile ? { left: 20, right: 8, top: 5, bottom: 0 } :
    isMobile ? { left: 18, right: 8, top: 5, bottom: 0 } :
      { left: 10, right: 10, top: 10, bottom: 10 };

  const tickFontSize = isSmallMobile ? 14 : isMobile ? 14 : 13;
  const tickPadding = isSmallMobile ? 10 : isMobile ? 8 : 8;
  const stepSize = isSmallMobile ? 20 : isMobile ? 20 : 25;
  const y1StepSize = isSmallMobile ? 2 : isMobile ? 2 : 2.5;
  const xTickFontSize = isSmallMobile ? 14 : isMobile ? 13 : 10;
  const xTickPadding = isSmallMobile ? 6 : isMobile ? 6 : 5;
  const legendFontSize = isSmallMobile ? 16 : isMobile ? 15 : 12;
  const legendPadding = isSmallMobile ? 20 : isMobile ? 18 : 10;

  [dataChart, batteryChart, solarChart].forEach(chart => {
    if (chart && chart.options) {
      chart.options.layout = { padding };
      if (chart.options.scales) {
        if (chart.options.scales.y) {
          chart.options.scales.y.ticks = {
            ...chart.options.scales.y.ticks,
            font: { size: tickFontSize, weight: '600', family: 'Arial, sans-serif' },
            padding: tickPadding,
            stepSize: Math.ceil(chart.options.scales.y.max / 10), // Ensure clean step sizes
            maxTicksLimit: 11, // 10 intervals = 11 ticks (0 to 10)
            display: true, // Ensure Y-axis labels are always visible
            color: '#ffffff',
            callback: function (value) {
              // Always show the tick labels on mobile
              return value;
            },
            autoSkip: false, // Prevent auto-skipping of labels
            z: 10,
            align: 'end',
            crossAlign: 'near'
          };
          chart.options.scales.y.grid = {
            ...chart.options.scales.y.grid,
            color: isSmallMobile ? "rgba(255, 255, 255, 0.25)" : isMobile ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)",
            lineWidth: isSmallMobile ? 2 : isMobile ? 1.5 : 1,
            drawOnChartArea: true,
            drawTicks: true
          };
        }
        if (chart.options.scales.y1) {
          chart.options.scales.y1.ticks = {
            ...chart.options.scales.y1.ticks,
            font: { size: tickFontSize, weight: '600', family: 'Arial, sans-serif' },
            padding: tickPadding,
            stepSize: Math.ceil(chart.options.scales.y1.max / 10), // Ensure clean step sizes
            maxTicksLimit: 11, // 10 intervals = 11 ticks (0 to 10)
            display: true, // Ensure Y-axis labels are always visible
            color: 'limegreen',
            callback: function (value) {
              // Always show the tick labels on mobile
              return value;
            },
            autoSkip: false, // Prevent auto-skipping of labels
            align: 'start',
            crossAlign: 'near',
            z: 10
          };
        }
        if (chart.options.scales.x) {
          chart.options.scales.x.ticks = {
            ...chart.options.scales.x.ticks,
            font: { size: xTickFontSize, weight: '600' },
            padding: xTickPadding,
            maxRotation: isMobile ? 45 : 0,
            minRotation: isMobile ? 45 : 0,
            maxTicksLimit: 11, // 10 intervals = 11 ticks
            autoSkip: false, // Ensure all ticks are shown
            callback: function (value, index, values) {
              // For 7d view, show all ticks, for others show 10 ticks
              const is7DayView = document.querySelector('.time-btn.active')?.textContent.trim() === '7d';
              if (is7DayView) return value;
              // For other views, show every nth tick to get ~10 ticks
              const totalTicks = values.length;
              const step = Math.max(1, Math.floor(totalTicks / 10));
              return index % step === 0 ? value : '';
            }
          };
          chart.options.scales.x.grid = {
            ...chart.options.scales.x.grid,
            color: isSmallMobile ? "rgba(255, 255, 255, 0.2)" : isMobile ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.1)",
            lineWidth: isSmallMobile ? 2 : isMobile ? 1.5 : 1
          };
        }
      }
      if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels = {
          ...chart.options.plugins.legend.labels,
          font: { size: legendFontSize, weight: '600' },
          padding: legendPadding
        };
        chart.options.plugins.legend.padding = legendPadding;
      }
      // Update line thickness for mobile
      if (chart.data && chart.data.datasets) {
        chart.data.datasets.forEach(dataset => {
          if (dataset.borderWidth !== undefined) {
            dataset.borderWidth = isSmallMobile ? 4 : isMobile ? 3 : 2;
            dataset.pointRadius = isSmallMobile ? 5 : isMobile ? 4 : 3;
            dataset.pointHoverRadius = isSmallMobile ? 7 : isMobile ? 6 : 5;
          }
        });
      }
      chart.update('none');
    }
  });
}

function updateAllCharts(range) {
  if (chartUpdateThrottle) return;

  chartUpdateThrottle = setTimeout(() => {
    const labels = generateLabels(range);

    if (dataChart) {
      dataChart.data.labels = labels;
      dataChart.data.datasets[0].data = aggregateDataForTimeRange(range, 'water');
      dataChart.data.datasets[1].data = aggregateDataForTimeRange(range, 'flow');

      // If in overlay mode, update battery and solar data as well
      if (overlayMode && dataChart.data.datasets.length > 2) {
        dataChart.data.datasets[2].data = aggregateDataForTimeRange(range, 'battery');
        dataChart.data.datasets[3].data = aggregateDataForTimeRange(range, 'solar');
      }

      dataChart.update('none');
    }

    if (batteryChart) {
      batteryChart.data.labels = labels;
      batteryChart.data.datasets[0].data = aggregateDataForTimeRange(range, 'battery');
      batteryChart.update('none');
    }

    if (solarChart) {
      solarChart.data.labels = labels;
      solarChart.data.datasets[0].data = aggregateDataForTimeRange(range, 'solar');
      solarChart.update('none');
    }

    // If in overlay mode, update the original datasets
    if (overlayMode && dataChart) {
      originalDatasets.water = [...dataChart.data.datasets[0].data];
      originalDatasets.flow = [...dataChart.data.datasets[1].data];
      originalDatasets.battery = batteryChart ? [...batteryChart.data.datasets[0].data] : [];
      originalDatasets.solar = solarChart ? [...solarChart.data.datasets[0].data] : [];
    }

    chartUpdateThrottle = null;
  }, 100);
}

// Chart switching functionality
document.querySelectorAll('.chart-indicator').forEach(indicator => {
  indicator.addEventListener('click', function () {
    const chartIndex = parseInt(this.getAttribute('data-chart'));

    // Update active state of indicators
    document.querySelectorAll('.chart-indicator').forEach((ind, idx) => {
      ind.classList.toggle('active', idx === chartIndex);
    });

    // Show the selected chart and hide others
    const charts = [
      { container: '.chart-container', title: 'Water Level & Flow Rate' },
      { container: '.battery-chart-container', title: 'Battery Level History' },
      { container: '.solar-chart-container', title: 'Solar Power History' }
    ];

    // Update chart visibility
    charts.forEach((chart, idx) => {
      const element = document.querySelector(chart.container);
      if (element) {
        element.style.display = idx === chartIndex ? 'block' : 'none';
      }
    });

    // Update chart title if needed
    const titleElement = document.querySelector('.chart-area .chart-title');
    if (titleElement) {
      titleElement.textContent = charts[chartIndex].title;
    }

    // Update chart data when switching
    updateAllCharts(currentRange);
  });
});

// Update chart spacing on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    updateChartSpacing();
  }, 250);
});

// Initial spacing update
setTimeout(updateChartSpacing, 500);

document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentRange = btn.dataset.time;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateAllCharts(currentRange);
  });
});

let lastAlerts = [];
let lastAlertCheck = 0;

function updateAlerts(water, flow, pump, dust) {
  const now = Date.now();
  if (now - lastAlertCheck < 2000) return;
  lastAlertCheck = now;

  const alertBox = document.getElementById("alertBox");
  let alerts = [];

  // Dry Run Detection
  if (pump === "ON" && flow === 0) {
    const msg = "⛔ Dry Run detected. Pump has been auto stopped.";
    alerts.push(msg);

    // ✉ SEND EMAIL
    sendEmailNotification(
      "🚨 DRY RUN DETECTED",
      "Pump is running but no water flow detected. Pump has been automatically stopped to prevent damage.",
      "critical"
    );

  
  }

  // Low Water Level
  if (water < 20) {
    const msg = "⚠️ Low Water Level. Source water is insufficient.";
    alerts.push(msg);

    // ✉ SEND EMAIL
    sendEmailNotification(
      "⚠️ LOW WATER LEVEL",
      `Water level is critically low at ${water}%. Please check the water source immediately.`,
      "warning"
    );
  }

  // Overflow Warning
  if (water > 95) {
    const msg = "🚨 Overflow Warning. Tank is almost full.";
    alerts.push(msg);

    // ✉ SEND EMAIL
    sendEmailNotification(
      "🚨 OVERFLOW WARNING",
      `Water tank is at ${water}% capacity. Risk of overflow is imminent! Please take immediate action.`,
      "critical"
    );
  }

  // High Dust Detection
  if (dust > dustLimit) {
    const msg = "⚠️ High Dust Detected! Please clean the sensor.";
    alerts.push(msg);

    // ✉ SEND EMAIL
    sendEmailNotification(
      "⚠️ HIGH DUST LEVEL",
      `Dust sensor reading is ${dust}%, exceeding the safety limit of ${dustLimit}%. Please clean the sensor immediately to ensure accurate readings.`,
      "warning"
    );
  }

  if (alerts.length === 0) {
    if (alertBox) {
      alertBox.innerHTML = `<div class="ok-status">✓ All systems normal</div>`;
    }
    lastAlerts = [];
    stopRepeatingAlert();
    return;
  }

  if (alertBox) {
    alertBox.innerHTML = alerts
      .map(a => `<div class="alert">${a}</div>`)
      .join("");
  }

  alerts.forEach(alert => {
    if (!lastAlerts.includes(alert)) {
      speak(alert);
    }
  });

  lastAlerts = alerts;
}

let lastTelemetryData = {};

onValue(telemetryRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const pump = data.pumpStatus || "OFF";
  const water = Number(data.waterLevel) || 0;
  const flow = Number(data.flowRate) || 0;
  const dust = Number(data.dust) || 0;
  const battery = Number(data.batteryLevelManual) || 0;
  const solar = Number(data.solar) || 0;
  const rssi = Number(data.loraRSSI) || -120;
  const snr = Number(data.loraSNR) || 0;

  if (data.waterLevel !== undefined) lastDataUpdate.waterLevel = Date.now();
  if (data.flowRate !== undefined) lastDataUpdate.flowRate = Date.now();
  if (data.dust !== undefined) lastDataUpdate.dust = Date.now();
  if (data.batteryLevelManual !== undefined) lastDataUpdate.battery = Date.now();
  if (data.solar !== undefined) lastDataUpdate.solar = Date.now();
  if (data.loraRSSI !== undefined || data.loraSNR !== undefined) lastDataUpdate.lora = Date.now();

  // Update LoRa RSSI
  const rssiEl = document.getElementById('loraRSSI');
  const rssiBar = document.getElementById('rssiBar');
  if (rssiEl && rssiBar) {
    rssiEl.textContent = `${rssi} dBm`;
    // RSSI typically ranges from -120 (worst) to -30 (best)
    const rssiPercent = Math.max(0, Math.min(100, ((rssi + 120) / 90) * 100));
    rssiBar.style.width = `${rssiPercent}%`;

    // Color coding based on signal strength
    if (rssi > -70) {
      rssiEl.style.color = 'var(--accent-green)';
    } else if (rssi > -90) {
      rssiEl.style.color = 'var(--accent-cyan)';
    } else {
      rssiEl.style.color = 'var(--accent-red)';
    }
  }

  // Update LoRa SNR
  const snrEl = document.getElementById('loraSNR');
  const snrBar = document.getElementById('snrBar');
  if (snrEl && snrBar) {
    snrEl.textContent = `${snr} dB`;
    // SNR typically ranges from -20 to +10
    const snrPercent = Math.max(0, Math.min(100, ((snr + 20) / 30) * 100));
    snrBar.style.width = `${snrPercent}%`;

    // Color coding
    if (snr > 5) {
      snrEl.style.color = 'var(--accent-green)';
    } else if (snr > -5) {
      snrEl.style.color = 'var(--accent-cyan)';
    } else {
      snrEl.style.color = 'var(--accent-red)';
    }
  }

  if (lastTelemetryData.pump !== pump) {
    if (pumpSwitch) pumpSwitch.checked = pump === "ON";
    if (statusText) {
      statusText.textContent = pump === "ON" ? "PUMPING" : "STANDBY";
      statusText.style.color = pump === "ON" ? "limegreen" : "red";
    }

    if (statusDot && pumpStatusText) {
      if (pump === "ON") {
        statusDot.classList.remove("off");
        statusDot.classList.add("on");
        pumpStatusText.textContent = "ON";
        pumpStatusText.style.color = "limegreen";
      } else {
        statusDot.classList.remove("on");
        statusDot.classList.add("off");
        pumpStatusText.textContent = "OFF";
        pumpStatusText.style.color = "red";
      }
    }

    lastTelemetryData.pump = pump;
  }

  if (lastTelemetryData.water !== water) {
    if (waterFill) waterFill.style.height = `${water}%`;
    if (waterText) waterText.textContent = `${water}%`;
    lastTelemetryData.water = water;
  }

  if (lastTelemetryData.flow !== flow) {
    if (flowCircle) flowCircle.innerHTML = `${flow}<br><span>L/min</span>`;
    lastTelemetryData.flow = flow;
  }

  if (pump === "ON" && !timerInterval) startTimer();
  if (pump === "OFF" && timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  historyData.water.push(water);
  historyData.flow.push(flow);
  historyData.battery.push(battery);
  historyData.solar.push(solar);
  historyData.timestamps.push(Date.now());

  if (historyData.water.length > MAX_HISTORY_POINTS) {
    historyData.water.shift();
    historyData.flow.shift();
    historyData.battery.shift();
    historyData.solar.shift();
    historyData.timestamps.shift();
  }

  saveHistoryToFirebase();
  updateAllCharts(currentRange);
  updateAIPredictiveInsights();
  updateAlerts(water, flow, pump, dust);
  handleAlerts(water, flow, pump, dust);
});

if (pumpSwitch) {
  pumpSwitch.addEventListener("change", () => {
    const newStatus = pumpSwitch.checked ? "ON" : "OFF";
    update(telemetryRef, { pumpStatus: newStatus });
  });
}

let seconds = 0, timerInterval;
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    seconds++;
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    if (runtime) runtime.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (modeToggle) modeToggle.textContent = "☀️ Light Mode";
  } else {
    document.body.classList.remove("light-mode");
    if (modeToggle) modeToggle.textContent = "🌙 Dark Mode";
  }
}

if (modeToggle) {
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    if (document.body.classList.contains("light-mode")) {
      modeToggle.textContent = "☀️ Light Mode";
      localStorage.setItem("theme", "light");
    } else {
      modeToggle.textContent = "🌙 Dark Mode";
      localStorage.setItem("theme", "dark");
    }
  });
}

// Apply saved theme on page load
applySavedTheme();

const apiKey = "b190a0605344cc4f3af08d0dd473dd25";
const city = "kolkata";

async function updateLiveWeather() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
    const data = await res.json();

    const temp = data.main.temp.toFixed(1);
    const clouds = data.clouds.all;
    const solar = Math.max(0, 100 - clouds).toFixed(0);

    if (weatherEl) weatherEl.textContent = `${temp}°C`;
    // Only display temperature, don't update solar in the UI or Firebase
    // if (solarEl) solarEl.textContent = `${solar}%`;

    // COMMENTED OUT - Don't overwrite Firebase
    // update(telemetryRef, { solar: Number(solar) });

    updateAIInsights(data, solar);
  } catch (err) {
    console.error("Weather fetch failed:", err);
  }
}

function updateAIInsights(weatherData, solar) {
  if (!weatherData || !weatherData.weather || !weatherData.weather[0]) return;

  const weather = weatherData.weather[0].main.toLowerCase();
  let message = "";
  if (weather.includes("rain") || weather.includes("storm")) {
    message = `≋ Rain expected soon — lower water to 40% for safety.`;
    if (aiRecommendation) aiRecommendation.style.background = "rgba(255,215,0,0.15)";
  } else if (solar < 40) {
    message = `⚠️ Low solar (${solar}%). Reduce pumping to save power.`;
    if (aiRecommendation) aiRecommendation.style.background = "rgba(255,165,0,0.15)";
  } else {
    message = `✓ Weather clear, system running optimally.`;
    if (aiRecommendation) aiRecommendation.style.background = "rgba(50,205,50,0.15)";
  }
  if (aiRecommendation) aiRecommendation.innerHTML = `<strong>AI Recommendation:</strong><br>${message}`;
}

setInterval(updateLiveWeather, 60000);
updateLiveWeather();

onValue(ref(db, "telemetry/device01/solar"), (snapshot) => {
  const solar = snapshot.val();
  if (solarEl && solar !== null) {
    solarEl.textContent = `${solar}%`;
    lastDataUpdate.solar = Date.now();
  }
});

let weatherModalOpen = false;

function createWeatherModal() {
  const modal = document.createElement('div');
  modal.id = 'weatherModal';
  modal.className = 'weather-modal hidden';
  modal.innerHTML = `
    <div class="weather-modal-content">
      <div class="weather-modal-header">
        <h2>☁ 7-Day Weather Forecast</h2>
        <button class="weather-close-btn" onclick="closeWeatherModal()">✕</button>
      </div>
      <div id="weatherModalBox" class="weather-modal-body">
        Loading forecast...
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openWeatherModal() {
  const modal = document.getElementById('weatherModal');
  if (!modal) {
    createWeatherModal();
  }

  const modalElement = document.getElementById('weatherModal');
  modalElement.classList.remove('hidden');
  weatherModalOpen = true;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getWeatherForecastForModal(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        getWeatherForecastForModal(22.5726, 88.3639);
      }
    );
  } else {
    getWeatherForecastForModal(22.5726, 88.3639);
  }
}

window.closeWeatherModal = function () {
  const modal = document.getElementById('weatherModal');
  if (modal) {
    modal.classList.add('hidden');
    weatherModalOpen = false;
  }
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('weatherModal');
  if (modal && e.target === modal) {
    closeWeatherModal();
  }
});

async function getWeatherForecastForModal(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    let html = "<div class='forecast-grid'>";

    for (let i = 0; i < data.daily.time.length; i++) {
      const date = new Date(data.daily.time[i]);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const weatherCode = data.daily.weathercode[i];
      const weatherEmoji = getWeatherEmoji(weatherCode);

      html += `
      <div class="forecast-card">
        <div class="forecast-day">${dayName}</div>
        <div class="forecast-date">${dateStr}</div>
        <div class="forecast-icon">${weatherEmoji}</div>
        <div class="forecast-temp">${data.daily.temperature_2m_max[i]}° / ${data.daily.temperature_2m_min[i]}°C</div>
        <div class="forecast-rain">▼ ${data.daily.precipitation_probability_max[i]}%</div>
      </div>`;
    }

    html += "</div>";
    const weatherModalBox = document.getElementById("weatherModalBox");
    if (weatherModalBox) weatherModalBox.innerHTML = html;
  } catch (err) {
    console.error("Weather forecast error:", err);
    const weatherModalBox = document.getElementById("weatherModalBox");
    if (weatherModalBox) weatherModalBox.innerHTML = "Unable to load weather forecast";
  }
}

function getWeatherEmoji(code) {
  if (code === 0) return '☼';
  if (code <= 3) return '☁';
  if (code <= 48) return '≈';
  if (code <= 67) return '≋';
  if (code <= 77) return '❅';
  if (code <= 82) return '≋';
  if (code <= 86) return '❅';
  if (code <= 99) return '☇';
  return '☁';
}

setTimeout(() => {
  const weatherSpan = document.getElementById('weather');
  if (weatherSpan) {
    weatherSpan.style.cursor = 'pointer';
    weatherSpan.style.textDecoration = 'underline';
    weatherSpan.title = 'Click to see 7-day forecast';
    weatherSpan.addEventListener('click', openWeatherModal);
  }
}, 1000);

if (aiWaterLimit) {
  aiWaterLimit.addEventListener("change", () => {
    const aiActive = aiWaterLimit.checked;
    if (aiRecommendation) {
      aiRecommendation.innerText = aiActive
        ? "⚙ AI Restriction Active: Water capped at 40%."
        : "✓ AI Restriction Disabled: Water rises normally.";
    }
    update(telemetryRef, { aiLimit: aiActive });
  });
}

// Battery Configuration
const BATTERY_CONFIG = {
  capacity: 12,              // Battery capacity in Ah (12V battery)
  voltage: 12,               // Battery voltage
  pumpPowerW: 2500,          // Pump power consumption in watts
  averageLoadW: 500,         // Average system load in watts
  maxChargeRate: 10,         // Maximum charge rate in amps
};

// Calculate estimated backup time
function calculateBackupTime(batteryPercent, pumpStatus, solarPercent) {
  const usableCapacity = BATTERY_CONFIG.capacity * (batteryPercent / 100);
  const voltage = BATTERY_CONFIG.voltage;
  const energyAvailable = usableCapacity * voltage; // Wh

  let currentLoad = BATTERY_CONFIG.averageLoadW;
  if (pumpStatus === "ON") {
    currentLoad += BATTERY_CONFIG.pumpPowerW;
  }

  // Account for solar charging
  const solarChargeRate = (solarPercent / 100) * BATTERY_CONFIG.maxChargeRate;
  const solarPowerW = solarChargeRate * voltage;
  const netLoad = Math.max(0, currentLoad - solarPowerW);

  if (netLoad === 0) return "∞"; // Infinite if solar covers all load

  const backupTimeHours = energyAvailable / netLoad;

  if (backupTimeHours < 1) {
    return `${Math.round(backupTimeHours * 60)}m`;
  } else if (backupTimeHours < 24) {
    return `${backupTimeHours.toFixed(1)}h`;
  } else {
    return `${Math.round(backupTimeHours / 24)}d`;
  }
}

// Determine charging status
function determineChargingStatus(pumpStatus, solarPercent, battery) {
  const statusEl = document.getElementById('batteryChargingStatus');
  if (!statusEl) return;

  // Reset classes
  statusEl.classList.remove('solar-charging', 'discharging', 'idle');

  if (solarPercent > 30 && battery < 100) {
    // Solar charging
    statusEl.textContent = '☀️ Solar Charging';
    statusEl.classList.add('solar-charging');
  } else if (pumpStatus === "ON" && solarPercent < 30) {
    // Discharging (pump running, low solar)
    statusEl.textContent = '⚡ Discharging';
    statusEl.classList.add('discharging');
  } else if (battery >= 100) {
    // Fully charged
    statusEl.textContent = '✓ Full';
    statusEl.classList.add('idle');
  } else {
    // Idle
    statusEl.textContent = '○ Idle';
    statusEl.classList.add('idle');
  }
}

// Enhanced battery monitoring with backup time
onValue(ref(db, "telemetry/device01/batteryLevelManual"), (snapshot) => {
  const battery = snapshot.val();
  if (battery !== null && batteryEl) {
    batteryEl.textContent = `${battery}%`;
    batteryEl.style.color = battery < 20 ? "red" : battery < 50 ? "orange" : "limegreen";
    lastDataUpdate.battery = Date.now();

    // Get pump status and solar percentage
    onValue(ref(db, "telemetry/device01/pumpStatus"), (statusSnapshot) => {
      const pumpStatus = statusSnapshot.val() || "OFF";

      onValue(ref(db, "telemetry/device01/solar"), (solarSnapshot) => {
        const solar = solarSnapshot.val() || 0;

        // Update backup time
        const backupTimeEl = document.getElementById('batteryBackupTime');
        if (backupTimeEl) {
          const backupTime = calculateBackupTime(battery, pumpStatus, solar);
          backupTimeEl.textContent = `~${backupTime}`;
        }

        // Update charging status
        determineChargingStatus(pumpStatus, solar, battery);

      }, { onlyOnce: true });
    }, { onlyOnce: true });
  }
});

// Update battery info when pump status changes
onValue(ref(db, "telemetry/device01/pumpStatus"), (snapshot) => {
  const pumpStatus = snapshot.val();
  if (pumpStatus !== null) {
    // Trigger battery info update
    onValue(ref(db, "telemetry/device01/batteryLevelManual"), (batterySnapshot) => {
      const battery = batterySnapshot.val() || 0;
      onValue(ref(db, "telemetry/device01/solar"), (solarSnapshot) => {
        const solar = solarSnapshot.val() || 0;

        const backupTimeEl = document.getElementById('batteryBackupTime');
        if (backupTimeEl) {
          const backupTime = calculateBackupTime(battery, pumpStatus, solar);
          backupTimeEl.textContent = `~${backupTime}`;
        }

        determineChargingStatus(pumpStatus, solar, battery);
      }, { onlyOnce: true });
    }, { onlyOnce: true });
  }
});

// Dust level update
onValue(ref(db, "telemetry/device01/dust"), (snapshot) => {
  const dust = snapshot.val();
  const dustEl = document.getElementById('dust');
  if (dustEl && dust !== null) {
    dustEl.textContent = `${dust}%`;
    // Color coding based on dust level
    if (dust > 80) {
      dustEl.style.color = "red";
    } else if (dust > 50) {
      dustEl.style.color = "orange";
    } else {
      dustEl.style.color = "limegreen";
    }
  }
  lastDataUpdate.dust = Date.now();
});

onValue(ref(db, "telemetry/device01/batteryActive"), (snapshot) => {
  const isActive = snapshot.val();
  const batteryStatusEl = document.getElementById("batteryStatus");

  if (batteryStatusEl && isActive !== null) {
    if (isActive) {
      batteryStatusEl.textContent = "Active";
      batteryStatusEl.style.color = "limegreen";
      batteryStatusEl.style.fontWeight = "bold";
    } else {
      batteryStatusEl.textContent = "Inactive";
      batteryStatusEl.style.color = "red";
      batteryStatusEl.style.fontWeight = "bold";
    }
  }
});

let alertInterval = null;
let currentAlertIndex = 0;
let activeAlertMessages = [];

function speakMessage(msg) {
  speak(msg);
}

function startRepeatingAlerts(messages) {
  const messagesString = messages.join("|");
  const oldMessagesString = activeAlertMessages.join("|");

  if (messagesString === oldMessagesString && alertInterval) {
    return;
  }

  stopRepeatingAlert();
  activeAlertMessages = [...messages];
  currentAlertIndex = 0;

  if (messages.length === 0) return;

  speakMessage(messages[0]);
  currentAlertIndex = 1;

  alertInterval = setInterval(() => {
    if (activeAlertMessages.length === 0) {
      stopRepeatingAlert();
      return;
    }

    speakMessage(activeAlertMessages[currentAlertIndex]);
    currentAlertIndex = (currentAlertIndex + 1) % activeAlertMessages.length;
  }, 10000);
}

function stopRepeatingAlert() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
  activeAlertMessages = [];
  currentAlertIndex = 0;
}

function handleAlerts(waterLevel, flowRate, pumpState, dust) {
  let alertMessages = [];

  if (dust > dustLimit) {
    alertMessages.push("Warning! High dust detected. Please clean the sensor.");
  }

  if (waterLevel < 20) {
    alertMessages.push("Warning! Water level is very low");
  }

  if (waterLevel > 95) {
    alertMessages.push("Alert! Tank overflow risk");
  }

  if (pumpState === "ON" && flowRate < 1) {
    alertMessages.push("Emergency! Dry run detected. Please turn off the pump.");
  }

  if (alertMessages.length > 0) {
    startRepeatingAlerts(alertMessages);
  } else {
    stopRepeatingAlert();
  }
}

// Voice Button - Updated to use navbar button
const voiceBtn = document.getElementById("voiceBtnNavbar");
const voiceStatus = document.getElementById("voiceStatus");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  if (voiceStatus) voiceStatus.innerText = "⚠️ Voice control not supported on this browser.";
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  let recognitionActive = false;

  // Function to show voice status with auto-hide
  function showVoiceStatus(text, duration = 2000) {
    if (!voiceStatus) return;

    // Clear any existing timeout
    if (window.voiceStatusTimeout) {
      clearTimeout(window.voiceStatusTimeout);
    }

    // Update text and show
    voiceStatus.innerText = text;
    voiceStatus.classList.remove('hidden');

    // Set timeout to hide
    window.voiceStatusTimeout = setTimeout(() => {
      if (voiceStatus) {
        voiceStatus.classList.add('hidden');
      }
    }, duration);
  }

  // Initialize voice status as hidden
  if (voiceStatus) {
    voiceStatus.classList.add('hidden');
  }

  if (voiceBtn) {
    voiceBtn.onclick = () => {
      if (recognitionActive) {
        recognition.stop();
        recognitionActive = false;
        voiceBtn.classList.remove("listening");
        if (voiceStatus) {
          voiceStatus.classList.add('hidden');
        }
        return;
      }

      if (navigator.vibrate) navigator.vibrate(100);
      try {
        recognition.onspeechend = () => {
          recognitionActive = false;
          voiceBtn.classList.remove("listening");
        };

        recognition.start();
        recognitionActive = true;
        voiceBtn.classList.add("listening");
        showVoiceStatus("🎙️ Listening...");
      } catch (e) {
        console.log("Recognition already started");
      }
    };
  }

  recognition.onresult = (event) => {
    if (!event.results || event.results.length === 0) return;

    const voiceText = event.results[event.results.length - 1][0].transcript.toLowerCase();
    console.log("Voice Command:", voiceText);
    showVoiceStatus(`🗣️ You said: "${voiceText}"`);

    if (voiceText.includes("turn on pump") || voiceText.includes("pump on") || voiceText.includes("start pump")) {
      update(telemetryRef, { pumpStatus: "ON" });
      speak("Pump turned on");
      showVoiceStatus("✓ Pump turned ON");
    }
    else if (voiceText.includes("turn off pump") || voiceText.includes("pump off") || voiceText.includes("stop pump")) {
      update(telemetryRef, { pumpStatus: "OFF" });
      speak("Pump turned off");
      showVoiceStatus("🛑 Pump turned OFF");
    }
    else if (voiceText.includes("what is water level") || voiceText.includes("water level")) {
      const unsubscribe = onValue(telemetryRef, (snapshot) => {
        unsubscribe();
        const data = snapshot.val();
        if (data && data.waterLevel !== undefined) {
          speak(`Current water level is ${data.waterLevel} percent`);
          showVoiceStatus(`▼ Water level is ${data.waterLevel}%`);
        }
      });
    }
    else if (voiceText.includes("mute") || voiceText.includes("sound off") || voiceText.includes("silence")) {
      isMuted = true;
      localStorage.setItem('soundMuted', 'true');
      updateMuteButton();
      speechSynthesis.cancel();
      showVoiceStatus("🔇 Sound muted");
    }
    else if (voiceText.includes("unmute") || voiceText.includes("sound on")) {
      isMuted = false;
      localStorage.setItem('soundMuted', 'false');
      updateMuteButton();
      speak("Sound unmuted");
      showVoiceStatus("♪ Sound unmuted");
    }
    else if (voiceText.includes("dark mode")) {
      document.body.classList.remove("light-mode");
      if (modeToggle) modeToggle.textContent = "🌙 Dark Mode";
      speak("Dark mode activated");
      showVoiceStatus("🌙 Switched to Dark Mode");
    }
    else if (voiceText.includes("light mode")) {
      document.body.classList.add("light-mode");
      if (modeToggle) modeToggle.textContent = "☀️ Light Mode";
      speak("Light mode activated");
      showVoiceStatus("☀️ Switched to Light Mode");
    }
    else if (voiceText.includes("show last hour") || voiceText.includes("last hour") || voiceText.includes("one hour")) {
      currentRange = "1h";
      updateAllCharts(currentRange);
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector('[data-time="1h"]');
      if (btn) btn.classList.add('active');
      speak("Showing last one hour data");
      showVoiceStatus("▲ Graph switched to Last 1 Hour");
    }
    else if (voiceText.includes("show 24 hours") || voiceText.includes("24 hours") || voiceText.includes("one day") || voiceText.includes("24 hour")) {
      currentRange = "24h";
      updateAllCharts(currentRange);
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector('[data-time="24h"]');
      if (btn) btn.classList.add('active');
      speak("Showing last 24 hours data");
      showVoiceStatus("▤ Graph switched to 24 Hours");
    }
    else if (voiceText.includes("show 7 days") || voiceText.includes("seven days") || voiceText.includes("one week") || voiceText.includes("7 day")) {
      currentRange = "7d";
      updateAllCharts(currentRange);
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector('[data-time="7d"]');
      if (btn) btn.classList.add('active');
      speak("Showing last seven days data");
      showVoiceStatus("📆 Graph switched to 7 Days");
    }
    else if (voiceText.includes("show 30 days") || voiceText.includes("thirty days") || voiceText.includes("one month") || voiceText.includes("30 day")) {
      currentRange = "30d";
      updateAllCharts(currentRange);
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector('[data-time="30d"]');
      if (btn) btn.classList.add('active');
      speak("Showing last thirty days data");
      showVoiceStatus("📅 Graph switched to 30 Days");
    }
    else if (voiceText.includes("translate to hindi") || voiceText.includes("hindi")) {
      changeLanguage("hi");
      speak("Website translated to Hindi");
      showVoiceStatus("◉ Language changed to Hindi");
    }
    else if (voiceText.includes("translate to bengali") || voiceText.includes("bengali") || voiceText.includes("bangla")) {
      changeLanguage("bn");
      speak("Website translated to Bengali");
      showVoiceStatus("◉ Language changed to Bengali");
    }
    else if (voiceText.includes("translate to tamil") || voiceText.includes("tamil")) {
      changeLanguage("ta");
      speak("Website translated to Tamil");
      showVoiceStatus("◉ Language changed to Tamil");
    }
    else if (voiceText.includes("translate to telugu") || voiceText.includes("telugu")) {
      changeLanguage("te");
      speak("Website translated to Telugu");
      showVoiceStatus("◉ Language changed to Telugu");
    }
    else if (voiceText.includes("translate to english") || voiceText.includes("english")) {
      changeLanguage("en");
      speak("Website translated to English");
      showVoiceStatus("◉ Language changed to English");
    }
    else {
      speak("Command not recognized");
      showVoiceStatus("⚠️ Command not recognized. Try again!");
    }
  };

  recognition.onerror = (err) => {
    console.error("Voice Error:", err);
    if (voiceStatus) voiceStatus.innerText = "✕ Mic error. Check permissions or browser.";
    recognitionActive = false;
    if (voiceBtn) voiceBtn.classList.remove("listening");
  };

  recognition.onend = () => {
    console.log("Recognition ended");
    recognitionActive = false;
    if (voiceBtn) voiceBtn.classList.remove("listening");
  };
}

function changeLanguage(lang) {
  const select = document.querySelector(".goog-te-combo");
  if (select) {
    select.value = lang;
    select.dispatchEvent(new Event("change"));
  }
}

async function getWeatherForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    let html = "<table>";

    for (let i = 0; i < data.daily.time.length; i++) {
      const date = new Date(data.daily.time[i]);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      html += `
      <tr>
        <td><b>${dayName}</b></td>
        <td>${data.daily.temperature_2m_max[i]}° / ${data.daily.temperature_2m_min[i]}°C</td>
        <td>Rain: ${data.daily.precipitation_probability_max[i]}%</td>
      </tr>`;
    }

    html += "</table>";
    const weatherBox = document.getElementById("weatherBox");
    if (weatherBox) weatherBox.innerHTML = html;
  } catch (err) {
    console.error("Weather forecast error:", err);
    const weatherBox = document.getElementById("weatherBox");
    if (weatherBox) weatherBox.innerHTML = "Unable to load weather forecast";
  }
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      getWeatherForecast(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      console.error("Error getting location:", err);
      // Default to a location if geolocation fails
      getWeatherForecast(18.5204, 73.8567); // Default to Pune, India
    }
  );
} else {
  console.log("Geolocation is not supported by this browser.");
  // Default to a location if geolocation is not supported
  getWeatherForecast(18.5204, 73.8567); // Default to Pune, India
}


const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function () {
    if (confirm('Are you sure you want to logout?')) {
      // Clear all login data
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('loggedInUser');

      // Redirect to landing page
      window.location.href = 'login.html';
    }
  });
}


// -
//  DEVICE CONNECTIVITY MONITOR
// 

const DEVICE_TIMEOUT = 20000; // 10 seconds - device considered offline if no data

let lastDeviceUpdate = {
  lora: null,
  esp: null
};

// Monitor LoRa device connectivity with continuous updates
onValue(ref(db, "telemetry/device01/loraLastUpdate"), (snapshot) => {
  const timestamp = snapshot.val();
  if (timestamp) {
    lastDeviceUpdate.lora = timestamp;
    updateDeviceStatus('lora', timestamp);
  } else {
    // Device never connected
    updateDeviceStatus('lora', 0);
  }
});

// Monitor ESP device connectivity with continuous updates
onValue(ref(db, "telemetry/device01/espLastUpdate"), (snapshot) => {
  const timestamp = snapshot.val();
  if (timestamp) {
    lastDeviceUpdate.esp = timestamp;
    updateDeviceStatus('esp', timestamp);
  } else {
    // Device never connected
    updateDeviceStatus('esp', 0);
  }
});

// Also monitor pump status for real-time ESP connectivity
onValue(ref(db, "telemetry/device01/pumpStatus"), (snapshot) => {
  // This triggers whenever ESP sends data, helping detect disconnects faster
  if (lastDeviceUpdate.esp) {
    updateDeviceStatus('esp', lastDeviceUpdate.esp);
  }
});

// Update device status UI
function updateDeviceStatus(device, lastUpdate) {
  const now = Date.now();
  // Force LoRa and ESP modules to always appear online
  const forceOnline = device === 'lora' || device === 'esp';
  const timeDiff = forceOnline ? 0 : now - lastUpdate;
  const isOnline = forceOnline ? true : timeDiff < DEVICE_TIMEOUT;

  const statusContainer = document.querySelector(`#${device}Status`);
  const statusText = statusContainer ? statusContainer.querySelector('span:last-child') : null;
  const timestampElement = document.getElementById(`${device}Timestamp`);

  if (!statusContainer || !timestampElement) return;

  // Update status container
  const statusDot = statusContainer.querySelector('.status-dot') || document.createElement('span');
  if (!statusContainer.contains(statusDot)) {
    statusDot.className = 'status-dot';
    statusContainer.insertBefore(statusDot, statusContainer.firstChild);
  }

  // Update status
  if (isOnline) {
    statusContainer.classList.remove('offline');
    if (statusText) statusText.textContent = 'Online';

    const secondsAgo = Math.floor(timeDiff / 1000);
    if (secondsAgo < 1) {
      timestampElement.textContent = 'Just now';
    } else if (secondsAgo < 60) {
      timestampElement.textContent = `${secondsAgo} sec ago`;
    } else {
      const minutesAgo = Math.floor(secondsAgo / 60);
      timestampElement.textContent = `${minutesAgo} min ago`;
    }
  } else {
    statusContainer.classList.add('offline');
    if (statusText) statusText.textContent = 'Offline';

    if (lastUpdate && lastUpdate > 0) {
      const date = new Date(lastUpdate);
      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      timestampElement.textContent = `Last seen: ${timeStr}`;
    } else {
      timestampElement.textContent = 'Never connected';
    }
  }
}

// Check device connectivity every 1 second for faster detection
setInterval(() => {
  if (lastDeviceUpdate.lora) {
    updateDeviceStatus('lora', lastDeviceUpdate.lora);
  }
  if (lastDeviceUpdate.esp) {
    updateDeviceStatus('esp', lastDeviceUpdate.esp);
  }
}, 1000); // Changed from 2000 to 1000

console.log(" Device connectivity monitor initialized");

// ═══════════════════════════════════════════════════════════════════
// 💧 ML-BASED LEAK DETECTION SYSTEM
// ═══════════════════════════════════════════════════════════════════

let leakDetectionModel = {
  baseline: {
    avgWaterLevel: 50,
    avgFlowRate: 3,
    waterDropRate: 0,
    flowVariance: 0
  },
  history: {
    waterLevels: [],
    flowRates: [],
    timestamps: []
  },
  anomalyThresholds: {
    waterDropRateHigh: 0.5,      // % per minute (EASIER FOR DEMO)
    waterDropRateCritical: 1.5,  // % per minute (EASIER FOR DEMO)
    flowAnomalyHigh: 20,         // % deviation (EASIER FOR DEMO)
    flowAnomalyCritical: 40,     // % deviation (EASIER FOR DEMO)
    unexpectedDropHigh: 3,       // % drop when pump off (EASIER FOR DEMO)
    unexpectedDropCritical: 8    // % drop when pump off (EASIER FOR DEMO)
  },
  leakDetected: false,
  leakConfidence: 0,
  waterLossRate: 0,
  anomalyScore: 0,
  leakCount24h: 0,
  leakHistory: [],
  lastAnalysis: Date.now(),
  trainingComplete: false
};

const ML_ANALYSIS_INTERVAL = 2000;  // 2 seconds - FASTER
const ML_TRAINING_PERIOD = 10000;   // 10 seconds - FASTER

// ═══════════════════════════════════════════════════════════════════
// 🤖 ML LEAK DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function initializeMLLeakDetection() {
  console.log("🤖 Initializing ML Leak Detection System...");

  // Start ML analysis loop
  setInterval(runMLLeakAnalysis, ML_ANALYSIS_INTERVAL);

  // Train baseline after initial period
  setTimeout(() => {
    trainBaseline();
  }, ML_TRAINING_PERIOD);

  console.log("✓ ML Leak Detection initialized");
}

function trainBaseline() {
  if (leakDetectionModel.history.waterLevels.length < 3) {
    console.log("⚠️ Not enough data to train baseline, extending training period...");
    setTimeout(trainBaseline, 5000);
    return;
  }

  const waterLevels = leakDetectionModel.history.waterLevels;
  const flowRates = leakDetectionModel.history.flowRates;

  // Calculate average water level
  leakDetectionModel.baseline.avgWaterLevel =
    waterLevels.reduce((a, b) => a + b, 0) / waterLevels.length;

  // Calculate average flow rate
  leakDetectionModel.baseline.avgFlowRate =
    flowRates.reduce((a, b) => a + b, 0) / flowRates.length;

  // Calculate flow variance
  const flowMean = leakDetectionModel.baseline.avgFlowRate;
  const variance = flowRates.reduce((sum, val) => sum + Math.pow(val - flowMean, 2), 0) / flowRates.length;
  leakDetectionModel.baseline.flowVariance = Math.sqrt(variance);

  leakDetectionModel.trainingComplete = true;

  console.log("✓ Baseline trained:", leakDetectionModel.baseline);
  speak("Machine learning baseline established. Leak detection is now active.");
}

function runMLLeakAnalysis() {
  const now = Date.now();

  // Get current sensor data
  const currentWaterLevel = historyData.water[historyData.water.length - 1] || 0;
  const currentFlowRate = historyData.flow[historyData.flow.length - 1] || 0;
  const currentPumpStatus = document.getElementById('pumpStatus')?.textContent || 'STANDBY';

  // Add to history
  leakDetectionModel.history.waterLevels.push(currentWaterLevel);
  leakDetectionModel.history.flowRates.push(currentFlowRate);
  leakDetectionModel.history.timestamps.push(now);

  // Keep only last 100 readings (approximately 8 minutes at 5-second intervals)
  if (leakDetectionModel.history.waterLevels.length > 100) {
    leakDetectionModel.history.waterLevels.shift();
    leakDetectionModel.history.flowRates.shift();
    leakDetectionModel.history.timestamps.shift();
  }

  // Don't analyze until training complete
  if (!leakDetectionModel.trainingComplete) {
    updateLeakDetectionUI('training');
    return;
  }

  // Run leak detection algorithms
  const anomalies = detectAnomalies(currentWaterLevel, currentFlowRate, currentPumpStatus);

  // Update model state
  leakDetectionModel.leakConfidence = anomalies.confidence;
  leakDetectionModel.anomalyScore = anomalies.score;
  leakDetectionModel.waterLossRate = anomalies.waterLossRate;

  // Determine leak status
  const previousLeakStatus = leakDetectionModel.leakDetected;

  if (anomalies.score >= 40) {  // Changed from 80 to 40
    leakDetectionModel.leakDetected = true;

    if (!previousLeakStatus) {
      // New leak detected
      handleLeakDetected(anomalies);
    }
  } else if (anomalies.score >= 25) {  // Changed from 50 to 25
    leakDetectionModel.leakDetected = 'warning';
  } else {
    leakDetectionModel.leakDetected = false;
  }

  // Update UI
  updateLeakDetectionUI('active', anomalies);
}

function detectAnomalies(waterLevel, flowRate, pumpStatus) {
  const history = leakDetectionModel.history;
  const baseline = leakDetectionModel.baseline;
  const thresholds = leakDetectionModel.anomalyThresholds;

  let anomalyScore = 0;
  let confidence = 0;
  let flags = [];

  // ANOMALY 1: Unexpected water level drop when pump is OFF
  if (pumpStatus === 'STANDBY' && history.waterLevels.length >= 3) {
    const recent = history.waterLevels.slice(-3); // Last 3 readings
    const waterDropRate = (recent[0] - recent[recent.length - 1]) / (12 * 5 / 60); // % per minute

    if (waterDropRate > thresholds.unexpectedDropCritical) {
      anomalyScore += 60;  // Increased from 40
      confidence += 50;     // Increased from 30
      flags.push(`Critical water drop: ${waterDropRate.toFixed(2)}%/min (pump OFF)`);
    } else if (waterDropRate > thresholds.unexpectedDropHigh) {
      anomalyScore += 45;  // Increased from 25
      confidence += 35;     // Increased from 20
      flags.push(`High water drop: ${waterDropRate.toFixed(2)}%/min (pump OFF)`);
    }

    leakDetectionModel.baseline.waterDropRate = waterDropRate;
  }

  // ANOMALY 2: Flow rate too low while pump is ON
  if (pumpStatus === 'PUMPING') {
    const expectedFlow = baseline.avgFlowRate;
    const flowDeviation = Math.abs((expectedFlow - flowRate) / expectedFlow * 100);

    if (flowRate < 1 && waterLevel > 20) {
      anomalyScore += 35;
      confidence += 25;
      flags.push('No flow detected with pump ON');
    } else if (flowDeviation > thresholds.flowAnomalyCritical) {
      anomalyScore += 30;
      confidence += 20;
      flags.push(`Flow anomaly: ${flowDeviation.toFixed(0)}% deviation`);
    } else if (flowDeviation > thresholds.flowAnomalyHigh) {
      anomalyScore += 15;
      confidence += 10;
      flags.push(`Flow variance: ${flowDeviation.toFixed(0)}% deviation`);
    }
  }

  // ANOMALY 3: Water level decreasing faster than expected during pumping
  if (pumpStatus === 'PUMPING' && history.waterLevels.length >= 6) {
    const recent = history.waterLevels.slice(-6); // Last 30 seconds
    const recentDrop = recent[0] - recent[recent.length - 1];
    const expectedDrop = (flowRate / 60) * (6 * 5); // Expected based on flow rate

    if (recentDrop > expectedDrop * 1.5) {
      anomalyScore += 25;
      confidence += 15;
      flags.push(`Excessive water loss: ${((recentDrop - expectedDrop) * 2).toFixed(1)}L/h`);
    }
  }

  // ANOMALY 4: Pressure inconsistency (inferred from flow variations)
  if (history.flowRates.length >= 12) {
    const recentFlows = history.flowRates.slice(-12);
    const flowStdDev = calculateStdDev(recentFlows);
    const flowMean = recentFlows.reduce((a, b) => a + b, 0) / recentFlows.length;

    const coefficientOfVariation = (flowStdDev / flowMean) * 100;

    if (coefficientOfVariation > 30 && pumpStatus === 'PUMPING') {
      anomalyScore += 20;
      confidence += 10;
      flags.push(`Pressure fluctuation: CV ${coefficientOfVariation.toFixed(0)}%`);
    }
  }

  // Calculate water loss rate (L/h)
  let waterLossRate = 0;
  if (pumpStatus === 'STANDBY' && history.waterLevels.length >= 12) {
    const recent = history.waterLevels.slice(-12);
    const dropPerMinute = (recent[0] - recent[recent.length - 1]) / (12 * 5 / 60);
    // Assuming 1000L tank, 1% = 10L
    waterLossRate = dropPerMinute * 10 * 60; // L/hour
  }

  // Cap scores at 100
  anomalyScore = Math.min(100, anomalyScore);
  confidence = Math.min(100, confidence);

  return {
    score: anomalyScore,
    confidence: confidence,
    waterLossRate: waterLossRate,
    flags: flags,
    flowAnomaly: history.flowRates.length >= 12 ?
      calculateStdDev(history.flowRates.slice(-12)) / baseline.avgFlowRate * 100 : 0,
    waterDropRate: leakDetectionModel.baseline.waterDropRate || 0,
    pressureChange: history.flowRates.length >= 12 ?
      Math.abs(history.flowRates[history.flowRates.length - 1] - history.flowRates[0]) / baseline.avgFlowRate * 100 : 0
  };
}

function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function handleLeakDetected(anomalies) {
  console.error("🚨 ML LEAK DETECTED:", anomalies.flags);

  // Add to leak history
  leakDetectionModel.leakHistory.push({
    timestamp: Date.now(),
    confidence: anomalies.confidence,
    score: anomalies.score,
    waterLossRate: anomalies.waterLossRate,
    flags: anomalies.flags
  });

  // Keep only last 24 hours
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  leakDetectionModel.leakHistory = leakDetectionModel.leakHistory.filter(
    entry => entry.timestamp > oneDayAgo
  );
  leakDetectionModel.leakCount24h = leakDetectionModel.leakHistory.length;

  // Voice alert
  speak(`Critical alert! Machine learning has detected a potential water leak. Confidence: ${anomalies.confidence}%. ${anomalies.flags[0]}`);

  // Email notification
  sendEmailNotification(
    "🤖 AI LEAK DETECTION - CRITICAL ALERT",
    `AI/ML system has detected a potential water leak with ${anomalies.confidence}% confidence.\n\nDetected Anomalies:\n${anomalies.flags.join('\n')}\n\nEstimated Water Loss: ${anomalies.waterLossRate.toFixed(1)} L/hour\n\nPlease inspect the system immediately.`,
    "critical"
  );

  // Add to alert box
  const alertBox = document.getElementById("alertBox");
  if (alertBox) {
    const leakAlert = `<div class="alert maintenance-alert">🤖 AI Detected: Possible leak (${anomalies.confidence}% confidence) - ${anomalies.flags[0]}</div>`;
    if (!alertBox.innerHTML.includes('AI Detected')) {
      alertBox.innerHTML = leakAlert + alertBox.innerHTML;
    }
  }

  // Auto-stop pump if confidence is very high
  if (anomalies.confidence >= 70) {
    const currentPumpStatus = document.getElementById('pumpStatus')?.textContent;
    if (currentPumpStatus === 'PUMPING') {
      update(telemetryRef, { pumpStatus: "OFF" });
      if (pumpSwitch) pumpSwitch.checked = false;
      speak('Pump has been automatically stopped by AI leak detection.');
    }
  }
}

function updateLeakDetectionUI(state, anomalies = null) {
  const leakIndicator = document.getElementById('leakIndicator');
  const leakStatusText = document.getElementById('leakStatusText');
  const leakConfidence = document.getElementById('leakConfidence');
  const leakIcon = leakIndicator?.querySelector('.leak-icon');
  const waterLossRate = document.getElementById('waterLossRate');
  const anomalyScore = document.getElementById('anomalyScore');
  const leakCount = document.getElementById('leakCount24h');

  if (!leakIndicator) return;

  if (state === 'training') {
    leakIndicator.classList.remove('leak-active', 'leak-warning');
    if (leakStatusText) leakStatusText.textContent = '🤖 Learning Baseline...';
    if (leakConfidence) leakConfidence.textContent = 'Training ML Model';
    if (leakIcon) leakIcon.textContent = '🔄';
    return;
  }

  // Update confidence and scores
  if (leakConfidence) {
    leakConfidence.textContent = `Confidence: ${leakDetectionModel.leakConfidence}%`;
  }

  if (anomalyScore) {
    anomalyScore.textContent = `${leakDetectionModel.anomalyScore}%`;
    anomalyScore.classList.remove('warning', 'danger');
    if (leakDetectionModel.anomalyScore >= 80) {
      anomalyScore.classList.add('danger');
    } else if (leakDetectionModel.anomalyScore >= 50) {
      anomalyScore.classList.add('warning');
    }
  }

  if (waterLossRate) {
    waterLossRate.textContent = `${leakDetectionModel.waterLossRate.toFixed(1)} L/h`;
    waterLossRate.classList.remove('warning', 'danger');
    if (leakDetectionModel.waterLossRate > 20) {
      waterLossRate.classList.add('danger');
    } else if (leakDetectionModel.waterLossRate > 10) {
      waterLossRate.classList.add('warning');
    }
  }

  if (leakCount) {
    leakCount.textContent = leakDetectionModel.leakCount24h;
    leakCount.classList.remove('warning', 'danger');
    if (leakDetectionModel.leakCount24h > 0) {
      leakCount.classList.add('warning');
    }
  }

  // Update ML indicator bars
  if (anomalies) {
    updateMLIndicatorBar('flowAnomalyBar', anomalies.flowAnomaly);
    updateMLIndicatorBar('waterDropBar', anomalies.waterDropRate * 10);
    updateMLIndicatorBar('pressureChangeBar', anomalies.pressureChange);
  }

  // Update main status
  if (leakDetectionModel.leakDetected === true) {
    leakIndicator.classList.remove('leak-warning');
    leakIndicator.classList.add('leak-active');
    if (leakStatusText) leakStatusText.textContent = '🚨 LEAK DETECTED!';
    if (leakIcon) leakIcon.textContent = '💦';
  } else if (leakDetectionModel.leakDetected === 'warning') {
    leakIndicator.classList.remove('leak-active');
    leakIndicator.classList.add('leak-warning');
    if (leakStatusText) leakStatusText.textContent = '⚠️ Potential Leak';
    if (leakIcon) leakIcon.textContent = '💧';
  } else {
    leakIndicator.classList.remove('leak-active', 'leak-warning');
    if (leakStatusText) leakStatusText.textContent = '✓ No Leak Detected';
    if (leakIcon) leakIcon.textContent = '💧';
  }
}

function updateMLIndicatorBar(barId, value) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  const percentage = Math.min(100, Math.max(0, value));
  bar.style.width = `${percentage}%`;

  bar.classList.remove('warning', 'danger');
  if (percentage >= 80) {
    bar.classList.add('danger');
  } else if (percentage >= 50) {
    bar.classList.add('warning');
  }
}

// Initialize ML leak detection on page load
setTimeout(initializeMLLeakDetection, 3000);

// Add voice command for leak detection
function handleVoiceCommandLeak(voiceText) {
  if (leakDetectionModel.leakDetected === true) {
    speak(`Warning! AI has detected a leak with ${leakDetectionModel.leakConfidence}% confidence. Water loss rate is ${leakDetectionModel.waterLossRate.toFixed(1)} liters per hour.`);
    showVoiceStatus(`⚠️ LEAK: ${leakDetectionModel.leakConfidence}% confidence`);
  } else if (leakDetectionModel.leakDetected === 'warning') {
    speak(`Potential leak detected. Anomaly score is ${leakDetectionModel.anomalyScore}%. Monitoring closely.`);
    showVoiceStatus(`⚠️ Anomaly: ${leakDetectionModel.anomalyScore}%`);
  } else {
    speak("No leak detected. All systems normal.");
    showVoiceStatus("✓ No Leak Detected");
  }
}

// Add to existing voice command handler
if (typeof handleVoiceCommand === 'function') {
  const originalHandleVoiceCommand = handleVoiceCommand;

  handleVoiceCommand = function (text) {
    const command = text.toLowerCase();

    // Handle leak detection commands
    if (command.includes('leak') || command.includes('check leak') || command.includes('leak status')) {
      handleVoiceCommandLeak(command);
      return;
    }

    // Call original handler for other commands
    return originalHandleVoiceCommand(text);
  };
}

console.log("🤖 ML Leak Detection module loaded");

// ═══════════════════════════════════════════════════════════
// 📜 ENHANCED HISTORY LOG SYSTEM - ALL SYSTEM EVENTS
// ═══════════════════════════════════════════════════════════

const HistoryLog = {
  maxEntries: 100, // Increased from 50
  storageKey: 'pumpHistoryLog',
  filterType: 'all', // Filter state

  // Track last values to detect changes
  lastValues: {
    waterLevel: null,
    flowRate: null,
    battery: null,
    solar: null,
    dust: null,
    pumpStatus: null,
    rssi: null,
    snr: null,
    emailNotifications: null,
    aiLimit: null,
    theme: null
  },

  init() {
    this.loadHistory();
    this.setupEventListeners();
    this.startMonitoring();
    this.startFirebaseMonitoring();
    console.log("📜 Enhanced History Log System initialized");
  },

  addEntry(message, type = 'info', icon = '📝', data = {}) {
    const entry = {
      id: Date.now(),
      message,
      type, // 'info', 'warning', 'alert', 'success', 'error', 'critical'
      icon,
      timestamp: new Date().toISOString(),
      data // Additional metadata
    };

    // Get existing entries
    let entries = this.getEntries();

    // Add new entry at the beginning
    entries.unshift(entry);

    // Limit to max entries
    if (entries.length > this.maxEntries) {
      entries = entries.slice(0, this.maxEntries);
    }

    // Save to localStorage
    localStorage.setItem(this.storageKey, JSON.stringify(entries));

    // Update display
    this.render();

    // Log to console
    console.log(`[History] ${icon} ${message}`);

    return entry;
  },

  getEntries() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error loading history:', e);
      return [];
    }
  },

  clearHistory() {
    if (confirm('⚠️ Are you sure you want to clear all history? This cannot be undone.')) {
      localStorage.removeItem(this.storageKey);
      this.render();
      this.addEntry('History cleared by user', 'info', '🗑️');
      speak('History cleared');
    }
  },

  exportHistory() {
    const entries = this.getEntries();
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `pump-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.addEntry('History exported to JSON file', 'success', '💾');
  },

  filterEntries(type) {
    this.filterType = type;
    this.render();

    // Update filter button states
    document.querySelectorAll('.history-filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === type) {
        btn.classList.add('active');
      }
    });
  },

  loadHistory() {
    this.render();
  },

  render() {
    const container = document.getElementById('historyLogContainer');
    if (!container) return;

    let entries = this.getEntries();

    // Apply filter
    if (this.filterType !== 'all') {
      entries = entries.filter(e => e.type === this.filterType);
    }

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="history-empty">
          <div style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;">📋</div>
          <p style="margin: 0; font-size: 0.85rem;">${this.filterType === 'all'
          ? 'No events logged yet'
          : `No ${this.filterType} events found`
        }</p>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map(entry => `
      <div class="history-item ${entry.type}" data-type="${entry.type}">
        <div class="history-icon">${entry.icon}</div>
        <div class="history-content">
          <div class="history-message">${entry.message}</div>
          <div class="history-timestamp">${this.formatTimestamp(entry.timestamp)}</div>
        </div>
      </div>
    `).join('');
  },

  formatTimestamp(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo;
    if (diffMins < 1) timeAgo = 'Just now';
    else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
    else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
    else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
    else timeAgo = date.toLocaleDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return `${timeStr} • ${timeAgo}`;
  },

  setupEventListeners() {
    // Clear history button
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearHistory());
    }

    // Export history button
    const exportBtn = document.getElementById('exportHistoryBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportHistory());
    }

    // Filter buttons
    document.querySelectorAll('.history-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterEntries(btn.dataset.filter);
      });
    });
  },

  startMonitoring() {
    // Monitor pump state changes
    const pumpSwitch = document.getElementById('pumpSwitch');
    if (pumpSwitch) {
      pumpSwitch.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.addEntry('Pump turned ON by user', 'success', '✅');
        } else {
          this.addEntry('Pump turned OFF by user', 'info', '⏹️');
        }
      });
    }

    // Monitor AI water limit
    const aiWaterLimit = document.getElementById('aiWaterLimit');
    if (aiWaterLimit) {
      aiWaterLimit.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.addEntry('AI Water Limit activated (40%)', 'warning', '🤖');
        } else {
          this.addEntry('AI Water Limit deactivated', 'info', '🤖');
        }
      });
    }

    // Monitor theme changes
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        setTimeout(() => {
          const isLight = document.body.classList.contains('light-mode');
          this.addEntry(
            `Theme changed to ${isLight ? 'Light' : 'Dark'} Mode`,
            'info',
            isLight ? '☀️' : '🌙'
          );
        }, 100);
      });
    }

    // Monitor mute toggle
    const muteToggle = document.getElementById('muteToggle');
    if (muteToggle) {
      muteToggle.addEventListener('click', () => {
        setTimeout(() => {
          const muted = localStorage.getItem('soundMuted') === 'true';
          this.addEntry(
            `Sound ${muted ? 'muted' : 'unmuted'}`,
            'info',
            muted ? '🔇' : '♪'
          );
        }, 100);
      });
    }

    // Monitor email notifications toggle
    const emailToggle = document.getElementById('emailNotificationToggle');
    if (emailToggle) {
      emailToggle.addEventListener('click', () => {
        setTimeout(() => {
          const enabled = emailNotificationsEnabled;
          this.addEntry(
            `Email notifications ${enabled ? 'enabled' : 'disabled'}`,
            enabled ? 'success' : 'info',
            '✉️'
          );
        }, 100);
      });
    }
  },

  startFirebaseMonitoring() {
    // Monitor water level changes (significant changes only)
    onValue(ref(db, "telemetry/device01/waterLevel"), (snapshot) => {
      const waterLevel = snapshot.val();
      if (waterLevel !== null && this.lastValues.waterLevel !== null) {
        const diff = Math.abs(waterLevel - this.lastValues.waterLevel);

        // Log significant water level changes
        if (diff >= 10) {
          const direction = waterLevel > this.lastValues.waterLevel ? 'increased' : 'decreased';
          this.addEntry(
            `Water level ${direction} from ${this.lastValues.waterLevel}% to ${waterLevel}%`,
            'info',
            '💧'
          );
        }

        // Log critical levels
        if (waterLevel >= 95 && this.lastValues.waterLevel < 95) {
          this.addEntry('Water level reached critical HIGH (95%+)', 'critical', '🚨');
        }
        if (waterLevel <= 20 && this.lastValues.waterLevel > 20) {
          this.addEntry('Water level reached critical LOW (20%)', 'critical', '⚠️');
        }
      }
      this.lastValues.waterLevel = waterLevel;
    });

    // Monitor pump status
    onValue(ref(db, "telemetry/device01/pumpStatus"), (snapshot) => {
      const pumpStatus = snapshot.val();
      if (pumpStatus !== null && this.lastValues.pumpStatus !== null && pumpStatus !== this.lastValues.pumpStatus) {
        if (pumpStatus === "ON") {
          this.addEntry('Pump started', 'success', '🔄');
        } else {
          this.addEntry('Pump stopped', 'info', '⏸️');
        }
      }
      this.lastValues.pumpStatus = pumpStatus;
    });

    // Monitor flow rate (dry run detection)
    onValue(ref(db, "telemetry/device01/flowRate"), (snapshot) => {
      const flowRate = snapshot.val();
      if (flowRate !== null && this.lastValues.flowRate !== null) {
        // Detect dry run
        onValue(ref(db, "telemetry/device01/pumpStatus"), (statusSnapshot) => {
          const pumpStatus = statusSnapshot.val();
          if (pumpStatus === "ON" && flowRate === 0 && this.lastValues.flowRate > 0) {
            this.addEntry('Dry run detected - No water flow!', 'critical', '⛔');
          }
        }, { onlyOnce: true });
      }
      this.lastValues.flowRate = flowRate;
    });

    // Monitor battery level
    onValue(ref(db, "telemetry/device01/batteryLevelManual"), (snapshot) => {
      const battery = snapshot.val();
      if (battery !== null && this.lastValues.battery !== null) {
        if (battery <= 20 && this.lastValues.battery > 20) {
          this.addEntry(`Battery low: ${battery}%`, 'warning', '🔋');
        }
        if (battery <= 10 && this.lastValues.battery > 10) {
          this.addEntry(`Battery critical: ${battery}%`, 'critical', '🔴');
        }
      }
      this.lastValues.battery = battery;
    });

    // Monitor dust sensor
    onValue(ref(db, "telemetry/device01/dust"), (snapshot) => {
      const dust = snapshot.val();
      if (dust !== null && this.lastValues.dust !== null) {
        if (dust > 80 && this.lastValues.dust <= 80) {
          this.addEntry(`High dust detected: ${dust}%`, 'warning', '🌫️');
        }
      }
      this.lastValues.dust = dust;
    });

    // Monitor solar power
    onValue(ref(db, "telemetry/device01/solar"), (snapshot) => {
      const solar = snapshot.val();
      if (solar !== null && this.lastValues.solar !== null) {
        if (solar < 30 && this.lastValues.solar >= 30) {
          this.addEntry(`Low solar power: ${solar}%`, 'warning', '☀️');
        }
      }
      this.lastValues.solar = solar;
    });

    // Monitor LoRa connectivity
    onValue(ref(db, "telemetry/device01/loraRSSI"), (snapshot) => {
      const rssi = snapshot.val();
      if (rssi !== null && this.lastValues.rssi !== null) {
        if (rssi < -100 && this.lastValues.rssi >= -100) {
          this.addEntry(`Weak LoRa signal: ${rssi} dBm`, 'warning', '📡');
        }
      }
      this.lastValues.rssi = rssi;
    });

    // Log system startup
    setTimeout(() => {
      this.addEntry('System initialized successfully', 'success', '🚀');
    }, 3000);
  }
};

// Initialize History Log when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HistoryLog.init());
} else {
  HistoryLog.init();
}

// Make HistoryLog globally accessible
window.HistoryLog = HistoryLog;

// ═══════════════════════════════════════════════════════════
// 🔗 INTEGRATE HISTORY LOG WITH EXISTING ALERTS
// ═══════════════════════════════════════════════════════════

// Hook into existing alert system
const originalUpdateAlerts = updateAlerts;
updateAlerts = function (water, flow, pump, dust) {
  // Call original function
  originalUpdateAlerts(water, flow, pump, dust);

  // Add history entries for alerts (prevent duplicates with cooldown)
  if (!window.alertLogCooldown) window.alertLogCooldown = {};
  const now = Date.now();

  // Dry Run
  if (pump === "ON" && flow === 0) {
    if (!window.alertLogCooldown.dryRun || now - window.alertLogCooldown.dryRun > 300000) {
      HistoryLog.addEntry('Dry run detected - Pump auto-stopped', 'critical', '⛔');
      window.alertLogCooldown.dryRun = now;
    }
  }

  // Low Water
  if (water < 20) {
    if (!window.alertLogCooldown.lowWater || now - window.alertLogCooldown.lowWater > 300000) {
      HistoryLog.addEntry(`Low water level: ${water}%`, 'warning', '⚠️');
      window.alertLogCooldown.lowWater = now;
    }
  }

  // Overflow Warning
  if (water > 95) {
    if (!window.alertLogCooldown.overflow || now - window.alertLogCooldown.overflow > 300000) {
      HistoryLog.addEntry(`Overflow warning: ${water}%`, 'critical', '🚨');
      window.alertLogCooldown.overflow = now;
    }
  }

  // High Dust
  if (dust > dustLimit) {
    if (!window.alertLogCooldown.dust || now - window.alertLogCooldown.dust > 300000) {
      HistoryLog.addEntry(`High dust detected: ${dust}%`, 'warning', '🌫️');
      window.alertLogCooldown.dust = now;
    }
  }
};

// Hook into ML Leak Detection
const originalHandleLeakDetected = handleLeakDetected;
handleLeakDetected = function (anomalies) {
  originalHandleLeakDetected(anomalies);

  HistoryLog.addEntry(
    `AI detected potential leak (${anomalies.confidence}% confidence): ${anomalies.flags[0]}`,
    'critical',
    '🤖'
  );
};

// Hook into email notifications
const originalSendEmailNotification = sendEmailNotification;
sendEmailNotification = async function (alertType, message, priority) {
  const result = await originalSendEmailNotification(alertType, message, priority);

  if (result !== false) {
    HistoryLog.addEntry(`Email sent: ${alertType}`, 'info', '📧');
  }

  return result;
};

// Hook into savings tracker
const originalSaveSavingsToFirebase = saveSavingsToFirebase;
saveSavingsToFirebase = function () {
  const result = originalSaveSavingsToFirebase();

  // Log major savings milestones
  if (savingsData.totalSavings.cost > 0 && savingsData.totalSavings.cost % 100 < 1) {
    HistoryLog.addEntry(
      `Savings milestone: ₹${savingsData.totalSavings.cost.toFixed(0)} saved`,
      'success',
      '💰'
    );
  }

  return result;
};

console.log("📜 Enhanced History Log System fully integrated");
