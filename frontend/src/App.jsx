// src/App.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
// Add these imports to your App.jsx:
import { fetchAllSubjects, fetchSubjectTopics, fetchTopicContent , fetchQuizFromApi} from './services/api';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import "./App.css";

function Loader({ message }) {
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>{message || "Loading..."}</h2>
      <div className="spinner" style={{ marginTop: 10 }}>⏳</div>
    </div>
  );
}

/* ===========================
    AI METRIC CALCULATIONS & DECISION LOGIC
    =========================== */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateOverallAccuracy(attempts) {
    let totalWeightedAccuracy = 0;
    let totalAttempts = 0;
    for (const attempt of attempts) {
        const accuracyScore = parseFloat(attempt.marks) / 100;
        const attemptCount = parseInt(attempt.total);
        totalWeightedAccuracy += accuracyScore * attemptCount;
        totalAttempts += attemptCount;
    }
    return totalAttempts === 0 ? 0.0 : totalWeightedAccuracy / totalAttempts;
}

function simulateAdvancedMetrics(responses, globalAttemptCount = 5, globalAvgAccuracy = 0.75) {
    if (responses.length === 0) return {
      TopicMasteryScore: 0.0, CognitiveReadinessScore: 0.0, StabilityScore: 0.0,
      Pacing: "NORMAL", Tone: "BALANCED_GUIDE", Confidence: 0.0, AccuracyTrend: 0.0
    };

    const totalQuestions = responses.length;
    const correctCount = responses.filter(r => r.correct).length;
    const topic_accuracy_score = correctCount / totalQuestions;
    const topic_response_time = responses.reduce((a, b) => a + b.timeTaken, 0) / totalQuestions;
    const first_attempt_accuracy = topic_accuracy_score;
    
    const expected_response_time = 10;
    const recommended_attempts = 3;
    const attempt_count = 1; 
    const accuracy_trend = Math.random() * 0.4 - 0.2;  
    const error_pattern = 0.1;  
    const confidence_level = clamp(responses.filter(r => r.correct && r.timeTaken < 8).length / totalQuestions, 0, 1);
    
    const learning_velocity_norm = clamp(Math.random() * 0.4 + 0.4, 0, 1);  
    const review_recall_rate = clamp(Math.random() * 0.3 + 0.6, 0, 1);  
    const engagement_level = clamp(Math.random() * 0.4 + 0.5, 0, 1);  
    const session_regularity_norm = clamp(Math.random() * 0.5 + 0.3, 0, 1);  

    const response_time_norm = clamp(1 - (topic_response_time / expected_response_time), 0, 1);
    const attempt_factor = clamp(Math.min(1, Math.log(1 + attempt_count) / Math.log(1 + recommended_attempts)), 0, 1);
    const trend_factor = clamp((accuracy_trend + 1) / 2, 0, 1);     
    const average_response_time_norm = response_time_norm;     

    const TMS_raw = 0.50 * topic_accuracy_score + 0.10 * first_attempt_accuracy + 0.15 * trend_factor + 0.10 * response_time_norm + 0.05 * attempt_factor + 0.10 * (1 - error_pattern);
    const TopicMasteryScore = clamp(TMS_raw, 0, 1);

    const CRS_raw = 0.25 * globalAvgAccuracy + 0.15 * (average_response_time_norm) + 0.15 * review_recall_rate + 0.10 * engagement_level + 0.10 * session_regularity_norm + 0.10 * learning_velocity_norm + 0.10 * confidence_level;
    const CognitiveReadinessScore = clamp(CRS_raw, 0, 1);

    const SS = TopicMasteryScore * 0.7 + trend_factor * 0.3;
    const StabilityScore = clamp(SS, 0, 1);

    const pacing_score = 0.6 * CognitiveReadinessScore + 0.4 * learning_velocity_norm;
    let pacing = "NORMAL";
    if (pacing_score < 0.4) pacing = "EXTRA_SLOW";
    else if (pacing_score < 0.6) pacing = "SLOW";
    else if (pacing_score > 0.8) pacing = "FAST";
    
    let tone = "BALANCED_GUIDE";
    const mock_motivation_estimate = 0.7; 
    if (confidence_level < 0.5 || (1 - mock_motivation_estimate) > 0.5) tone = "ENCOURAGING";
    else if (accuracy_trend > 0.15 && TopicMasteryScore > 0.8) tone = "CELEBRATORY";
    else if (CognitiveReadinessScore > 0.75) tone = "CONFIDENT";

    const metrics = {
      TopicMasteryScore: TopicMasteryScore.toFixed(3),
      CognitiveReadinessScore: CognitiveReadinessScore.toFixed(3),
      StabilityScore: StabilityScore.toFixed(3),
      Pacing: pacing,
      Tone: tone,
      Confidence: confidence_level.toFixed(3),
      AccuracyTrend: accuracy_trend.toFixed(3)
    };

    return metrics;
}

// AI Decision Function
async function getAIDecision(metrics) {
  const { TopicMasteryScore, CognitiveReadinessScore } = metrics;
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const TMS = parseFloat(TopicMasteryScore);
  const CRS = parseFloat(CognitiveReadinessScore);

  if (TMS < 0.55 || (TMS < 0.70 && CRS < 0.65)) {
    return {
      action: "RETEACH",
      strategy: "FOUNDATIONAL_REBUILD",
      pacing: "EXTRA_SLOW",
      tone: "ENCOURAGING",
      goal: "REBUILD_CONFIDENCE",
      insight: "Low Topic Mastery Score and/or low Cognitive Readiness suggests weak concept formation. A foundational review is required.",
    };
  } else if (TMS >= 0.90 && CRS >= 0.70) {
    return {
      action: "NEXT_TOPIC",
      strategy: "CHALLENGE_APPLICATION",
      pacing: "FAST",
      tone: "CELEBRATORY",
      goal: "ADVANCE_MASTERY",
      insight: "High Topic Mastery and Cognitive Readiness indicate solid, stable knowledge. Focus on challenging application problems.",
    };
  } else {
    return {
      action: "NEXT_TOPIC",
      strategy: "CONCEPTUAL_BRIDGE",
      pacing: "NORMAL",
      tone: "BALANCED_GUIDE",
      goal: "DEEPEN_UNDERSTANDING",
      insight: "Moderate mastery. We will reinforce related concepts to bridge understanding and ensure long-term retention.",
    };
  }
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ✨ AI Content Generation and Decision Logic
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

function getLastQuizMetrics(subject, topic) {
    const attempts = JSON.parse(localStorage.getItem("quizAttempts") || "[]");
    
    const latestAttempt = attempts
        .filter(a => a.subject === subject && a.topic === topic)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!latestAttempt) {
        return {
            decision: { action: "RETEACH", strategy: "FOUNDATIONAL_REBUILD", pacing: "EXTRA_SLOW", tone: "ENCOURAGING", goal: "INTRODUCE_CONCEPT", insight: "No prior attempt found. Starting with basics." },
            accuracy: 0.0,
            overallAccuracy: calculateOverallAccuracy(attempts),
        };
    }

    const currentAccuracy = parseFloat(latestAttempt.marks) / 100;
    const globalAvgAccuracy = calculateOverallAccuracy(attempts);
    
    const storedMetrics = latestAttempt.advancedMetrics || simulateAdvancedMetrics(latestAttempt.responses || [], attempts.length, globalAvgAccuracy);
    const aiDecision = getAIDecision(storedMetrics); 
    
    return {
        decision: aiDecision,
        accuracy: currentAccuracy,
        overallAccuracy: globalAvgAccuracy,
        metrics: storedMetrics
    };
}


function generateStudyMaterialContent(subject, topic, instruction_params) {
    const existingMaterial = STUDY_MATERIALS[subject]?.[topic];
    const strategy = instruction_params.strategy;
    const tone = instruction_params.tone;
    const pacing = instruction_params.pacing;
    const goal = instruction_params.goal;

    const baseTitle = existingMaterial?.title || `${topic} Fundamentals`;
    
    let aiSummary = `This material was generated specifically for you using the **${strategy}** strategy with an **${tone}** tone.
Your learning goal is: **${goal}**.

### Introduction
Welcome to the ${topic} concept! Based on your recent performance, we are starting with a ${pacing} pace to ensure everything is crystal clear. Let's build a rock-solid foundation.

### Core Concepts
* **Level Decided:** ${strategy}
* **Focus:** ${goal}. This section will focus heavily on ${strategy === 'FOUNDATIONAL_REBUILD' ? 'basic definitions and simple analogies' : 'interconnecting ideas and challenging assumptions'}.

${existingMaterial?.full_explanation || `[Detailed content for ${topic} is generated here, emphasizing the core concepts based on the required strategy and tone.]`}

### Summary
Great work! Keep in mind that ${topic} is built on strong fundamentals. We will move to application once the basics are fully mastered!
`;

    return {
        title: `AI-Personalized: ${baseTitle}`,
        content: `Personalized material generated with strategy: ${strategy}. Goal: ${goal}.`,
        full_explanation: aiSummary,
        level: strategy,
        subj: subject,
        subtopic: topic,
        youtube_link: existingMaterial?.youtube_link,
        image_url: existingMaterial?.image_url,
    };
}


function generateMockMaterial(subject, topic) {
    const { decision } = getLastQuizMetrics(subject, topic);

    const instruction_params = {
        strategy: decision.strategy,
        pacing: decision.pacing,
        tone: decision.tone,
        goal: decision.goal,
        examples: decision.strategy === "FOUNDATIONAL_REBUILD" ? "ULTRA_SIMPLE" : "MULTIPLE_ANGLES"
    };
    
    return generateStudyMaterialContent(subject, topic, instruction_params);
}

// =====================================================================
// REVISED MOCK API CALL FUNCTION (Simulating the Python Backend Logic)
// Now generating DIVERSE content for 10 Questions.
// =====================================================================
async function fetchAiContent(subject, topic) {
    // 1. Determine instruction parameters based on mock metrics
    const { decision } = getLastQuizMetrics(subject, topic);
    const instruction_params = {
        strategy: decision.strategy,
        pacing: decision.pacing,
        tone: decision.tone,
        goal: decision.goal,
        examples: decision.strategy === "FOUNDATIONAL_REBUILD" ? "ULTRA_SIMPLE" : "MULTIPLE_ANGLES"
    };
    
    // Simulate network delay for API call
    await new Promise(resolve => setTimeout(resolve, 2000)); 

    // 2. Generate Study Material 
    const personalizedMaterial = generateStudyMaterialContent(subject, topic, instruction_params);
    const study_material_text = personalizedMaterial.full_explanation;
    
    // 3. Generate 10-Question Quiz JSON 
    const mockQuizQuestions = [];
    const NUM_QUESTIONS = 10; 
    const difficultyMap = {
        'FOUNDATIONAL_REBUILD': ["easy", "easy", "medium"],
        'CONCEPTUAL_BRIDGE': ["medium", "medium", "hard"],
        'CHALLENGE_APPLICATION': ["hard", "hard", "medium"]
    };
    const strategy = instruction_params.strategy;
    const difficulties = difficultyMap[strategy] || ["easy", "medium", "hard"]; 

    // --- Diverse Mock Questions for the 10 slots ---
    const physics_qs = [
        // Easy - Calculation/Recall
        { q: (i) => `Q${i}: A 20N force acts on a 4kg object. What is its acceleration?`, opts: ["A: 0.2 m/s²", "B: 5.0 m/s²", "C: 24 m/s²", "D: 80 m/s²"], ans: 1, exp: "Newton's Second Law: $a=F/m = 20N/4kg = 5 m/s^2$." },
        // Medium - Application
        { q: (i) => `Q${i}: If you double the distance an object travels, by what factor does the Work done change?`, opts: ["A: Halves", "B: Stays the same", "C: Doubles", "D: Quadruples"], ans: 2, exp: "Work is Force times displacement ($W=F \\cdot d$). Doubling $d$ doubles $W$." },
        // Hard - Conceptual/Synthesis
        { q: (i) => `Q${i}: Why is momentum always conserved in an isolated system, even during an inelastic collision?`, opts: ["A: Energy is also conserved", "B: No external net force acts", "C: The objects stick together", "D: The system is moving at constant velocity"], ans: 1, exp: "The **Law of Conservation of Momentum** is based on Newton's Third Law, meaning internal action/reaction forces cancel out, leaving no net external force." },
        // Easy - Definition/Recall
        { q: (i) => `Q${i}: What is the rotational equivalent of mass in linear motion?`, opts: ["A: Torque", "B: Angular Velocity", "C: Moment of Inertia", "D: Momentum"], ans: 2, exp: "Moment of Inertia ($I$) is the rotational analog to mass ($m$)." },
        // Medium - Calculation/Application
        { q: (i) => `Q${i}: A wave has a frequency of 5 Hz and a wavelength of 2m. What is its speed?`, opts: ["A: 0.4 m/s", "B: 2.5 m/s", "C: 7 m/s", "D: 10 m/s"], ans: 3, exp: "Wave speed ($v$) is frequency ($f$) times wavelength ($\\lambda$): $v = f\\lambda = 5 Hz \\cdot 2m = 10 m/s$." },
        // Hard - Conceptual/Synthesis
        { q: (i) => `Q${i}: What must happen to the period of a pendulum if its length is increased?`, opts: ["A: Increase", "B: Decrease", "C: Stay the same", "D: Depends on mass"], ans: 0, exp: "The period of a pendulum is directly proportional to the square root of its length, meaning period must increase when length increases." },
    ];
    const chemistry_qs = [
        // Easy - Recall
        { q: (i) => `Q${i}: What is the term for an atom of an element with a different number of neutrons?`, opts: ["A: Ion", "B: Isomer", "C: Isotope", "D: Allotrope"], ans: 2, exp: "Isotopes are atoms of the same element that have differing numbers of neutrons." },
        // Medium - Application
        { q: (i) => `Q${i}: Which type of bond forms when electrons are shared between two non-metal atoms?`, opts: ["A: Ionic", "B: Metallic", "C: Covalent", "D: Polar"], ans: 2, exp: "Covalent bonds result from the sharing of valence electrons between atoms, typically non-metals." },
        // Hard - Synthesis
        { q: (i) => `Q${i}: A reaction releases heat to the surroundings. What term describes this process?`, opts: ["A: Endothermic", "B: Isothermal", "C: Exothermic", "D: Catalytic"], ans: 2, exp: "An **exothermic** process is one that releases heat (energy) into the surroundings, resulting in a negative change in enthalpy ($\\Delta H < 0$)." },
        // Easy - Recall
        { q: (i) => `Q${i}: On the pH scale, which number represents a neutral solution?`, opts: ["A: 0", "B: 7", "C: 10", "D: 14"], ans: 1, exp: "A pH of 7 indicates a neutral solution (equal concentration of $H^+$ and $OH^-$ ions)." },
        // Medium - Application
        { q: (i) => `Q${i}: If you move from left to right across the Periodic Table, what generally increases?`, opts: ["A: Atomic Radius", "B: Metallic Character", "C: Electronegativity", "D: Number of Electron Shells"], ans: 2, exp: "Electronegativity, the ability of an atom to attract electrons, generally increases across a period." },
        // Hard - Synthesis
        { q: (i) => `Q${i}: Balance the reaction: $\\text{P}_4 + \\text{O}_2 \\rightarrow \\text{P}_2\\text{O}_5$ (The coefficients for $\\text{P}_4$ and $\\text{O}_2$ are required).`, opts: ["A: 1, 3", "B: 1, 5", "C: 2, 5", "D: 2, 7"], ans: 2, exp: "The balanced reaction is $2\\text{P}_4 + 5\\text{O}_2 \\rightarrow 4\\text{P}_2\\text{O}_5$. The coefficients are 2 and 5." },
    ];
    const biology_qs = [
        // Easy - Recall
        { q: (i) => `Q${i}: Which cell structure is primarily responsible for protein synthesis?`, opts: ["A: Lysosome", "B: Nucleus", "C: Ribosome", "D: Golgi Apparatus"], ans: 2, exp: "Ribosomes are the site of translation, where genetic code is used to synthesize proteins." },
        // Medium - Application
        { q: (i) => `Q${i}: If a plant is deprived of light, which stage of photosynthesis immediately ceases?`, opts: ["A: Calvin Cycle", "B: Light-dependent reactions", "C: Fermentation", "D: Glycolysis"], ans: 1, exp: "The light-dependent reactions require light energy to create ATP and NADPH, which power the Calvin Cycle." },
        // Hard - Synthesis
        { q: (i) => `Q${i}: How does the concept of gene linkage complicate Mendel's Law of Independent Assortment?`, opts: ["A: Linked genes assort together", "B: Linkage violates the law entirely", "C: Linked genes always have high recombination", "D: It applies only to autosomal traits"], ans: 0, exp: "Gene linkage occurs when genes are physically close on the same chromosome, causing them to be inherited together, which contradicts independent assortment." },
        // Easy - Recall
        { q: (i) => `Q${i}: What is the energy molecule produced by mitochondria?`, opts: ["A: Glucose", "B: DNA", "C: ATP", "D: Oxygen"], ans: 2, exp: "Mitochondria produce Adenosine Triphosphate (ATP) during cellular respiration." },
        // Medium - Application
        { q: (i) => `Q${i}: What process best describes how water moves across the cell membrane?`, opts: ["A: Active Transport", "B: Osmosis", "C: Exocytosis", "D: Phagocytosis"], ans: 1, exp: "The diffusion of water across a selectively permeable membrane is specifically called **osmosis**." },
        // Hard - Synthesis
        { q: (i) => `Q${i}: Which human body system is responsible for long-term, slow regulation via hormones?`, opts: ["A: Nervous System", "B: Circulatory System", "C: Endocrine System", "D: Muscular System"], ans: 2, exp: "The Endocrine System uses hormones to regulate distant organs and processes over minutes to days." },
    ];
    
    let source_qs;
    if (subject === "Physics") source_qs = physics_qs;
    else if (subject === "Chemistry") source_qs = chemistry_qs;
    else if (subject === "Biology") source_qs = biology_qs;
    else source_qs = physics_qs; // Default

    // Use a mix of questions to fill the 10 slots
    for (let i = 0; i < NUM_QUESTIONS; i++) {
        // Cycle through the difficulty array for the difficulty level
        const diff = difficulties[i % difficulties.length]; 
        // Cycle through the diverse questions array for the content
        const source_index = i % source_qs.length; 
        const q_template = source_qs[source_index];

        mockQuizQuestions.push({
            "question_text": q_template.q(i + 1), // Pass i+1 for question numbering
            "difficulty_level": diff,
            "options": q_template.opts, 
            "correct_answer": q_template.opts[q_template.ans], // Set the correct string
            "explanation": q_template.exp,
            "response_time_expected": difficulties[i % difficulties.length] === "easy" ? 30.0 : 45.0
        });
    }

    const quizJsonText = JSON.stringify({ questions: mockQuizQuestions });
    
    return {
        study_material_text: study_material_text,
        quiz_json_string: quizJsonText,
        personalized_material: personalizedMaterial 
    };
}


// ===========================
// Curriculum Data (Unchanged)
const CURRICULUM = {
  Physics: {
    id: "physics",
    subtopics: [
      "Kinematics", "Newton's Laws", "Work & Energy", "Momentum", "Rotational Motion", "Waves & Optics",
    ],
  },
  Chemistry: {
    id: "chemistry",
    subtopics: [
      "Atomic Structure", "Periodic Table", "Bonding", "Reactions", "Acids & Bases", "Thermochemistry",
    ],
  },
  Biology: {
    id: "biology",
    subtopics: [
      "Cell Structure", "Photosynthesis", "Genetics", "Evolution", "Human Systems",
    ],
  },
};

/* ===========================
    Study Materials Content (Unchanged)
    =========================== */
const STUDY_MATERIALS = {
  Biology: {
    "Cell Structure": {
      title: "Cell Structure Quick Sheet",
      content: "The cell is the basic unit of life. Key components: Nucleus (control center), Mitochondria (powerhouse), Cell Membrane (barrier).",
      full_explanation: "The cell is the fundamental unit of structure and function in living organisms. **Prokaryotic cells** lack a nucleus and membrane-bound organelles, while **Eukaryotic cells** (found in plants, animals, fungi) contain organelles with specialized functions. The **Mitochondria** perform cellular respiration, generating ATP energy. The **Nucleus** houses the genetic material (DNA). The **Cell Membrane** regulates what enters and exits the cell, maintaining homeostasis.",
      level: "Foundational",
      youtube_link: "https://www.youtube.com/watch?v=t5DvF5OVr1Y",
      image_url: "images/biology/cell_structure.jpg" 
    },
    "Photosynthesis": {
      title: "Photosynthesis: Light to Life",
      content: "Plants convert light energy, CO₂, and water into glucose and oxygen. Formula: $6CO_2 + 6H_2O + Light \\rightarrow C_6H_{12}O_6 + 6O_2$.",
      full_explanation: "Photosynthesis occurs in the **chloroplasts** of plant cells and algae. It has two main stages: **Light-dependent reactions** (occurs in the thylakoid membrane, converting light energy into chemical energy ATP and NADPH) and **Light-independent reactions** (the Calvin Cycle, which uses ATP and NADPH to fix carbon dioxide into glucose). This process is vital for life on Earth as it produces oxygen and the basis of most food chains.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=D2Y_eEaxrYo", 
      image_url: "images/biology/photosynthesis_diagram.jpg" 
    },
    "Genetics": {
      title: "Mendel's Laws & DNA Basics",
      content: "Genetics is the study of heredity. DNA carries genetic instructions. Mendelian inheritance follows dominance, segregation, and independent assortment.",
      full_explanation: "DNA (Deoxyribonucleic acid) is a double-helix structure containing the genetic code. **Genes** are segments of DNA that code for traits. **Mendel's Laws** describe how traits are inherited: 1) **Law of Segregation** (alleles separate during gamete formation), and 2) **Law of Independent Assortment** (genes for different traits segregate independently). Modern genetics also involves concepts like gene linkage and polygenic inheritance.",
      level: "Advanced",
      youtube_link: "https://www.youtube.com/watch?v=C_X_yX_oW8o", 
      image_url: "images/biology/dna_double_helix.jpg" 
    },
    "Evolution": {
      title: "Evolution: The Engine of Life",
      content: "Evolution is the change in the heritable characteristics of biological populations over successive generations, driven by natural selection.",
      full_explanation: "The central tenets of **Evolutionary Theory** are variation, inheritance, selection, and time. **Natural Selection** is the primary mechanism, where traits that aid survival and reproduction become more common over time. Key evidence includes the fossil record, comparative anatomy, and genetic analysis.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=GhHOjC4oxh8", 
      image_url: "images/biology/evolution_tree.jpg" 
    },
    "Human Systems": {
      title: "The 11 Human Body Systems",
      content: "The body's systems (e.g., Nervous, Circulatory, Digestive) work in tandem to maintain homeostasis and perform life functions.",
      full_explanation: "The **Human Systems** ensure the body functions as a coordinated whole. The **Nervous System** handles rapid communication, while the **Endocrine System** uses hormones for slower, systemic regulation. The **Circulatory System** transports nutrients and waste, and the **Immune System** protects against pathogens.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=0JDCViWGn-0", 
      image_url: "images/biology/human_systems_overview.jpg" 
    },
  },
  Chemistry: {
    "Atomic Structure": {
      title: "Atomic Structure Cheat Sheet",
      content: "Atoms contain protons, neutrons (in the nucleus), and electrons (in shells). Atomic Number (Z) = Protons. Mass Number (A) = Protons + Neutrons.",
      full_explanation: "The atom consists of a tiny, dense **nucleus** containing positively charged **protons** and neutral **neutrons**. Negatively charged **electrons** orbit the nucleus in specific energy levels or shells. The **Atomic Number (Z)** defines the element. **Isotopes** are atoms of the same element with different numbers of neutrons (different mass numbers).",
      level: "Foundational",
      youtube_link: "https://www.youtube.com/watch?v=l_8_2XoV0qY", 
      image_url: "images/chemistry/bohr_model.jpg" 
    },
    "Periodic Table": {
      title: "The Periodic Table Map",
      content: "Organizes elements by atomic number (Z), showing trends in properties like electronegativity, ionization energy, and atomic radius.",
      full_explanation: "The **Periodic Table** is divided into **Groups** (columns, similar valence electrons/properties) and **Periods** (rows). Key groups include **Alkali Metals** (Group 1), **Halogens** (Group 17), and **Noble Gases** (Group 18). Understanding the table is crucial for predicting chemical reactivity.",
      level: "Foundational",
      youtube_link: "https://www.youtube.com/watch?v=Jg3Fo4WD8XE", 
      image_url: "images/chemistry/periodic_table.jpg" 
    },
    "Bonding": {
      title: "Covalent vs. Ionic Bonds",
      content: "Ionic bonds (transfer of electrons) form between metal and non-metal. Covalent bonds (sharing of electrons) form between non-metals.",
      full_explanation: "Chemical bonding determines the structure and properties of compounds. **Ionic bonds** involve the complete transfer of electrons, creating stable ions (cations and anions) that are electrostatically attracted. **Covalent bonds** involve the sharing of electrons, typically forming molecules. **Metallic bonds** (not discussed here) explain the properties of metals.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=pdJeQUd2g_4", 
      image_url: "images/chemistry/ionic_vs_covalent.jpg" 
    },
    "Reactions": {
      title: "Chemical Reactions: Types & Stoichiometry",
      content: "Reactions involve breaking and forming chemical bonds. Main types: synthesis, decomposition, single/double replacement, and combustion.",
      full_explanation: "**Stoichiometry** is the calculation of reactants and products in chemical reactions based on the Law of Conservation of Mass. A reaction is a process where one or more substances, the **reactants**, are converted to one or more different substances, the **products**.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=ja7p_tzTTEA", 
      image_url: "images/chemistry/reaction_equation.jpg" 
    },
    "Acids & Bases": {
      title: "Acids & Bases: pH and Neutralization",
      content: "Acids donate protons ($H^+$), bases accept them ($OH^-$). pH measures acidity/basicity ($0-14$). Neutralization forms water and a salt.",
      full_explanation: "The **Arrhenius model** defines acids as producing $H^+$ ions and bases as producing $OH^-$ ions in water. The **Brønsted-Lowry model** is broader, defining acids as proton donors and bases as proton acceptors. The **pH scale** is logarithmic, with low numbers being acidic, high numbers basic, and 7 neutral.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=ja7p_tzTTEA", 
      image_url: "images/chemistry/ph_scale.jpg" 
    },
    "Thermochemistry": {
      title: "Thermochemistry: Heat and Energy",
      content: "Studies heat changes in chemical reactions. **Exothermic** (releases heat, $\\Delta H < 0$) vs. **Endothermic** (absorbs heat, $\\Delta H > 0$).",
      full_explanation: "The **Enthalpy ($\\Delta H$)** is the heat content of a system. **Hess's Law** allows calculating $\\Delta H$ for a reaction by summing the $\\Delta H$ of related reactions. **Calorimetry** is the technique used to measure heat transfer during a chemical process.",
      level: "Advanced",
      youtube_link: "https://www.youtube.com/watch?v=LsqKL3pBVMA", 
      image_url: "images/chemistry/exothermic_endothermic.jpg" 
    },
  },
  Physics: {
    "Kinematics": {
      title: "SUVAT Equations Summary",
      content: "Covers uniform acceleration motion. Key equations: $v = u + at$, $s = ut + 1/2at^2$, $v^2 = u^2 + 2as$. (s=disp, u=init vel, v=final vel, a=accel, t=time).",
      full_explanation: "**Kinematics** is the branch of classical mechanics that describes the motion of points, objects, and groups of objects, without reference to the cause of the motion. The **SUVAT equations** (or motion equations) are used for constant acceleration. **Displacement** (s) is a vector, while **distance** is a scalar. Similarly, **velocity** (v) is vector, and **speed** is scalar.",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=8NLzuURxFwY", 
      image_url: "images/physics/projectile_motion.jpg" 
    },
    "Newton's Laws": {
      title: "The Three Laws of Motion",
      content: "1st Law (Inertia): Objects resist change in motion. 2nd Law: $F=ma$. 3rd Law: For every action, there is an equal and opposite reaction.",
      full_explanation: "**Newton's Three Laws of Motion** form the foundation of classical mechanics. The **First Law (Inertia)** states that an object remains at rest or in uniform motion unless acted upon by an external force. The **Second Law** relates the net **Force** (F) on an object to its **mass** (m) and **acceleration** (a): $F_{net}=ma$. The **Third Law** states that forces always occur in equal and opposite pairs.",
      level: "Foundational",
      youtube_link: "https://www.youtube.com/watch?v=kYI5vW5Lg-o", 
      image_url: "images/physics/newtons_cradle.jpg" 
    },
    "Work & Energy": {
      title: "Work, Energy, and Power",
      content: "**Work ($W=F \\cdot d$)** is the energy transferred by a force. **Kinetic Energy ($1/2mv^2$)** is energy of motion. **Potential Energy ($mgh$)** is stored energy.",
      full_explanation: "The **Work-Energy Theorem** states that the net work done on an object equals the change in its kinetic energy. The **Law of Conservation of Energy** states that energy cannot be created or destroyed, only transformed. **Power** is the rate at which work is done ($P = W/t$).",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=2WS1sG9fhOk", 
      image_url: "images/physics/work_energy_diagram.jpg" 
    },
    "Momentum": {
      title: "Momentum and Impulse",
      content: "**Momentum ($p=mv$)** is the mass in motion. **Impulse ($J=F\\Delta t$)** is the change in momentum. The **Law of Conservation of Momentum** holds for collisions.",
      full_explanation: "**Momentum** is a vector quantity conserved in a closed system. **Impulse** is a force applied over time. In an **elastic collision**, both momentum and kinetic energy are conserved. In an **inelastic collision**, only momentum is conserved (kinetic energy is lost).",
      level: "Core Concept",
      youtube_link: "https://www.youtube.com/watch?v=NIVNfI0RN2k", 
      image_url: "images/physics/collision_diagram.jpg" 
    },
    "Rotational Motion": {
      title: "Rotational Dynamics: Torque and Inertia",
      content: "Rotational motion involves angular displacement, velocity, and acceleration. **Torque ($\\tau$)** is the rotational equivalent of force. **Moment of Inertia ($I$)** is rotational mass.",
      full_explanation: "**Torque** causes angular acceleration. The rotational equivalent of Newton's second law is $\\tau_{net}=I\\alpha$. **Angular Momentum ($L=I\\omega$)** is conserved when no external torque acts on a system.",
      level: "Advanced",
      youtube_link: "https://www.youtube.com/watch?v=4tLs8ioQWXA", 
      image_url: "images/physics/rotational_torque.jpg" 
    },
    "Waves & Optics": {
      title: "Waves & Optics: Properties and Phenomena",
      content: "Waves transfer energy (not matter). Key properties: wavelength, frequency, amplitude. **Optics** covers light phenomena like reflection, refraction, and interference.",
      full_explanation: "**Wave Optics** (or Physical Optics) focuses on light as a wave, explaining phenomena like **Interference** (Young's Double Slit) and **Diffraction** (bending of waves around edges). **Refraction** is the bending of light as it passes from one medium to another.",
      level: "Advanced",
      youtube_link: "https://www.youtube.com/watch?v=vsO3tgDfCTM", 
      image_url: "images/physics/wave_diffraction.jpg" 
    },
  }
};


/* ===========================
    Storage keys (Unchanged)
    =========================== */
const PROG_KEY = "sl_progress_v_final";
const THEME_KEY = "sl_theme_v_final";
const META_KEY = "sl_meta_v_final";


/* ===========================
    Helpers (Utility Functions)
    =========================== */

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "subtle";
  } catch {
    return "subtle";
  }
}
function saveTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}
}

function getUserId() {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const storedStudentDetails = JSON.parse(localStorage.getItem("studentDetails") || "{}");
    return storedStudentDetails.email || userData.id || 'demo-user'; 
  } catch {
    return 'demo-user';
  }
}

/* emoji/confetti burst */
function emojiBurstAt(container, count = 14) {
  if (!container) return;
  const wrap = document.createElement("div");
  wrap.className = "emoji-burst";
  wrap.style.position = "absolute";
  wrap.style.left = "0";
  wrap.style.top = "0";
  wrap.style.pointerEvents = "none";
  container.appendChild(wrap);

  const emojis = ["✨", "🎉", "💙", "⭐", "👏", "🎈"];
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.position = "absolute";
    s.style.left = `${50 + (Math.random() - 0.5) * 200}px`;
    s.style.top = `${20 + (Math.random() - 0.5) * 100}px`;
    s.style.transform = `translate(0,0) rotate(${Math.random() * 360}deg)`;
    s.style.opacity = "1";
    s.style.fontSize = `${12 + Math.floor(Math.random() * 18)}px`;
    s.style.transition = "transform 900ms ease-out, opacity 900ms ease-out";
    wrap.appendChild(s);
    setTimeout(() => {
      s.style.transform = `translate(${(Math.random() - 0.5) * 400}px, ${(Math.random() - 0.5) * 400}px) rotate(${Math.random() * 720}deg) scale(0.9)`;
      s.style.opacity = "0";
    }, 20 + Math.random() * 60);
  }
  setTimeout(() => {
    try {
      wrap.remove();
    } catch {}
  }, 1100);
}

/* safe id */
function safeId(str) {
  return str.replace(/\s+/g, "-").replace(/[^\w-]/g, "").toLowerCase();
}

/**
 * REMOVAL OF SPECIAL CHARACTERS & MARKDOWN FIX:
 * Converts Markdown bolding (**) to HTML <strong> tags and removes other symbols
 * for clean display in innerHTML and JSX strings.
 */
function cleanAndFormatText(text) {
    if (!text) return "";
    
    // 1. Convert Markdown bolding (**) to HTML <strong> tags
    let htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 2. Remove other common Markdown line elements (like headers and list markers)
    htmlText = htmlText.replace(/^#+\s/gm, ''); // Remove # headers
    htmlText = htmlText.replace(/^[\*-]\s/gm, ''); // Remove list markers
    
    // 3. Convert line breaks (\n) to HTML breaks (<br>)
    htmlText = htmlText.replace(/\n/g, '<br>');

    return htmlText;
}

/**
 * NEW: Strips all LaTeX delimiters, HTML tags, and Markdown symbols 
 * for use in plain text displays (like card titles/descriptions).
 */
function stripAllFormatting(text) {
    if (!text) return "";
    
    // 1. Remove HTML tags (e.g., <strong>, <br>)
    let cleanText = text.replace(/<[^>]*>/g, '');
    
    // 2. Remove Markdown bold/italic markers (**)
    cleanText = cleanText.replace(/\*\*/g, '');
    
    // 3. Remove LaTeX delimiters ($) and excess backslashes (\)
    cleanText = cleanText.replace(/\$/g, '');
    cleanText = cleanText.replace(/\\/g, '');

    return cleanText.trim();
}


/* =======================================================
    DEFINITIVE COMPONENT DECLARATIONS
    ======================================================= */

function StudyIcon({ size = 42, neon = false }) {
  return (
    <div className={`study-icon ${neon ? "neon" : ""}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <radialGradient id="g1" cx="30%" cy="25%">
            <stop offset="0%" stopColor="#bfefff" />
            <stop offset="60%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#071028" />
          </radialGradient>
          <linearGradient id="g2" x1="0" x2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" fill="url(#g1)" />
        <g fill="#fff" opacity="0.95">
          <path d="M16 30c3-3 7-2 7-2s1-4 4-6c-4-1-6 2-6 2s-1-3-4-5c-2 5-1 11-1 11z" />
        </g>
      </svg>
    </div>
  );
}

function ProgressBar({ value = 0, height = 10 }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-outer" style={{ height }}>
      <div className="progress-inner" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Function StudyMaterialModal 
function StudyMaterialModal({ material, onClose }) {
  if (!material) return null;

  const formattedContent = material.full_explanation.split(/(\$[^$]+\$)/g).map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      return <span key={index} style={{ fontStyle: 'italic', fontWeight: 'bold' }}>{latex.replace(/\\/g, '')}</span>;
    }
    // Apply bolding fix here for static content that uses **
    if (part.includes('**')) {
        return <span key={index} dangerouslySetInnerHTML={{ __html: cleanAndFormatText(part) }} />;
    }
    return part;
  });

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '15px'}}>
          <h2 style={{margin: 0, color: 'var(--accent1)'}}>{material.title}</h2>
          <button className="btn ghost" onClick={onClose} style={{border: 'none', fontSize: '1.5rem', padding: '0 10px'}}>&times;</button>
        </div>
        <div style={{ marginBottom: '15px', fontSize: '14px' }}>
            <span style={{ fontWeight: 800, marginRight: '10px' }}>Subject:</span> {material.subj} - {material.subtopic}
            <span style={{ marginLeft: '20px', fontWeight: 800, color: 'var(--accent2)' }}>Level:</span> <span style={{ fontWeight: 700 }}>{material.level || 'N/A'}</span>
        </div>
        
        {/* --- IMAGE DISPLAY --- */}
        {material.image_url && (
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                <img 
                    src={`/${material.image_url}`} 
                    alt={`Diagram for ${material.title}`} 
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid var(--card-border)' }} 
                />
            </div>
        )}

        <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
          {formattedContent}
        </p>

        {/* --- YOUTUBE LINK BUTTON --- */}
        {material.youtube_link && (
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--card-border)' }}>
                <a href={material.youtube_link} target="_blank" rel="noopener noreferrer">
                    <button className="btn primary">Watch Video Explanation 📺</button>
                </a>
            </div>
        )}

        <div style={{ textAlign: 'right', marginTop: '20px' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

async function fetchProgressFromBackend(userId) {
  await new Promise(resolve => setTimeout(resolve, 300));
  const stored = JSON.parse(localStorage.getItem(PROG_KEY) || "{}");
  console.log(`[API MOCK] Fetched progress for ${userId}:`, stored);
  return { success: true, progress: stored };
}

async function saveProgressToBackend(userId, subjectName, newProgress) {
  await new Promise(resolve => setTimeout(resolve, 300));
  localStorage.setItem(PROG_KEY, JSON.stringify(newProgress));
  console.log(`[API MOCK] Saved progress for ${userId}/${subjectName}`);
  return { success: true };
}




function VideoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subject, topic, topicCode } = location.state || {};

  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState(null);

  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 1️⃣ Load video on mount
  useEffect(() => {
    if (!topicCode) {
      setError("No topic selected.");
      setLoading(false);
      return;
    }

    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchTopicContent(topicCode);
        console.log("Fetched video data:", data);
        if (data.success) {
          // store full response (including any quiz) on videoData
          setVideoData(data);
        } else {
          setError(data.message || "Failed to fetch video.");
        }
      } catch (e) {
        console.error("Error fetching video:", e);
        setError("Failed to fetch video. Please try again.");
      } finally {
        setLoading(false);
      }
        };

        loadVideo();
      }, [topicCode]);

      // 2️⃣ Use quiz embedded in videoData when user clicks button (no separate API call)
      const handleTakeQuiz = async () => {
        try {
      setQuizLoading(true);
      setQuizError(null);

      if (!videoData) {
        setQuizError("Video data not loaded yet. Please wait and try again.");
        return;
      }

      const sourceQuiz = videoData.quiz || videoData.quiz || null;
      if (!sourceQuiz || !Array.isArray(sourceQuiz) || sourceQuiz.length === 0) {
        setQuizError("No quiz available for this video.");
        return;
      }

      // Normalize quiz items so the UI uses: { question, options, correct_answer, explanation }
      const letterToIndex = (letter) => {
        const map = { A: 0, B: 1, C: 2, D: 3 };
        return map[(letter || "").toUpperCase()] ?? -1;
      };

      const transformed = sourceQuiz.map((item) => {
        const opts = item.options || item.opts || [];
        let correct = item.correct_answer ?? item.answer ?? null;

        // If API returned a letter (A/B/C/D), convert to actual option string
        if (typeof correct === "string" && /^[A-Da-d]$/.test(correct.trim())) {
          const idx = letterToIndex(correct.trim());
          if (idx >= 0 && idx < opts.length) correct = opts[idx];
        }

        return {
          question: item.question || item.question_text || "",
          options: opts,
          correct_answer: correct,
          explanation: item.explanation || "",
          category: item.category || item.difficulty || "mixed",
        };
      });

      setQuiz(transformed);
      setAnswers({});
      setScore(null);
      setSubmitted(false);
        } catch (err) {
      console.error("Error preparing quiz from video data:", err);
      setQuizError("Error preparing quiz. Please try again.");
        } finally {
      setQuizLoading(false);
        }
      };

  // 3️⃣ Handle user selecting an answer
  const handleAnswerSelect = (qIndex, option) => {
    if (!submitted) {
      setAnswers((prev) => ({ ...prev, [qIndex]: option }));
    }
  };

  // 4️⃣ Handle quiz submission
  const handleSubmitQuiz = () => {
    let total = quiz.length;
    let correct = 0;

    quiz.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });

    setScore(((correct / total) * 100).toFixed(1));
    setSubmitted(true);
  };

  // 🧠 Loader / error handling
  if (loading) return <Loader message={`Loading video for ${topic}...`} />;

  if (error)
    return (
      <div style={{ padding: 20 }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );

  // 🧩 Main UI
  return (
    <div className="video-page-container" style={{ padding: "20px" }}>
      <h2>{topic}</h2>

      {/* Video player */}
      <div style={{ margin: "20px 0" }}>
        <iframe
          width="100%"
          height="500"
          src={`https://www.youtube.com/embed/${videoData.youtube_id}`}
          title={videoData.topic || topic}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* Take quiz button */}
      <button className="btn primary" onClick={handleTakeQuiz}>
        Take Quiz from Video
      </button>

      {/* Quiz Section */}
      <div style={{ marginTop: "30px" }}>
        {quizLoading && <Loader message="Generating quiz..." />}
        {quizError && <p style={{ color: "red" }}>{quizError}</p>}

        {quiz && (
          <div className="quiz-section">
            <h3>Quiz on {topic}</h3>
            {quiz.map((q, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "20px",
                  padding: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  background: "#f9f9f9",
                }}
              >
                <p>
                  <strong>
                    {index + 1}. {q.question}
                  </strong>
                </p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {q.options.map((opt, i) => {
                    const isSelected = answers[index] === opt;
                    const isCorrect =
                      submitted && opt === q.correct_answer;
                    const isWrong =
                      submitted && isSelected && opt !== q.correct_answer;

                    return (
                      <li key={i} style={{ marginBottom: "8px" }}>
                        <button
                          onClick={() => handleAnswerSelect(index, opt)}
                          disabled={submitted}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px",
                            borderRadius: "6px",
                            cursor: submitted ? "default" : "pointer",
                            backgroundColor: isCorrect
                              ? "#c8e6c9"
                              : isWrong
                              ? "#ffcdd2"
                              : isSelected
                              ? "#e3f2fd"
                              : "#fff",
                            border: isSelected
                              ? "2px solid #2196f3"
                              : "1px solid #ccc",
                          }}
                        >
                          {opt}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Submit button */}
            {!submitted && (
              <button
                className="btn primary"
                style={{ marginTop: "20px" }}
                onClick={handleSubmitQuiz}
                disabled={Object.keys(answers).length < quiz.length}
              >
                Submit Quiz
              </button>
            )}

            {/* Score Display */}
            {submitted && (
              <div
                style={{
                  marginTop: "25px",
                  padding: "15px",
                  borderRadius: "10px",
                  background: "#e8f5e9",
                }}
              >
                <h3>🎯 Your Score: {score}%</h3>
                <p>
                  Correct:{" "}
                  {Math.round((score / 100) * quiz.length)} / {quiz.length}
                </p>
                <button
                  className="btn"
                  style={{ marginTop: "10px" }}
                  onClick={() => {
                    setQuiz(null);
                    setAnswers({});
                    setScore(null);
                    setSubmitted(false);
                  }}
                >
                  Retake Quiz
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



// ===================== SUBJECT MAP =====================
function SubjectMap() {
  const { subjectId } = useParams();
  const subjectName = decodeURIComponent(subjectId || "");
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState({});  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTopics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchSubjectTopics(subjectName);
        if (response.success) {
          setTopics(response.topics);
          const userId = getUserId();
          const progressResponse = await fetchProgressFromBackend(userId);
          if (progressResponse.success) {
            setProgress(progressResponse.progress);
          }
        } else {
          setError(response.message || 'Failed to load topics');
        }
      } catch (e) {
        console.error("Error fetching topics:", e);
        setError('Failed to connect to server. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (subjectName) loadTopics();
  }, [subjectName]);

  const handleSaveProgress = useCallback(async (newProgress) => {
    const userId = getUserId();
    setProgress(newProgress);
    try {
      await saveProgressToBackend(userId, subjectName, newProgress);
    } catch (e) {
      console.error("Failed to save progress:", e);
    }
  }, [subjectName]);

  if (loading) return <Loader message={`Loading ${subjectName} topics...`} />;
  if (error) return <div>Error: {error}</div>;
  if (topics.length === 0) return <div>No topics found for {subjectName}</div>;

  const total = topics.length;
  const doneCount = topics.filter((t) => progress?.[subjectName]?.[t.title]).length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const toggleTopic = (topicTitle) => {
    setProgress((p) => {
      const copy = JSON.parse(JSON.stringify(p || {}));
      if (!copy[subjectName]) copy[subjectName] = {};
      copy[subjectName][topicTitle] = !copy[subjectName][topicTitle];
      handleSaveProgress(copy);
      return copy;
    });
  };

  return (
    <div className="subject-map-wrapper">
      <div className="container">
        <h2>{subjectName} Curriculum</h2>
        <div>Progress: {percent}%</div>

        <div>
          {topics.map((t) => {
            const done = !!progress?.[subjectName]?.[t.title];
            return (
              <div key={t.code} className={`subtopic-row ${done ? 'done' : ''}`}>
                <div className="topic-details">
                  <div>{t.title}</div>
                  <div>{t.has_video && '📹'} {t.has_quiz && '📝'}</div>
                </div>
                <div className="topic-actions">
                  <button 
                    className="btn ghost small"
                    onClick={() => navigate('/video', { state: { subject: subjectName, topic: t.title, topicCode: t.code } })}
                  >
                    Watch Video
                  </button>
                  <button 
                    className={`btn small ${done ? 'ghost' : 'primary'}`} 
                    onClick={() => navigate('/ai-quiz', { state: { subject: subjectName, topic: t.title, topicCode: t.code } })}
                  >
                    {done ? 'Re-Test' : 'Start Quiz'}
                  </button>
                  <button 
                    className="btn small ghost toggle-btn"
                    onClick={() => toggleTopic(t.title)}
                  >
                    {done ? 'Mark Incomplete' : 'Mark Complete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// function SubjectMap() {
//   const { subjectId } = useParams();
//   const subjectName = decodeURIComponent(subjectId || "");
//   const subject = CURRICULUM[subjectName];
//   const navigate = useNavigate();
  
//   const [progress, setProgress] = useState({});  
//   const [loading, setLoading] = useState(true);
//   const canvasRef = useRef(null); 

//   useEffect(() => {
//     const userId = getUserId();
//     const loadData = async () => {
//       setLoading(true);
//       try {
//         const response = await fetchProgressFromBackend(userId);
//         if (response.success) {
//           setProgress(response.progress);
//         }
//       } catch (e) {
//         console.error("Error fetching progress:", e);
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadData();
//   }, [subjectName]);


//   const handleSaveProgress = useCallback(async (newProgress) => {
//     const userId = getUserId();
//     setProgress(newProgress);
    
//     try {
//       await saveProgressToBackend(userId, subjectName, newProgress);
//     } catch (e) {
//       console.error("Failed to save progress to backend:", e);
//     }
//   }, [subjectName]);

//   if (!subject) {
//     return (
//       <div className="subject-map-wrapper">
//         <div className="container">
//           <h2>Not found</h2>
//           <button className="btn" onClick={() => navigate("/topics")}>Back to Topics</button>
//         </div>
//         <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
//       </div>
//     );
//   }

//   const subs = subject.subtopics;
//   const total = subs.length;
//   const doneCount = subs.filter((t) => progress?.[subjectName]?.[t]).length;
//   const percent = total ? Math.round((doneCount / total) * 100) : 0;

//   function toggleTopic(t) {
//     setProgress((p) => {
//       const copy = JSON.parse(JSON.stringify(p || {}));
//       if (!copy[subjectName]) copy[subjectName] = {};
      
//       const newProgress = {
//         ...copy,
//         [subjectName]: {
//           ...copy[subjectName],
//           [t]: !copy[subjectName][t]
//         }
//       };
      
//       handleSaveProgress(newProgress);
      
//       return newProgress;
//     });

//     const container = document.querySelector(".map-list-container");
//     const target = container && container.querySelector(`[data-topic="${safeId(t)}"]`);
//     emojiBurstAt(target || container, 12);
//   }
  
//   const markAllComplete = () => {
//     setProgress((p) => {
//       const copy = JSON.parse(JSON.stringify(p || {}));
//       if (!copy[subjectName]) copy[subjectName] = {};
//       subject.subtopics.forEach(s => (copy[subjectName][s] = true));
//       handleSaveProgress(copy);
//       return copy;
//     });
//     emojiBurstAt(document.querySelector(".map-list-container") || document.body, 20);
//   };
  
//   const resetProgress = () => {
//     setProgress((p) => {
//       const copy = JSON.parse(JSON.stringify(p || {}));
//       copy[subjectName] = {};
//       handleSaveProgress(copy);
//       return copy;
//     });
//   };

//   if (loading) {
//     return (
//       <div className="subject-map-wrapper">
//         <div className="container">
//           <h2>Loading {subjectName} Content... 🧠</h2>
//           <div className="muted">Fetching personalized data...</div>
//         </div>
//         <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
//       </div>
//     );
//   }

//   return (
//     <div className="subject-map-wrapper">
//       <div className="container">
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: '1px solid var(--card-border)', paddingBottom: '15px' }}>
//           <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
//             <button className="btn ghost" onClick={() => navigate("/topics")}>← Back</button>
//             <div>
//               <h2 style={{ margin: 0, color: 'var(--accent1)' }}>{subjectName} Curriculum</h2>
//               <div className="muted" style={{ fontWeight: 600 }}>{percent}% complete — {doneCount}/{total} topics mastered</div>
//             </div>
//           </div>

//           <div style={{ display: "flex", gap: 8 }}>
//             <button className="btn small" onClick={markAllComplete}>Mark all complete</button>
//             <button className="btn small ghost" onClick={resetProgress}>Reset</button>
//           </div>
//         </div>
        
//         <div style={{ marginTop: 20 }}>
//             <h3>Progress Overview</h3>
//             <div className="map-progress-card">
//                 <StudyIcon size={60} neon />
//                 <div style={{ flexGrow: 1 }}>
//                     <div style={{ fontWeight: 900, marginBottom: 4 }}>Overall Mastery: {percent}%</div>
//                     <ProgressBar value={percent} height={12} />
//                     <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>You have {doneCount} core concepts mastered.</div>
//                 </div>
//             </div>
//         </div>

//         {/* List/Table View for Subtopics */}
//         <div style={{ marginTop: 30 }}>
//             <h3>Topics ({total})</h3>
//             <div className="map-list-container" ref={canvasRef}>
//                 {subs.map((t) => {
//                     const done = !!progress?.[subjectName]?.[t];

//                     return (
//                         <div key={t} data-topic={safeId(t)} className={`subtopic-row ${done ? 'done' : ''}`}>
//                             <div className="topic-details">
//                                 <span className="topic-icon">{done ? '✅' : '🧠'}</span>
//                                 <div style={{ flexGrow: 1 }}>
//                                     <div className="topic-title">{t}</div>
//                                 </div>
//                             </div>
                            
//                             <div className="topic-actions">
//                                 {/* Study Material Button */}
//                                 <button 
//                                     className="btn ghost small" 
//                                     onClick={() => navigate('/materials', { state: { subject: subjectName, topic: t } })}
//                                 >
//                                     Study Material
//                                 </button>
//                                 {/* Start Quiz Button */}
//                                 <button 
//                                     className={`btn small ${done ? 'ghost' : 'primary'}`} 
//                                     onClick={() => navigate('/ai-quiz', { state: { subject: subjectName, topic: t } })}
//                                 >
//                                     {done ? 'Re-Test' : 'Start Quiz'}
//                                 </button>
//                                 <button 
//                                     className="btn small ghost toggle-btn" 
//                                     onClick={() => toggleTopic(t)}
//                                     title={`Click to mark as ${done ? 'incomplete' : 'complete'}`}
//                                 >
//                                     {done ? 'Mark Incomplete' : 'Mark Complete'}
//                                 </button>
//                             </div>
//                         </div>
//                     );
//                 })}
//             </div>
//         </div>

//         <div style={{ marginTop: 24 }} className="muted">
//             Tip: Click 'Start Quiz' to test your knowledge or use the action button to toggle completion status.
//         </div>

//       </div>
//       <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
//     </div>
//   );
// }

// Function AIGeneratedMaterial (MODIFIED for dynamic content & quiz generation)
function AIGeneratedMaterial({ subject, topic }) {
    const navigate = useNavigate();
    const [material, setMaterial] = useState(null);
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState(null);

    const generate = useCallback(async () => {
        setLoading(true);
        setMaterial(null);
        setQuiz(null);
        
        console.log(`[AI MOCK] Generating material and quiz for ${subject}: ${topic}...`);
        
        // 1. Get AI Decision (based on last quiz score for this topic)
        const { decision } = getLastQuizMetrics(subject, topic);

        // 2. Call the Mock API to get both material and 10-question quiz
        const apiResult = await fetchAiContent(subject, topic);
        
        // The study_material_text from the backend is used to populate the content field
        const personalizedMaterial = {
            ...apiResult.personalized_material,
            full_explanation: apiResult.study_material_text,
            // Use the actual decision for level/goal
            level: decision.strategy,
            goal: decision.goal,
        };
        setMaterial(personalizedMaterial);

        // 3. Process Quiz JSON (which is a string from the mock API)
        const quizObject = JSON.parse(apiResult.quiz_json_string); 
        
        // Convert AI-JSON to Frontend-Quiz-Structure 
        const frontendQuizQuestions = quizObject.questions.map((q, index) => {
            // Find the correct answer index from the options array
            const correctIndex = q.options.findIndex(opt => opt === q.correct_answer);
            return {
                q: q.question_text,
                metadata: { 
                    difficulty: q.difficulty_level, 
                    strategy: decision.strategy,
                    explanation: q.explanation 
                },
                choices: q.options, 
                answer: correctIndex 
            };
        });

        const finalQuiz = {
            title: `AI-Recommended Quiz: ${decision.action}`,
            // The instruction now confirms the 10 question count
            instruction: `This quiz is tailored for your ${decision.strategy} strategy. Goal: ${decision.goal}. It contains ${frontendQuizQuestions.length} questions.`, 
            questions: frontendQuizQuestions
        };
        
        setQuiz(finalQuiz);
        
        setLoading(false);
    }, [subject, topic, navigate]);
    
    useEffect(() => {
        if (subject && topic) {
            generate();
        }
    }, [subject, topic, generate]);

    
    if (loading) {
        return <div className="ai-loader">AI is analyzing performance and generating notes & quiz... 💡</div>;
    }
    
    if (material) {
        // Prepare content for rendering (Markdown Fix)
        const formattedFullExplanation = cleanAndFormatText(material.full_explanation);

        return (
            <article className="article-card ai-card" style={{borderColor: 'var(--accent2)', borderStyle: 'dashed'}}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div className="muted" style={{ fontWeight: 800 }}>AI Decision: {cleanAndFormatText(material.level)}</div>
                        <h3 style={{ marginTop: 6, color: 'var(--accent2)' }}>{cleanAndFormatText(material.title)}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent2)', fontWeight: 700 }}>Goal: {cleanAndFormatText(material.goal || 'N/A')}</div>
                    </div>
                    <StudyIcon size={56} neon />
                </div>
                <p className="muted" style={{ marginTop: 8, fontSize: '0.9rem' }}>{cleanAndFormatText(material.content)}</p>
                
                {/* Display Quiz Link or Retake Button */}
                {quiz && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent1)' }}>{cleanAndFormatText(quiz.title)}</h4>
                        <p className="muted" style={{fontSize: '0.85rem'}}>{cleanAndFormatText(quiz.instruction)}</p>
                        <button 
                            className="btn primary small" 
                            onClick={() => {
                                navigate('/ai-quiz', { state: { subject, topic } });
                            }}
                        >
                            Start Recommended Quiz ({quiz.questions.length} Qs)
                        </button>
                    </div>
                )}

                <div style={{ marginTop: 12 }}>
                    <button className="btn ghost" onClick={() => {
                        document.querySelector('.modal-backdrop.ai-modal').style.display = 'flex';
                        const modalContent = document.getElementById('ai-modal-content');
                        if (modalContent) {
                            // Uses the new formatted HTML string to render
                            modalContent.innerHTML = `
                                <div style="font-weight:900; color:var(--accent2)">AI-GENERATED CONTENT</div>
                                <h2 style="color:var(--accent1)">${cleanAndFormatText(material.title)}</h2>
                                ${material.image_url ? 
                                    `<div style="margin-bottom:15px; text-align:center;"><img src="/${material.image_url}" alt="Diagram for ${material.title}" style="max-width:100%; max-height:300px; border-radius:8px; border:1px solid var(--card-border);" /></div>` 
                                    : ''}
                                <p style="line-height: 1.6; white-space: pre-wrap; font-size: 1rem;">${formattedFullExplanation}</p>
                                ${material.youtube_link ? `<div style="margin-top:20px; padding-top:15px; border-top:1px solid var(--card-border);"><a href="${material.youtube_link}" target="_blank" rel="noopener noreferrer"><button class="btn primary">Watch Related Video 📺</button></a></div>` : ''}
                            `;
                        }
                    }}>Read Full AI Report</button>
                    
                    <button className="btn small" onClick={generate} style={{marginLeft: '8px'}}>Regenerate Content</button>
                </div>
                
                <div className="modal-backdrop ai-modal" style={{display: 'none'}}>
                   <div className="modal-content" onClick={e => e.stopPropagation()}>
                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '15px'}}>
                       <h2 style={{margin: 0, color: 'var(--accent1)'}}>AI Study Material</h2>
                       <button className="btn ghost" onClick={() => document.querySelector('.modal-backdrop.ai-modal').style.display = 'none'} style={{border: 'none', fontSize: '1.5rem', padding: '0 10px'}}>&times;</button>
                     </div>
                     <div id="ai-modal-content" style={{ lineHeight: '1.6', color: 'var(--text)' }}></div>
                     <div style={{ textAlign: 'right', marginTop: '20px' }}>
                       <button className="btn" onClick={() => document.querySelector('.modal-backdrop.ai-modal').style.display = 'none'}>Close</button>
                     </div>
                   </div>
                 </div>

            </article>
        );
    }
    
    return (
        <div className="ai-card" style={{border: '1px dashed var(--accent1)', padding: '20px', borderRadius: '12px', textAlign: 'center'}}>
            <p style={{marginBottom: '10px', fontWeight: 'bold'}}>Analyze your history to generate personalized content and a recommended quiz.</p>
            <button className="btn primary" onClick={generate}>Generate AI Study Material</button>
        </div>
    );
}


function StudyMaterials() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const subjects = Object.keys(STUDY_MATERIALS);
  
  const stateSubject = location.state?.subject;
  const stateTopic = location.state?.topic;

  const materialsList = subjects.flatMap(s => {
    return Object.keys(STUDY_MATERIALS[s]).map(t => ({
      id: `${s}-${t}`,
      subj: s,
      subtopic: t,
      ...STUDY_MATERIALS[s][t]
    }));
  });
  
  let displayedMaterials = materialsList;
  
  if (stateSubject && stateTopic) {
      const staticMaterial = materialsList.filter(a => a.subj === stateSubject && a.subtopic === stateTopic);
      
      if (staticMaterial.length > 0) {
          displayedMaterials = staticMaterial;
      } else {
          const dummy = generateMockMaterial(stateSubject, stateTopic);
          displayedMaterials = [dummy];
      }
  }

  const featuredSubject = subjects[0];
  const featuredTopic = CURRICULUM[featuredSubject].subtopics[0];

  const headerTitle = 
    stateSubject && stateTopic
      ? `Study Material: ${stateSubject} - ${stateTopic}`
      : "Study Materials Library";
  
  return (
    <div className="container">
      <h2 className="page-title">{headerTitle}</h2>
      <p className="muted">Welcome to the Study Materials section — your go-to place for quick learning and smart revision. Find core materials below, or generate a personalized report with the SmartLearn AI engine!</p>
      
      {/* Show AI Generator only when a topic is explicitly selected */}
      {stateSubject && stateTopic ? (
        <AIGeneratedMaterial 
          subject={stateSubject} 
          topic={stateTopic} 
        />
      ) : (
        <AIGeneratedMaterial 
          subject={featuredSubject} 
          topic={featuredTopic} 
        />
      )}

      <h3 style={{marginTop: '30px'}}>
        {displayedMaterials.length === 1 ? 'Core Content' : 'Core Curriculum Materials'}
      </h3>
      
      {displayedMaterials.length > 0 ? (
        <div className="grid-articles">
          {displayedMaterials.map(a => (
            <article className="article-card" key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div className="muted" style={{ fontWeight: 800 }}>{stripAllFormatting(`${a.subj} - ${a.subtopic}`)}</div>
                  <h3 style={{ marginTop: 6 }}>{stripAllFormatting(a.title)}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent1)', fontWeight: 700 }}>Level: {stripAllFormatting(a.level || 'N/A')}</div>
                </div>
                <StudyIcon size={56} />
              </div>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.9rem' }}>{stripAllFormatting(a.content)}</p>
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => setSelectedMaterial(a)}>Read More</button>
                <button 
                    className="btn ghost" 
                    style={{ marginLeft: 8 }} 
                    onClick={() => 
                        navigate('/ai-quiz', { state: { subject: a.subj, topic: a.subtopic } })
                      }
                >
                  Test Yourself
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ textAlign: 'center', padding: '20px', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
          No core materials found for {stateSubject} - {stateTopic}. Try generating AI content above.
        </div>
      )}
      
      <StudyMaterialModal 
        material={selectedMaterial} 
        onClose={() => setSelectedMaterial(null)} 
      />
      
      <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
    </div>
  );
}


function AIQuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const subjects = Object.keys(CURRICULUM);
  
  // Use fallbacks for initial state in case the page is accessed directly
  const initialSubject = location.state?.subject || subjects[0];
  const initialTopic = location.state?.topic || CURRICULUM[initialSubject]?.subtopics[0];

  const [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(initialTopic);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  // 1. Logic to update state when navigating from another page (e.g., Study Materials)
useEffect(() => {
  if (location.state?.fromVideo && location.state?.topic) {
    // 👇 When redirected from /video page
    setTopic(location.state.topic);
    fetchQuizFromApi(location.state.topic);
  } else if (location.state?.subject && location.state?.topic) {
    setSubject(location.state.subject);
    setTopic(location.state.topic);
    navigate(location.pathname, { replace: true, state: {} });
  }
}, [location.state, location.pathname, navigate]);
  
  const generateQuiz = useCallback(async () => {
    setLoading(true);
    setQs([]); setAns({}); setSubmitted(false); setScore(null);
    // Log the request for 10 questions
    console.log(`[AI MOCK] Requesting 10-question quiz for ${subject}: ${topic}`);
    
    const { decision } = getLastQuizMetrics(subject, topic);
    
    // 2. Call the Mock API to get the 10-question quiz
    const apiResult = await fetchAiContent(subject, topic);
    const quizObject = JSON.parse(apiResult.quiz_json_string); 
    
    // 3. Convert AI-JSON to Frontend-Quiz-Structure 
    const generatedQs = quizObject.questions.map((q, index) => {
        // Find the correct answer index from the options array
        const correctIndex = q.options.findIndex(opt => opt === q.correct_answer);
        return {
            q: q.question_text,
            metadata: { 
                difficulty: q.difficulty_level, 
                strategy: decision.strategy,
                explanation: q.explanation // <<-- New explanation field included
            },
            choices: q.options, 
            answer: correctIndex 
        };
    });
    
    setQs(generatedQs);
    setLoading(false);
  }, [subject, topic]);
  
  // 2. Logic to generate quiz on initial load and whenever subject/topic changes
  useEffect(() => {
    generateQuiz();
  }, [subject, topic, generateQuiz]);


  const submit = async () => {
    const responses = qs.map((q, i) => {
      const correct = ans[i] === q.answer;
      return {
        id: i + 1,
        correct,
        timeTaken: Math.random() * 15 + 3,
        question: q.q,
        chosenAnswer: q.choices[ans[i]],
        correctAnswer: q.choices[q.answer],
        timestamp: new Date().toISOString(),
        topic: topic,
        subject: subject
      };
    });

    let correct = responses.filter(r => r.correct).length;
    const accuracy = correct / qs.length;

    const allAttempts = JSON.parse(localStorage.getItem("quizAttempts") || "[]");
    const globalAvgAccuracy = calculateOverallAccuracy(allAttempts); 
    const advMetrics = simulateAdvancedMetrics(responses, allAttempts.length + 1, globalAvgAccuracy);
    
    const metrics = { accuracy, correctCount: correct, total: qs.length, ...advMetrics };
    const aiDecision = await getAIDecision(metrics);

    // --- Progress Update Logic ---
    if (accuracy >= 0.70 && subject && topic && CURRICULUM[subject]?.subtopics.includes(topic)) {
      const progressKey = PROG_KEY;
      const currentProgress = JSON.parse(localStorage.getItem(progressKey) || "{}");
      
      let updatedProgress = { ...currentProgress };
      if (!updatedProgress[subject]) updatedProgress[subject] = {};

      updatedProgress[subject][topic] = true;
      localStorage.setItem(progressKey, JSON.stringify(updatedProgress));
      console.log(`[Progress Update] Marked ${subject}: ${topic} as complete after AI Quiz.`);
    }
    
    const newAttempt = {
      userId: getUserId(),  
      marks: (accuracy * 100).toFixed(0),
      correctCount: correct,
      total: qs.length,
      date: new Date().toLocaleString(),
      decision: aiDecision.action,
      strategy: aiDecision.strategy,
      advancedMetrics: advMetrics,
      responses: responses,  
      subject,
      topic
    };

    const existingAttempts = JSON.parse(localStorage.getItem("quizAttempts") || "[]");
    localStorage.setItem("quizAttempts", JSON.stringify([...existingAttempts, newAttempt]));

    setScore(`${correct}/${qs.length}`);
    setSubmitted(true); 
    if (correct > 0) {
      emojiBurstAt(canvasRef.current || document.body, 16);
    }
    
    const meta = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    meta.quizzes = (meta.quizzes || 0) + 1;
    meta.lastScore = Math.round((correct/qs.length)*100);
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  };
  
  const handleTopicChange = (e) => {
    const newTopic = e.target.value;
    setTopic(newTopic);
  };
  
  const handleSubjectChange = (e) => {
    const newSubject = e.target.value;
    setSubject(newSubject);
    setTopic(CURRICULUM[newSubject]?.subtopics[0]);
  };


  return (
    <div className="container" ref={canvasRef}>
      <h2 className="page-title">AI Quiz (Dynamic)</h2>
      <p className="muted">Welcome to the AI Quiz — select a topic, and our SmartLearn AI engine will dynamically generate a set of **{qs.length || 10} questions** tailored to your learning stage.</p>
      
      {/* 🛑 LAYOUT FIX APPLIED HERE: Flex container for equal widths */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <select value={subject} onChange={handleSubjectChange} disabled={loading} style={{ flex: 1 }}>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={topic} onChange={handleTopicChange} disabled={loading} style={{ flex: 1 }}>
          {CURRICULUM[subject]?.subtopics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {/* The 'Generate Quiz' button is here, replacing the need for a separate 'new quiz' button */}
        <button className="btn primary" onClick={generateQuiz} disabled={loading} style={{ flex: 1, minWidth: '150px' }}>
          {loading ? 'Generating...' : `Generate ${qs.length || 10} Q Quiz`} 
        </button>
      </div>

      {loading && (
        <div className="question-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div className="brain-rotor" aria-hidden style={{ display: 'inline-block' }}>
            <svg viewBox="0 0 64 64" width="32" height="32">
              <g fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 24c0-6 6-10 12-10s12 4 12 10-6 10-12 10S20 30 20 24z" strokeLinejoin="round" />
                <path d="M12 38c0-12 10-16 10-16" />
                <path d="M52 38c0-12-10-16-10-16" />
              </g>
            </svg>
          </div>
          <p className="muted" style={{marginTop: '8px'}}>AI is creating {qs.length > 0 ? qs.length : 10} personalized questions for you...</p>
        </div>
      )}

      {/* Renders questions only if not loading AND questions exist */}
      {!loading && qs.length > 0 && qs.map((q,i) => (
        <div key={i} className="question-card">
          {/* Display the question text */}
          <div style={{ fontWeight: 800 }}>{i+1}. {q.q}</div> 
          
          {/* Display hidden metadata for user context (Now using clean strong tag for structure) */}
          <div style={{ fontSize: '0.7rem', color: 'var(--accent2)', marginTop: '4px' }}>
            Difficulty: <strong>{q.metadata.difficulty}</strong> | Strategy: <strong>{q.metadata.strategy}</strong>
          </div>

          <div className="choices">
            {q.choices.map((c,j) => (
              <label key={j} className={`choice 
                ${submitted && j === q.answer ? "correct" : ""}  
                ${submitted && ans[i] === j && j !== q.answer ? "wrong" : ""}
              `}>
                <input type="radio" name={`q${i}`} checked={ans[i] === j} disabled={submitted} onChange={() => setAns(a => ({ ...(a||{}), [i]: j }))} />
                <span>{c}</span>
              </label>
            ))}
          </div>
          {/* MODIFIED: Display Explanation after submission, using cleanAndFormatText for bolding */}
          {submitted && q.metadata.explanation && (
            <div style={{marginTop: '10px', fontSize: '0.9rem', color: ans[i] === q.answer ? '#10b981' : '#ef4444'}}>
                <strong>Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: cleanAndFormatText(q.metadata.explanation) }} />
            </div>
          )}
        </div>
      ))}
      
      {/* Fallback check if quiz finished loading but returned no questions (shouldn't happen with mock) */}
      {!loading && qs.length === 0 && (
          <div className="question-card" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
              Select a subject and topic, then click 'Generate Quiz' to start.
          </div>
      )}

      {!loading && qs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={submit} disabled={submitted || Object.keys(ans).length < qs.length}>
            {submitted ? "Quiz Submitted" : "Submit Answers"}
          </button>
          
        </div>
      )}

      {score && <div style={{ marginTop: 12, fontWeight: 900 }}>Score: {score}</div>}
      <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
    </div>
  );
}


function SmartLearnApp() {
  const [view, setView] = useState("menu");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState([]);
  const [marksData, setMarksData] = useState(() => {
    const stored = localStorage.getItem("quizAttempts");
    return stored ? JSON.parse(stored) : [];
  });
  const [startTime, setStartTime] = useState(Date.now());
  const [decision, setDecision] = useState(null);
  const [advancedMetrics, setAdvancedMetrics] = useState(null);
  const navigate = useNavigate();

  const startQuiz = () => {
    setResponses([]);
    setCurrentQuestion(0);
    setStartTime(Date.now());
    setDecision(null);
    setAdvancedMetrics(null);
    setView("quiz");
  };

  const handleAnswer = (option) => {
    const q = questions[currentQuestion];
    const correct = option === q.answer;
    const timeTaken = (Date.now() - startTime) / 1000;

    const responseData = {
      id: q.id,
      correct,
      timeTaken,
      question: q.text,
      chosenAnswer: option,
      correctAnswer: q.answer,
      timestamp: new Date().toISOString(),
      topic: q.topic,
      subject: q.subject
    };

    setResponses((prev) => [...prev, responseData]);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((i) => i + 1);
      setStartTime(Date.now());
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const correctCount = responses.filter((r) => r.correct).length;
    const total = questions.length;
    const accuracy = correctCount / total;
    const avgResponseTime =
      responses.reduce((a, b) => a + b.timeTaken, 0) / responses.length;

    const allAttempts = JSON.parse(localStorage.getItem("quizAttempts") || "[]");
    const globalAvgAccuracy = calculateOverallAccuracy(allAttempts);
    const advMetrics = simulateAdvancedMetrics(responses, allAttempts.length + 1, globalAvgAccuracy);
    setAdvancedMetrics(advMetrics);

    const metrics = { accuracy, avgResponseTime, total, correctCount, ...advMetrics };
    const aiDecision = await getAIDecision(metrics);
    setDecision(aiDecision);
    
    const userId = getUserId();

    const newAttempt = {
      userId: userId,  
      marks: (accuracy * 100).toFixed(0),
      correctCount,
      total,
      date: new Date().toLocaleString(),
      decision: aiDecision.action,
      strategy: aiDecision.strategy,  
      advancedMetrics: advMetrics,
      responses: responses,  
      subject: responses[0]?.subject || 'Unknown',  
      topic: responses[0]?.topic || 'Legacy Quiz'
    };

    if (accuracy >= 0.70) {
        const progressKey = PROG_KEY;
        const currentProgress = JSON.parse(localStorage.getItem(progressKey) || "{}");
        const subject = newAttempt.subject;
        const topicsCovered = [...new Set(responses.map(r => r.topic))];

        if (subject && CURRICULUM[subject]) {
            let updatedProgress = { ...currentProgress };
            if (!updatedProgress[subject]) updatedProgress[subject] = {};

            topicsCovered.forEach(topic => {
                if (CURRICULUM[subject].subtopics.includes(topic)) {
                    updatedProgress[subject][topic] = true;
                    console.log(`[Progress Update] Marked ${subject}: ${topic} as complete.`);
                }
            });
            localStorage.setItem(progressKey, JSON.stringify(updatedProgress));
        }
    }

    try {
        console.log("Submitting quiz data to backend...", newAttempt);
        await new Promise(resolve => setTimeout(resolve, 300));  

        const existingAttempts = JSON.parse(localStorage.getItem("quizAttempts") || "[]");
        const updatedAttempts = [...existingAttempts, newAttempt];
        localStorage.setItem("quizAttempts", JSON.stringify(updatedAttempts));
        setMarksData(updatedAttempts);

        localStorage.setItem("quizResponses", JSON.stringify([...(JSON.parse(localStorage.getItem("quizResponses") || "[]")), ...responses]));

    } catch (error) {
        console.error("Failed to submit quiz data to backend (using local storage fallback):", error);
    }
    
    setView("analytics");
  };

  const calculateSessionMetrics = () => {
    if (responses.length === 0) return null;
    
    const avgTime = responses.reduce((sum, r) => sum + r.timeTaken, 0) / responses.length;
    const fastCorrect = responses.filter(r => r.correct && r.timeTaken < 8).length;
    const confidenceScore = Math.round((fastCorrect / responses.length) * 100);  
    
    return {
      avgResponseTime: avgTime.toFixed(1),
      confidenceScore,
      fastCorrect,
      totalQuestions: responses.length,
      slowCorrect: responses.filter(r => r.correct && r.timeTaken >= 8).length,
      incorrect: responses.filter(r => !r.correct).length
    };
  };

  const sessionMetrics = calculateSessionMetrics();

  if (view === "menu") {
    return (
      <div className="container">
        <h1>🧠 SmartLearn AI (Legacy Quiz)</h1>
        <p>Personalized Learning with Real-time Insights</p>
        <button className="btn" onClick={startQuiz}>
          Start Quiz
        </button>
        {marksData.length > 0 && (
          <button className="btn-secondary" onClick={() => setView("analytics")}>
            View Analytics
          </button>
        )}
      </div>
    );
  }

  if (view === "quiz") {
    const q = questions[currentQuestion];
    return (
      <div className="container">
        <h2>
          Question {currentQuestion + 1}/{questions.length}
        </h2>
        <p className="question">{q.text}</p>
        <div className="options">
          {q.options.map((opt) => (
            <button
              key={opt}
              className="btn-option"
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === "analytics" && marksData.length > 0) {
    const latest = marksData[marksData.length - 1];
    const currentDecision = latest.advancedMetrics ? decision : null;
    const currentMetrics = latest.advancedMetrics || advancedMetrics;

    return (
      <div className="container">
        <h1>📊 Legacy Quiz Analytics</h1>
        <p><b>Date:</b> {latest.date}</p>
        <p><b>Marks:</b> {latest.correctCount}/{latest.total}</p>
        <p><b>Accuracy:</b> {latest.marks}%</p>
        <p><b>AI Action:</b> {latest.decision}</p>

        {currentMetrics && (
          <div className="advanced-metrics-box">
            <h3>🤖 AI Mastery & Readiness Scores</h3>
            <div className="insight-grid">
              <div className="insight">
                <span className="insight-label">Topic Mastery Score (TMS):</span>
                <span className="insight-value">{currentMetrics.TopicMasteryScore}</span>
              </div>
              <div className="insight">
                <span className="insight-label">Cognitive Readiness Score (CRS):</span>
                <span className="insight-value">{currentMetrics.CognitiveReadinessScore}</span>
              </div>
              <div className="insight">
                <span className="insight-label">Stability Score (SS):</span>
                <span className="insight-value">{currentMetrics.StabilityScore}</span>
              </div>
              <div className="insight">
                <span className="insight-label">Accuracy Trend:</span>
                <span className="insight-value">{currentMetrics.AccuracyTrend}</span>
              </div>
            </div>
          </div>
        )}

        {currentDecision && (
          <div className="decision-box">
            <h3>AI Strategy: {currentDecision.strategy}</h3>
            <p><b>Pacing:</b> {currentDecision.pacing}</p>
            <p><b>Tone:</b> {currentDecision.tone}</p>
            <p><b>Goal:</b> {currentDecision.goal}</p>
            <p className="muted" style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              **Insight:** {currentDecision.insight}
            </p>
          </div>
        )}

        {sessionMetrics && (
          <div className="cognitive-insights">
            <h3>🧠 Cognitive Insights</h3>
            <div className="insight-grid">
              <div className="insight">
                <span className="insight-label">Average Thinking Time:</span>
                <span className="insight-value">{sessionMetrics.avgResponseTime}s</span>
              </div>
              <div className="insight">
                <span className="insight-label">Confidence Level:</span>
                <span className="insight-value">
                  {sessionMetrics.confidenceScore > 70  
                    ? "High"  
                    : sessionMetrics.confidenceScore > 40  
                    ? "Medium"  
                    : "Low"
                  } ({sessionMetrics.confidenceScore}%)
                </span>
              </div>
              <div className="insight">
                <span className="insight-label">Fast & Correct:</span>
                <span className="insight-value">{sessionMetrics.fastCorrect} questions</span>
              </div>
              <div className="insight">
                <span className="insight-label">Response Pattern:</span>
                <span className="insight-value">
                  {sessionMetrics.fastCorrect > sessionMetrics.slowCorrect  
                    ? "Quick Learner"  
                    : "Thorough Thinker"
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ width: "100%", height: 300, marginTop: 20 }}>
          <ResponsiveContainer>
            <LineChart data={marksData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="marks"
                stroke="#333"
                strokeWidth={3}
                dot={{ r: 6, fill: "#0f5132" }}
                activeDot={{ r: 8, stroke: "#198754", fill: "#198754" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <button className="btn-green" onClick={startQuiz}>
          Reattempt Quiz
        </button>
        <button className="btn-red" onClick={() => setView("menu")}>
          Back to Menu
        </button>
      </div>
    );
  }
  return null;
}


function calculateLearningVelocity(attempts) {
    let totalAccuracy = 0;
    let totalAttempts = 0;
    
    for (const attempt of attempts) {
        totalAccuracy += parseFloat(attempt.marks) / 100;
        totalAttempts += attempt.total;
    }
    return attempts.length === 0 ? 0.0 : totalAccuracy / attempts.length;  
}

function calculateRecallRate(attempts) {
    if (attempts.length === 0) return 0;
    
    const correctItems = attempts.reduce((sum, attempt) => sum + attempt.correctCount, 0);
    const totalItems = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
    
    return totalItems === 0 ? 0.0 : correctItems / totalItems;
}
    
function calculateSessionRegularity(attempts) {
    if (attempts.length <= 1) return 0.5; 
    
    const dates = attempts.map(a => new Date(a.date)).sort((a, b) => a - b);
    const mockRegularity = clamp((new Set(attempts.map(a => a.date.split(',')[0]))).size / 10, 0.3, 0.9);

    return mockRegularity;
}


function Analytics() {
  const progress = JSON.parse(localStorage.getItem(PROG_KEY) || "{}");
  const subjects = Object.keys(CURRICULUM);
  
  const pct = (s) => {
    const subs = CURRICULUM[s]?.subtopics || [];
    const done = subs.filter(t => progress?.[s]?.[t]).length;
    return subs.length ? Math.round((done / subs.length) * 100) : 0;
  };
  
  const avg = Math.round(subjects.reduce((a,s) => a + pct(s), 0) / subjects.length || 0);
  const meta = JSON.parse(localStorage.getItem(META_KEY) || "{}");
  
  const quizAttempts = JSON.parse(localStorage.getItem("quizAttempts") || "[]");
  
  const calculateCognitiveMetrics = () => {
    if (quizAttempts.length === 0) return null;
    
    const allResponses = quizAttempts.flatMap(a => a.responses || []).filter(r => r.timeTaken != null);
    
    if (allResponses.length === 0) return null;

    const avgResponseTime = (allResponses.reduce((sum, r) => sum + r.timeTaken, 0) / allResponses.length).toFixed(1);
    
    const fastCorrectCount = allResponses.filter(r => r.correct && r.timeTaken < 8).length;
    const confidenceScore = Math.round((fastCorrectCount / allResponses.length) * 100);
    
    const learningVelocityValue = calculateLearningVelocity(quizAttempts);
    const recallRateValue = calculateRecallRate(quizAttempts);
    const sessionRegularityValue = calculateSessionRegularity(quizAttempts);
    
    let learningVelocity = "Steady";
    if (learningVelocityValue > 0.8) learningVelocity = "Fast";
    else if (learningVelocityValue < 0.5) learningVelocity = "Needs Review";

    const latestAttemptMetrics = quizAttempts[quizAttempts.length - 1]?.advancedMetrics || simulateAdvancedMetrics(allResponses);

    return {
      avgResponseTime,
      confidenceScore,
      totalQuestions: allResponses.length,
      fastCorrect: fastCorrectCount,
      learningVelocity,
      slowCorrect: allResponses.filter(r => r.correct && r.timeTaken >= 8).length,
      incorrect: allResponses.filter(r => !r.correct).length,
      
      TMS: latestAttemptMetrics.TopicMasteryScore,
      CRS: latestAttemptMetrics.CognitiveReadinessScore,
      C_SS: latestAttemptMetrics.StabilityScore,
      Pacing: latestAttemptMetrics.Pacing,
      Tone: latestAttemptMetrics.Tone,
      AccuracyTrend: latestAttemptMetrics.AccuracyTrend,
      
      RecallRate: (recallRateValue * 100).toFixed(1),
      OverallAccuracy: (calculateOverallAccuracy(quizAttempts) * 100).toFixed(1),
      SessionRegularity: (sessionRegularityValue * 100).toFixed(1),
      LearningVelocityScore: learningVelocityValue.toFixed(3)
    };
  };

  const cognitiveMetrics = calculateCognitiveMetrics();
  
  const calculateStreaks = () => {
    if (quizAttempts.length === 0) return { current: 0, longest: 0 };
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const sorted = [...quizAttempts].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    for (let i = 0; i < sorted.length; i++) {
      if (parseInt(sorted[i].marks) >= 70) {  
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return {
      current: currentStreak,
      longest: longestStreak
    };
  };
  
  
  const streaks = calculateStreaks();
  
  
  const chartData = quizAttempts.map((attempt, index) => ({
    name: `Quiz ${index + 1}`,
    accuracy: parseInt(attempt.marks),
    date: attempt.date.split(',')[0],
    correct: attempt.correctCount,
    total: attempt.total,
    decision: attempt.decision
  }));  
  
  const lastQuiz = quizAttempts.length > 0 ? quizAttempts[quizAttempts.length - 1] : null;
  
  const subjectProgressData = subjects.map(subject => ({
    subject: subject.substring(0, 3),
    fullSubject: subject,
    completion: pct(subject),
    color: pct(subject) >= 70 ? '#10b981' : pct(subject) >= 40 ? '#f59e0b' : '#ef4444'
  })).sort((a, b) => b.completion - a.completion);

  return (
    <div className="container">
      <h2 className="page-title">📊 Analytics Dashboard</h2>
      <p className="muted">Welcome to the Analytics page — track your learning progress and performance in one place. Here, you can view your quiz scores, recent attempts, and overall improvement over time. Use these insights to identify your strengths, focus on weak areas, and make your learning journey smarter and more effective!</p>
      
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-value">{avg}%</div>
          <div className="muted">Overall Completion</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{streaks.current}</div>
          <div className="muted">Current Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{meta.quizzes || 0}</div>
          <div className="muted">Quizzes Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{lastQuiz ? `${lastQuiz.marks}%` : "--"}</div>
          <div className="muted">Last Quiz Score</div>
        </div>
      </div>
      
      {cognitiveMetrics && cognitiveMetrics.TMS && (
        <div style={{ marginTop: 32 }}>
          <h3>🤖 AI Mastery & Readiness Scores</h3>
          <div className="card-grid">
            <div className="stat-card">
              <div className="stat-value">{cognitiveMetrics.TMS}</div>
              <div className="muted">Topic Mastery (TMS)</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-value">{cognitiveMetrics.CRS}</div>
              <div className="muted">Cognitive Readiness (CRS)</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-value">{cognitiveMetrics.C_SS}</div>
              <div className="muted">Stability Score (SS)</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-value">{cognitiveMetrics.Pacing || "--"}</div>
              <div className="muted">Suggested Pacing</div>
            </div>
          </div>
        </div>
      )}


      <div style={{ marginTop: 32 }}>
        <h3>🧠 Cognitive Insights</h3>
        <div className="card-grid">
          <div className="stat-card">
            <div className="stat-value">{cognitiveMetrics?.OverallAccuracy || "0.0"}%</div>
            <div className="muted">Weighted Accuracy</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{cognitiveMetrics?.RecallRate || 0}%</div>
            <div className="muted">Recall Rate</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{cognitiveMetrics?.SessionRegularity || 0}%</div>
            <div className="muted">Session Regularity</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{cognitiveMetrics?.LearningVelocityScore || "0.0"}</div>
            <div className="muted">Learning Velocity</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>Performance Analytics</h3>
        
        <div className="chart-container">
          <h4>Accuracy Trend Over Time</h4>
          {chartData.length > 0 ? (
            <div style={{ width: "100%", height: 300, marginTop: 16 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" opacity={0.3} />
                  <XAxis  
                    dataKey="name"  
                    tick={{ fill: 'var(--text)' }}
                    axisLine={{ stroke: 'var(--muted)' }}
                  />
                  <YAxis  
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text)' }}
                    axisLine={{ stroke: 'var(--muted)' }}
                  />
                  <Tooltip  
                    contentStyle={{  
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px',
                      color: 'var(--text)'
                    }}
                    formatter={(value) => [`${value}%`, 'Accuracy']}
                    labelFormatter={(label, items) => {
                      const item = items[0];
                      const originalIndex = chartData.findIndex(d => d.accuracy === item.value);
                      return item ? `Quiz ${originalIndex + 1}` : label;
                    }}
                  />
                  <Line  
                    type="monotone"  
                    dataKey="accuracy"  
                    stroke="#3b82f6"  
                    strokeWidth={3}
                    dot={{ r: 6, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 8, fill: "#1d4ed8", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="no-data">No quiz data available yet. Complete some quizzes to see your progress!</div>
          )}
        </div>

        <div className="chart-container" style={{ marginTop: 32 }}>
          <h4>Subject Completion Progress</h4>
          {subjectProgressData.length > 0 ? (
            <div style={{ width: "100%", height: 300, marginTop: 16 }}>
              <ResponsiveContainer>
                <BarChart data={subjectProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" opacity={0.3} />
                  <XAxis  
                    dataKey="subject"  
                    tick={{ fill: 'var(--text)' }}
                    axisLine={{ stroke: 'var(--muted)' }}
                  />
                  <YAxis  
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text)' }}
                    axisLine={{ stroke: 'var(--muted)' }}
                  />
                  <Tooltip  
                    contentStyle={{  
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px',
                      color: 'var(--text)'
                    }}
                    formatter={(value) => [`${value}%`, 'Completion']}
                    labelFormatter={(label) => {
                      const fullSubject = subjectProgressData.find(d => d.subject === label)?.fullSubject;
                      return fullSubject || label;
                    }}
                  />
                  <Bar  
                    dataKey="completion"  
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                  >
                    {subjectProgressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="no-data">No subject progress data available.</div>
          )}
        </div>

        <div style={{ marginTop: 32 }}>
          <h4>Detailed Statistics</h4>
          <div className="stats-details">
            <div className="stat-detail">
              <strong>Longest Streak:</strong> {streaks.longest} quizzes
            </div>
            <div className="stat-detail">
              <strong>Total Quizzes:</strong> {meta.quizzes || 0}
            </div>
            <div className="stat-detail">
              <strong>Average Accuracy:</strong> {quizAttempts.length > 0  
                ? Math.round(quizAttempts.reduce((sum, attempt) => sum + parseInt(attempt.marks), 0) / quizAttempts.length)  
                : 0}%
            </div>
            {lastQuiz && (
              <>
                <div className="stat-detail">
                  <strong>Last Quiz:</strong> {lastQuiz.correctCount}/{lastQuiz.total} correct
                </div>
                <div className="stat-detail">
                  <strong>AI Decision:</strong> <span className={`decision-${lastQuiz.decision?.toLowerCase()}`}>
                    {lastQuiz.decision} ({lastQuiz.strategy})
                  </span>
                </div>
              </>
            )}
            <div className="stat-detail">
                      <strong>Learning Style:</strong> {cognitiveMetrics?.fastCorrect > cognitiveMetrics?.slowCorrect ? "Quick Learner" : "Thorough Thinker"}
            </div>
            <div className="stat-detail">
                      <strong>Response Pattern:</strong> Fast Correct: {cognitiveMetrics?.fastCorrect || 0}, Slow Correct: {cognitiveMetrics?.slowCorrect || 0}, Incorrect: {cognitiveMetrics?.incorrect || 0}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <h4>Subject-wise Progress</h4>
          {subjects.map(s => (
            <div key={s} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 800, flex: 1 }}>{s}</div>
                <div style={{ fontWeight: 900, minWidth: 50, textAlign: 'right' }}>{pct(s)}%</div>
              </div>
              <div style={{ marginTop: 4 }}>
                <ProgressBar value={pct(s)} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {(CURRICULUM[s]?.subtopics?.length || 0) > 0 ? `${CURRICULUM[s].subtopics.filter(t => progress?.[s]?.[t]).length} of ${CURRICULUM[s].subtopics.length} topics completed` : 'No topics defined'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
    </div>
  );
}


function Home() {
  const navigate = useNavigate();
  const featured = ["Biology", "Chemistry", "Physics"];

  return (
    <div className="container">
      <div className="home-top">
        <div>
          <h1>Welcome Students of Classes 9–12!</h1>
          <p className="muted">SmartLearn AI — interactive maps, quizzes, and analytics to make studying more fun and efficient.</p>
        </div>
        <div className="home-badge">
          <StudyIcon size={84} />
        </div>
      </div>

      <div className="intro-block">
        <p className="muted">
          Tired of one-size-fits-all learning? <strong className="em">Welcome to SmartLearn AI</strong>, the intelligent platform built to <strong className="em">revolutionize</strong> how you study, master, and retain knowledge. We go beyond traditional textbooks and videos by offering a truly <strong className="em">personalized educational journey</strong> that adapts to your unique pace, understanding, and goals.
        </p>
        <p className="muted">
          Whether you're preparing for a complex exam, looking to dive deep into a new subject like <strong className="em">Biology</strong> or <strong className="em">Chemistry</strong>, or simply aiming to fill knowledge gaps, <strong className="em">SmartLearn AI</strong> provides the tools to get you there faster and more effectively. Our core philosophy is simple: when learning is personalized, <strong className="em">success</strong> is inevitable.
        </p>
        <p className="muted">
          Ready to transform your potential into <strong className="em">achievement</strong>?
        </p>
      </div>

      <h3>Featured Subjects</h3>
      <div className="card-container">
        {featured.map((s) => (
          <div className="card large-card" key={s} onClick={() => navigate(`/subject/${encodeURIComponent(s)}`)}>
            <h3>
              {s === "Physics" ? "⚛️ " : s === "Chemistry" ? "🧪 " : s === "Biology" ? "🧬 " : "💻 "}
              {s}
            </h3>
            <p className="card-desc">
              {s === "Physics" && "Learn motion, energy, and the laws that govern our universe."}
              {s === "Chemistry" && "Explore atoms, reactions, and chemical wonders all around us."}
              {s === "Biology" && "Dive into the science of life — from cells to human anatomy."}
            </p>
            <div className="card-cta">Explore →</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn" onClick={() => navigate("/topics")}>Explore All Topics</button>
      </div>

      <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
    </div>
  );
}


function TopicsList() {
  const navigate = useNavigate();
  const subjects = Object.keys(CURRICULUM);
  return (
    <div className="container">
      <h2 className="page-title">All Subjects</h2>
      <p className="muted">Welcome to the Topics page — explore a wide range of subjects and concepts designed to make learning simple and engaging. Each topic is carefully organized with clear explanations, examples, and visuals to help you understand better and build a strong foundation in every subject.</p>
      <div className="card-container">
        {subjects.map((s) => (
          <div className="card" key={s} onClick={() => navigate(`/subject/${encodeURIComponent(s)}`)}>
            <h3>
              {s === "Physics" ? "⚛️ " : s === "Chemistry" ? "🧪 " : s === "Biology" ? "🧬 " :
                "💡 "}  
              {s}
            </h3>
            <p className="card-desc">Explore core topics in {s} — click to open the interactive map.</p> 
          </div>
        ))}
      </div>
      <footer className="small-footer">© 2025 SmartLearn AI | Made with 💙 for Students of 9–12 🎓</footer>
    </div>
  );
}


/* ===========================
    Auth with Flip (Login / Signup)
    =========================== */
function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSignup = location.state?.signup || false;
  const [isSignup, setIsSignup] = useState(initialSignup);
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "" });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e && e.preventDefault();
    if (isSignup) {
      localStorage.setItem("studentDetails", JSON.stringify(form));
      alert("Signup saved locally — Please log in with your email and password.");
      setIsSignup(false);
      setForm(prev => ({...prev, password: ""}));  
    } else {
      const storedDetails = JSON.parse(localStorage.getItem("studentDetails") || "{}");
      
      if (storedDetails.email === form.email && storedDetails.password === form.password) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("userData", JSON.stringify({  
          id: storedDetails.email,  
          username: storedDetails.name || storedDetails.email.split('@')[0],  
          email: storedDetails.email  
        }));
        navigate("/home");
      } else {
        alert("Invalid credentials or user not found. Please sign up.");
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className={`auth-card ${isSignup ? "flip" : ""}`} role="region" aria-label="authentication card">  
          <div className="card-inner">
            <div className="card-face card-front">
              <div className="auth-top">
                <StudyIcon size={64} />
                <div>
                  <h1 style={{ margin: 0 }}>SmartLearn AI</h1>
                  <div className="muted">Learn Smart. Shine Bright. 💫</div>
                </div>
              </div>

              <form className="auth-form" onSubmit={(e) => submit(e)}>
                <input name="email" placeholder="Email" value={form.email} onChange={onChange} type="email" required />
                <input name="password" placeholder="Password" value={form.password} onChange={onChange} type="password" required />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button className="btn primary" type="submit">Log in</button>
                  <button type="button" className="btn ghost" onClick={() => setIsSignup(true)}>Create account</button>
                </div>
              </form>

              <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
                Demo account: sign up to store progress locally.
              </div>
            </div>

            <div className="card-face card-back">
              <div className="auth-top">
                <StudyIcon size={64} />
                <div>
                  <h1 style={{ margin: 0 }}>Create Account</h1>
                  <div className="muted">Join SmartLearn — fast, friendly, personal.</div>
                </div>
              </div>

              <form className="auth-form" onSubmit={(e) => submit(e)}>
                <input name="name" placeholder="Full name" value={form.name} onChange={onChange} required />
                <input name="age" placeholder="Age" value={form.age} onChange={onChange} required />
                <input name="email" placeholder="Email (Used for Login)" value={form.email} onChange={onChange} type="email" required />
                <input name="password" placeholder="Password" value={form.password} onChange={onChange} type="password" required />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button className="btn primary" type="submit">Sign up</button>
                  <button type="button" className="btn ghost" onClick={() => setIsSignup(false)}>Back to login</button>
                </div>
              </form>

            </div>
          </div>
        </div>

        <div className="auth-footer muted">© 2025 SmartLearn AI • Made with 💙 for students</div>
      </div>

      <div className="auth-right">
        <h2>Interactive curriculum preview</h2>
        <p className="muted fade-in">
          Tired of one-size-fits-all learning? <strong className="em">Welcome to SmartLearn AI</strong>, the intelligent platform built to <strong className="em">revolutionize</strong> how you study, master, and retain knowledge. We go beyond traditional textbooks and videos by offering a truly <strong className="em">personalized educational journey</strong> that adapts to your unique pace, understanding, and goals.
        </p>

        <p className="muted fade-in" style={{ animationDelay: "220ms" }}>
          Whether you're preparing for a complex exam, looking to dive deep into a new subject like <strong className="em">Biology</strong> or <strong className="em">Chemistry</strong>, or simply aiming to fill knowledge gaps, <strong className="em">SmartLearn AI</strong> provides the tools to get you there faster and more effectively. Our core philosophy is simple: when learning is personalized, <strong className="em">success</strong> is inevitable.
        </p>

        <p className="muted fade-in" style={{ animationDelay: "420ms" }}>
          Ready to transform your potential into <strong className="em">achievement</strong>?
        </p>

        <div style={{ marginTop: 18 }}>
          <button className="btn" onClick={() => {
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("userData", JSON.stringify({ id: "demo-user", username: "Demo Student" }));
            navigate("/home");
          }}>Try demo</button>
        </div>
      </div>
    </div>
  );
}


/* ===========================
    Header with persistent theme toggle
    =========================== */
function Header({ theme, setTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  
  const storedStudentDetails = JSON.parse(localStorage.getItem("studentDetails") || "{}");
  const userName = storedStudentDetails.name || userData.username || 'Guest';

  const logout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    navigate("/");
  };
  
  const navItems = [
    { path: "/home", label: "Home" },
    { path: "/topics", label: "Map" },
    { path: "/materials", label: "Materials" },
    { path: "/ai-quiz", label: "AI Quiz" },
    { path: "/analytics", label: "Analytics" },
  ];

  return (
    <header className="header">
      <div className="header-left" onClick={() => navigate(isLoggedIn ? "/home" : "/")}>
        <StudyIcon size={42} />
        <div>
          <div className="brand-title">SmartLearn AI</div>
          <div className="brand-sub">Hi, {userName}!</div>
        </div>
      </div>

      {isLoggedIn && (
        <nav className="nav">
          {navItems.map(item => (
            <Link  
              key={item.path}  
              to={item.path}  
              className={`nav-link ${location.pathname.startsWith(item.path) && item.path !== '/home' ? 'active' : location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="header-right">
        {isLoggedIn && (
          <button className="btn ghost" onClick={logout} style={{ color: 'var(--text)' }}>
            Logout
          </button>
        )}
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "subtle" ? "neon" : "subtle")}
          title="Toggle Theme"
        >
          {theme === "subtle" ? "🌙 Dark" : "✨ Light"}
        </button>
      </div>
    </header>
  );
}


function Page({ children, theme, setTheme }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme || "subtle");
  }, [theme]);

  const navigate = useNavigate();
  useEffect(() => {
    if (localStorage.getItem("loggedIn") !== "true") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  if (localStorage.getItem("loggedIn") !== "true") {
    return null;  
  }

  return (
    <>
      <Header theme={theme} setTheme={setTheme} />
      <main style={{ paddingTop: 8 }}>{children}</main>
    </>
  );
}


function Splash({ onDone, theme }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(), 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="splash-wrap">
      <div className={`splash-card ${theme === "neon" ? "neon" : "subtle"}`}>
        <div className="brain-rotor" aria-hidden>
          <svg viewBox="0 0 64 64" width="86" height="86">
            <g fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 24c0-6 6-10 12-10s12 4 12 10-6 10-12 10S20 30 20 24z" strokeLinejoin="round" />
              <path d="M12 38c0-12 10-16 10-16" />
              <path d="M52 38c0-12-10-16-10-16" />
            </g>
          </svg>
        </div>
        <div className="splash-text">
          <div className="logo-title">SmartLearn AI</div>
          <div className="logo-sub">Loading — study mode ready ✨</div>
        </div>
      </div>
    </div>
  );
}


/* ===========================
    Main App Component
    =========================== */
export default function App() {
  const [theme, setTheme] = useState(loadTheme());
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const injectedCSS = `
  :root {
  --muted-subtle: #64748b;
  --bg-soft: linear-gradient(180deg,#f7fbff 0%,#ffffff 100%);
  --bg-neon: linear-gradient(180deg,#071024 0%,#05102a 70%);
  --accent1: #60a5fa;
  --accent2: #7c3aed;
  --shadow-subtle: 0 12px 36px rgba(2,6,23,0.06);
  --shadow-neon: 0 18px 48px rgba(99,102,241,0.12);
}
[data-theme="subtle"] { --bg: var(--bg-soft); --text: #071024; --muted: var(--muted-subtle); --card-border: rgba(2,6,23,0.08); --card-bg: #fff; --card-shadow: var(--shadow-subtle); }
[data-theme="neon"] { --bg: var(--bg-neon); --text: #eaf2ff; --muted: #cbd5e1; --card-border: rgba(255,255,255,0.08); --card-bg: rgba(255,255,255,0.02); --card-shadow: var(--shadow-neon); }

* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: var(--bg); color: var(--text); -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; min-height:100vh; display:flex; flex-direction:column; }

/* FIX 1: Set up main app structure for sticky footer */
#root { min-height: 100vh; display: flex; flex-direction: column; }
main { flex-grow: 1; display: flex; flex-direction: column; }

/* FIX 2: Wrapper for map content and footer in SubjectMap to ensure flex-grow works */
.subject-map-wrapper {  
  flex: 1;  
  display: flex;  
  flex-direction: column;  
}

a{ color: inherit; text-decoration: none; }

/* header */
.header { height:76px; display:flex; align-items:center; justify-content:space-between; padding:10px 22px; position:sticky; top:0; z-index:60; backdrop-filter: blur(6px); }
[data-theme="subtle"] .header { background: linear-gradient(90deg, rgba(255,255,255,0.85), rgba(245,249,255,0.75)); box-shadow: 0 6px 16px rgba(2,6,23,0.04); }
[data-theme="neon"] .header { background: rgba(6,10,26,0.48); border-bottom: 1px solid rgba(255,255,255,0.04); box-shadow: none; }

.header-left { display:flex; align-items:center; gap:12px; cursor:pointer; }
.brand-title { font-weight:900; font-size:18px; line-height:1; }
.brand-sub { font-size:12px; color:var(--muted); margin-top:-2px; }

.nav { display:flex; gap:12px; align-items:center; }
.nav-link { padding:8px 12px; border-radius:10px; font-weight:700; color:var(--text); opacity:0.95; }
.nav-link:hover { transform: translateY(-3px); }
.nav-link.active { box-shadow: inset 0 -3px 0 rgba(96,165,250,0.4); }

.header-right { display:flex; gap:8px; align-items:center; }

.theme-toggle { padding:8px 12px; border-radius:999px; background: transparent; border: 1px solid var(--card-border); color: var(--text); cursor: pointer; font-weight:700; }

.btn { background: var(--card-bg); border: 1px solid var(--card-border); padding:8px 12px; border-radius:10px; font-weight:800; cursor:pointer; box-shadow: var(--card-shadow); color:var(--text); }
.btn.small { padding:6px 8px; font-size:13px; }
.btn.primary { background: linear-gradient(90deg,var(--accent1),var(--accent2)); color: #fff; border: none; }
.btn.ghost { background: transparent; border:1px solid var(--card-border); }
.btn-green { background: #10b981; color: #fff; border: none; padding:8px 12px; border-radius:10px; font-weight:800; cursor:pointer; margin-right: 8px; }
.btn-red { background: #ef4444; color: #fff; border: none; padding:8px 12px; border-radius:10px; font-weight:800; cursor:pointer; }
.btn-secondary { background: #f59e0b; color: #fff; border: none; padding:8px 12px; border-radius:10px; font-weight:800; cursor:pointer; margin-left: 8px; }

.container { max-width:1100px; margin:18px auto; padding:18px; flex-grow: 1; }

.muted { color: var(--muted); }
.em { font-weight: 800; color: var(--text); }

/* splash */
.splash-wrap { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:200; background: transparent; }
.splash-card { display:flex; gap:12px; align-items:center; padding:18px 22px; border-radius:12px; box-shadow: var(--card-shadow); border: 1px solid var(--card-border); background: var(--card-bg); color:var(--text); transform: translateY(0); animation: pop 700ms ease; }
.brain-rotor svg { color: var(--accent1); animation: spin 1800ms linear infinite; }
.logo-title { font-weight:900; font-size:18px; }
.logo-sub { font-size:13px; color:var(--muted); }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes pop { from { transform: translateY(8px) scale(.98); opacity:0 } to { transform: translateY(0) scale(1); opacity:1 } }

/* auth */
.auth-page { display:flex; gap:20px; align-items:stretch; justify-content:center; min-height: calc(100vh - 90px); padding:28px; }
.auth-left { width:480px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.auth-card { width:100%; perspective:1200px; }

.card-inner {  
  position:relative;  
  width:100%;  
  min-height: 440px;  
  transform-style: preserve-3d;  
  transition: transform 700ms cubic-bezier(.2,.9,.2,1);  
}
.auth-card.flip .card-inner { transform: rotateY(180deg); }
.card-face {  
  position:absolute;  
  inset:0;  
  backface-visibility: hidden;  
  padding:18px;  
  border-radius:12px;  
  border:1px solid var(--card-border);  
  background: var(--card-bg);  
  box-shadow: var(--card-shadow);  
  min-height: 440px;  
}
.card-back { transform: rotateY(180deg); }
.auth-top { display:flex; gap:12px; align-items:center; margin-bottom:8px; }

.auth-form input {  
  width:100%;  
  padding:10px 12px;  
  border-radius:8px;  
  border:1px solid var(--card-border);  
  margin-bottom:8px;  
  background: transparent;  
  color:var(--text);  
  font-size:14px;  
}

.auth-footer { font-size:13px; color:var(--muted); margin-top:8px; }

.auth-right { width:520px; padding:10px; color:var(--muted); }

/* cards grid */
.card-container { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:14px; margin-top:12px; }
.card { padding:14px; border-radius:12px; border:1px solid var(--card-border); background: var(--card-bg); box-shadow: var(--card-shadow); cursor:pointer; transition: transform .14s ease, box-shadow .14s ease; }
.card:hover { transform: translateY(-8px); box-shadow: 0 22px 56px rgba(99,102,241,0.08); }
.large-card { min-height:120px; display:flex; flex-direction:column; justify-content:space-between; }

.card-desc { color:var(--muted); }
.card-cta { marginTop:8px; font-weight:800; color:var(--accent1); }

.home-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.intro-block p { margin:8px 0; }

.grid-3 { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:12px; margin-top:12px; }
.feature-card { padding:12px; border-radius:12px; border:1px solid var(--card-border); background:var(--card-bg); box-shadow: var(--shadow-subtle); }

.small-footer { margin-top:22px; text-align:center; color:var(--muted); padding: 10px 0; }

/* mindmap (Legacy styles, not used in the new SubjectMap but kept for other views if needed) */
.mindmap-canvas {  
  height: 0;  
  padding-bottom: 61.53%;  
  max-width: 1040px;  
  width: 100%;  
  border-radius:14px;  
  overflow: hidden;  
  margin-top:12px;  
  position:relative;  
  border:1px solid var(--card-border);  
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.01));  
  display: none; /* Hide the old map container */
}
.mindmap-svg { position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; }
.node { position:absolute; transition: transform .16s ease, box-shadow .16s ease; }
.center-node {  
  width:400px;  
  height:130px;  
  border-radius:12px;  
  padding:12px;  
  border:1px solid var(--card-border);  
  background: var(--card-bg);  
  box-shadow: var(--card-shadow);  
  display:flex;  
  align-items:center;  
  gap:12px;  
}
.leaf-node {  
  max-width: 240px;  
  width: 240px;  
  padding:10px 12px;  
  border-radius:10px;  
  border:1px solid var(--card-border);  
  background: var(--card-bg);  
  box-shadow: var(--card-shadow);  
  cursor:pointer;  
  display:flex;  
  flex-direction: column;  
  align-items:center;  
  gap:8px;  
}
[data-theme="subtle"] .leaf-node.done { background: linear-gradient(90deg, rgba(236,252,203,0.9), rgba(220,252,231,0.9)); border:1px solid rgba(34,197,94,0.08); }
[data-theme="neon"] .leaf-node.done { background: rgba(5, 50, 32, 0.4); border: 1px solid rgba(34, 197, 94, 0.4); }
.dot { width:12px; height:12px; border-radius:50%; background: rgba(99,102,241,0.14); }
.dot-done { background: linear-gradient(90deg,#60a5fa,#7c3aed); box-shadow: 0 8px 20px rgba(99,102,241,0.08); }

.progress-outer { background: rgba(236,249,255,0.7); border-radius:999px; overflow:hidden; }
.progress-inner { height:100%; background: linear-gradient(90deg,var(--accent1),var(--accent2)); transition: width .36s ease; }

.pop-in { animation: popIn 420ms ease both; }
@keyframes popIn { from { transform: translateY(8px) scale(.98); opacity:0 } to { transform: translateY(0) scale(1); opacity:1 } }

.mindmap-svg .connector { transition: stroke 280ms ease, stroke-width 280ms ease; }

/* articles */
.grid-articles { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:14px; margin-top:10px; }
.article-card { padding:14px; border-radius:12px; border:1px solid var(--card-border); background: var(--card-bg); box-shadow: var(--card-shadow); }

/* MODAL STYLES FIX (for clarity) */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);  
  backdrop-filter: blur(6px);  
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.modal-content {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);  
  animation: modalPop 0.3s ease-out;
}
@keyframes modalPop {
  from { transform: scale(0.95) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}


/* quiz */
.question-card { background: var(--card-bg); padding:12px; border-radius:10px; margin-top:8px; border:1px solid var(--card-border); box-shadow: var(--card-shadow); }
.choices { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.choice { display:flex; gap:8px; align-items:center; background: transparent; padding:8px; border-radius:8px; border:1px solid var(--card-border); }
[data-theme="subtle"] .choice.correct { background: linear-gradient(90deg,#ecfccb,#dcfce7); border-color:#bbf7d0; }
[data-theme="subtle"] .choice.wrong { background: linear-gradient(90deg,#fee2e2,#fecaca); border-color:#fca5a5; }
[data-theme="neon"] .choice.correct { background: rgba(5, 50, 32, 0.4); border-color: rgba(34, 197, 94, 0.4); }
[data-theme="neon"] .choice.wrong { background: rgba(60, 10, 10, 0.4); border-color: rgba(239, 68, 68, 0.4); }

/* analytics */
.card-grid { display:flex; gap:12px; margin-top:6px; }
.stat-card { padding:12px; border-radius:12px; border:1px solid var(--card-border); background: var(--card-bg); box-shadow: var(--card-shadow); flex:1; text-align:center; }
.stat-value { font-size:24px; font-weight:900; color:var(--accent1); }

/* AI Metrics Box */
.advanced-metrics-box {
  background: linear-gradient(135deg, var(--card-bg) 0%, rgba(96,165,250,0.05) 100%);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: var(--card-shadow);
}

.decision-box {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: var(--card-shadow);
}

.emoji-burst { position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible; }

/* NEW: List/Table View Styles */
.map-progress-card {
    padding: 15px;
    border-radius: 12px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    box-shadow: var(--card-shadow);
    display: flex;
    align-items: center;
    gap: 15px;
}
.subtopic-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid var(--card-border);
    background: var(--card-bg);
    transition: background-color 0.2s ease, padding 0.1s ease;
    gap: 10px;
}
.subtopic-row:last-child {
    border-bottom: none;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
}
.subtopic-row:first-child {
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
}
.subtopic-row:hover {
    background: var(--card-bg);  
    box-shadow: var(--card-shadow);
    border-left: 3px solid var(--accent1);
    padding-left: 12px;
}
.topic-details {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-grow: 1;
    min-width: 200px;
}
.topic-icon {
    font-size: 1.2rem;
}
.topic-title {
    font-weight: 800;
    color: var(--text);
}
.topic-accuracy {
    font-size: 0.8rem;
    color: var(--muted);
    margin-top: 2px;
}
.topic-actions {
    display: flex;
    gap: 8px;
}

/* Media Queries */
@media (max-width:980px) {
  .center-node { width:360px; height:120px; }
  .leaf-node { width:220px; }
  .mindmap-canvas { height:760px; }
  .card-container { grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); }
  .cognitive-grid, .insight-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width:700px) {
  .auth-page { flex-direction:column; align-items:stretch; }
  .auth-left, .auth-right { width:100%; }
  .header { padding:10px 12px; }
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-details { grid-template-columns: 1fr; }
  .cognitive-grid, .insight-grid { grid-template-columns: 1fr; }
  .nav { display: none; }

  /* Mobile adjustments for new list view */
  .subtopic-row {
      flex-direction: column;
      align-items: flex-start;
      padding: 12px;
  }
  .topic-actions {
      flex-direction: column;
      width: 100%;
      margin-top: 10px;
  }
  .topic-actions .btn {
      width: 100%;
  }
}

/* 💥 FIX FOR MAP OVERLAP ON SMALL SCREENS (Legacy styles) 💥 */
@media (max-width: 500px) {
    .center-node {
      width: 90vw;  
      max-width: 320px;
      height: auto;
    }
    .leaf-node {
      width: 180px;  
      max-width: 90vw;  
      font-size: 14px;
    }
    .mindmap-canvas {  
      padding-bottom: 120%;  
    }
}
`;

  return (
    <>
      <style>{injectedCSS}</style>

      <Router>
        {showSplash && <Splash onDone={() => setShowSplash(false)} theme={theme} />}
        {!showSplash && <>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/home" element={<Page theme={theme} setTheme={setTheme}><Home /></Page>} />
            <Route path="/topics" element={<Page theme={theme} setTheme={setTheme}><TopicsList /></Page>} />
            <Route path="/subject/:subjectId" element={<Page theme={theme} setTheme={setTheme}><SubjectMap /></Page>} />
            <Route path="/materials" element={<Page theme={theme} setTheme={setTheme}><StudyMaterials /></Page>} />
            <Route path="/ai-quiz" element={<Page theme={theme} setTheme={setTheme}><AIQuizPage /></Page>} />
            <Route path="/analytics" element={<Page theme={theme} setTheme={setTheme}><Analytics /></Page>} />
            <Route path="/legacy-quiz" element={<Page theme={theme} setTheme={setTheme}><SmartLearnApp /></Page>} />
            <Route path="*" element={<Page theme={theme} setTheme={setTheme}><Home /></Page>} />
            <Route path="/video" element={<VideoPage />} />
          </Routes>
        </>}
      </Router>
    </>
  );
}