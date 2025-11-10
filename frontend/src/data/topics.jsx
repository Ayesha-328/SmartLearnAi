const topics = [
  {
    id: "mechanics",
    title: "Mechanics & Motion",
    description: "Kinematics, Dynamics, Work/Energy, Projectile motion.",
    subtopics: [
      "Prerequisites: Basic algebra, units",
      "Kinematics (1D & 2D)",
      "Dynamics (Newton's laws)",
      "Work, Energy & Power"
    ],
    questions: [
      {
        id: "m1",
        q: "A car accelerates from 0 to 20 m/s in 5 s. What is its acceleration (m/s²)?",
        choices: ["2", "4", "5", "0.25"],
        a: 1,
        note: "acceleration = Δv/Δt = 20/5 = 4 m/s²"
      },
      {
        id: "m2",
        q: "Which law describes F = ma?",
        choices: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravity"],
        a: 1
      },
      {
        id: "m3",
        q: "A projectile launched horizontally from a cliff experiences:",
        choices: ["constant vertical velocity", "constant vertical acceleration", "no vertical motion", "increasing vertical velocity due to thrust"],
        a: 1,
        note: "Gravity causes vertical acceleration downward."
      }
    ]
  },

  {
    id: "thermo",
    title: "Thermodynamics & Waves",
    description: "Temperature, heat transfer, mechanical & sound waves.",
    subtopics: [
      "Prerequisites: Basic algebra, concept of temperature",
      "Thermal physics & heat transfer",
      "Mechanical waves and wave equation",
      "Sound waves and Doppler effect"
    ],
    questions: [
      {
        id: "t1",
        q: "Which process transfers heat without bulk motion of fluid?",
        choices: ["Conduction", "Convection", "Radiation", "Advection"],
        a: 0
      },
      {
        id: "t2",
        q: "Which of these is a transverse wave?",
        choices: ["Sound in air", "Light wave", "Water pressure pulse", "Longitudinal spring oscillation"],
        a: 1
      },
      {
        id: "t3",
        q: "Wavelength λ and frequency f are related by v = λf. If v constant and f doubles, λ:",
        choices: ["doubles", "halves", "stays same", "quadruples"],
        a: 1
      }
    ]
  },

  {
    id: "em",
    title: "Electricity & Magnetism (E&M)",
    description: "Electrostatics, current electricity, magnetism and induction.",
    subtopics: [
      "Prerequisites: basic forces & vectors",
      "Electrostatics & Coulomb's law",
      "Ohm's law and circuits",
      "Magnetism & Faraday's law"
    ],
    questions: [
      {
        id: "e1",
        q: "Ohm's law is V = IR. If R = 2Ω and I = 3A, V = ?",
        choices: ["1.5 V", "6 V", "5 V", "3 V"],
        a: 1
      },
      {
        id: "e2",
        q: "Two like charges placed near each other will:",
        choices: ["attract", "repel", "orbit", "fuse into one charge"],
        a: 1
      },
      {
        id: "e3",
        q: "Faraday's law describes how a changing magnetic flux produces:",
        choices: ["electric field / emf", "permanent magnet", "sound wave", "static charge"],
        a: 0
      }
    ]
  },

  {
    id: "optics",
    title: "Optics & Modern Physics",
    description: "Geometrical optics, wave optics, photoelectric effect, atomic models.",
    subtopics: [
      "Prerequisites: Trigonometry, reflection/refraction",
      "Geometrical optics (snell's law, mirror equation)",
      "Wave optics: interference & diffraction",
      "Introduction to modern physics: photoelectric effect"
    ],
    questions: [
      {
        id: "o1",
        q: "Snell's law describes refraction: n1 sinθ1 = n2 sinθ2. If n2 > n1, light bends:",
        choices: ["away from normal", "toward normal", "not at all", "randomly"],
        a: 1
      },
      {
        id: "o2",
        q: "Photoelectric effect provided evidence that light behaves as:",
        choices: ["wave only", "particle (photon)", "sound", "magnetic dipoles"],
        a: 1
      },
      {
        id: "o3",
        q: "Interference pattern requires:",
        choices: ["coherent sources", "very high temperature", "magnetic fields", "vacuum only"],
        a: 0
      }
    ]
  }
];

export default topics;
