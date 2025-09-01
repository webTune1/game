// api.js - API hooks and utility functions for Test Drive game

// Replace these with real endpoints as needed!
const API = {
  // Mock: Get leaderboard (future use)
  async getLeaderboard() {
    // Example: return fetch('/api/leaderboard').then(r=>r.json())
    return [
      { name: "Speedy", score: 2482 },
      { name: "Roadster", score: 1940 },
      { name: "NightRider", score: 1630 }
    ];
  },
  // Mock: Get car/bike asset data (future use)
  async getCarAssets() {
    // Example: return fetch('/api/cars').then(r=>r.json())
    return []; // We'll use cars.js for now
  },
  // Mock: Save score (future use)
  async saveScore(name, score) {
    // Example: return fetch('/api/score', {method:'POST', body: JSON.stringify({name,score})})
    return { success: true };
  }
};
// Expose to window for debugging
window.API = API;
