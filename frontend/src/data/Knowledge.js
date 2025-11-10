export const knowledge = {
  "Photosynthesis": {
    id: "k_photosynthesis",
    level: "basic",
    subject: "Science",
    description: "How plants convert sunlight into food (glucose) using chlorophyll, water and carbon dioxide. Oxygen is produced as a byproduct.",
    contentType: ["text"],
    quiz: [
      {
        question: "What are the main inputs needed for photosynthesis?",
        options: ["Sunlight, Water, Carbon dioxide", "Soil, Wind, Salt", "Sunlight only", "Water only"],
        correct: "Sunlight, Water, Carbon dioxide"
      },
      {
        question: "Which organelle in plant cells contains chlorophyll?",
        options: ["Nucleus", "Chloroplast", "Mitochondria", "Vacuole"],
        correct: "Chloroplast"
      },
      {
        question: "What gas is released during photosynthesis?",
        options: ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"],
        correct: "Oxygen"
      }
    ]
  },
  "Water Cycle": {
    id: "k_watercycle",
    level: "basic",
    subject: "Science",
    description: "Water evaporates from surfaces, condenses into clouds, and falls as precipitation. The cycle repeats through runoff and infiltration.",
    contentType: ["text"],
    quiz: [
      {
        question: "What is the process of water turning into vapor called?",
        options: ["Condensation", "Evaporation", "Precipitation", "Transpiration"],
        correct: "Evaporation"
      },
      {
        question: "Which process forms clouds?",
        options: ["Evaporation", "Runoff", "Condensation", "Absorption"],
        correct: "Condensation"
      },
      {
        question: "Rain, snow or hail are forms of what?",
        options: ["Evaporation", "Infiltration", "Precipitation", "Transpiration"],
        correct: "Precipitation"
      }
    ]
  },
  "Solar System": {
    id: "k_solar",
    level: "basic",
    subject: "Science",
    description: "The Sun and the astronomical objects bound to it by gravity — planets, moons, asteroids and comets.",
    contentType: ["text"],
    quiz: [
      {
        question: "Which body is at the center of our solar system?",
        options: ["The Moon", "The Sun", "Earth", "Jupiter"],
        correct: "The Sun"
      },
      {
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Mercury", "Saturn"],
        correct: "Mars"
      },
      {
        question: "How many planets are in the solar system (classical count)?",
        options: ["7", "8", "9", "10"],
        correct: "8"
      }
    ]
  }
};
