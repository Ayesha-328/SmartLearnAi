// frontend/src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// src/services/api.js
// API Configuration and Helper Functions

const MY_API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000';

// ================================================================
// API HELPER FUNCTIONS
// ================================================================

/**
 * Generic API call function with error handling
 */
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${MY_API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// ================================================================
// TASK 1: FETCH SUBJECTS & TOPICS
// ================================================================

/**
 * Fetch all available subjects
 */
export async function fetchAllSubjects() {
    try {
        const data = await apiCall('/api/subjects');
        return data;
    } catch (error) {
        console.error('Failed to fetch subjects:', error);
        throw error;
    }
}

/**
 * Fetch all topics for a specific subject
 * @param {string} subjectName - Name of the subject (e.g., "Physics")
 */
export async function fetchSubjectTopics(subjectName) {
    try {
        const data = await apiCall(`/api/subjects/${encodeURIComponent(subjectName)}/topics`);
        return data;
    } catch (error) {
        console.error(`Failed to fetch topics for ${subjectName}:`, error);
        throw error;
    }
}

// ================================================================
// TASK 2: FETCH VIDEO & QUIZ FOR TOPIC
// ================================================================

/**
 * Fetch video and quiz content for a specific topic
 * @param {string} topicCode - Topic code (e.g., "PHY_BASE")
 * @param {object} options - Optional parameters
 * @param {number} options.numQuestions - Number of quiz questions (default: 10)
 * @param {boolean} options.forceRegenerate - Force regenerate quiz (default: false)
 * @param {boolean} options.validateLlm - Use LLM validation (default: true)
 */
export async function fetchTopicContent(topicCode, options = {}) {
    try {
        const params = new URLSearchParams({
            num_questions: options.numQuestions || 10,
            force_regenerate: options.forceRegenerate || false,
            validate_llm: options.validateLlm !== false // default true
        });
        
        const data = await apiCall(`/api/topics/${encodeURIComponent(topicCode)}/content?${params}`);
        return data;
    } catch (error) {
        console.error(`Failed to fetch content for ${topicCode}:`, error);
        throw error;
    }
}

export const fetchQuizFromApi = async (topicCode) => {
  setLoading(true);
  try {
     const data = await apiCall(`/api/topics/${encodeURIComponent(topicCode)}/content`);

    if (data.success && data.quiz) {
      const generatedQs = data.quiz.map((q, index) => {
        const correctIndex = q.options.findIndex(
          (opt) => opt === q.correct_answer
        );
        return {
          q: q.question,
          metadata: {
            difficulty: q.category || "medium",
            explanation: q.explanation || "No explanation provided.",
          },
          choices: q.options,
          answer: correctIndex,
        };
      });

      setQs(generatedQs);
    } else {
      console.error("No quiz found for this topic");
      setQs([]);
    }
  } catch (err) {
    console.error("Error fetching quiz:", err);
    setQs([]);
  } finally {
    setLoading(false);
  }
};


/**
 * Search topics across all subjects
 * @param {string} query - Search query
 * @param {string} subject - Optional subject filter
 */
export async function searchTopics(query, subject = null) {
    try {
        const params = new URLSearchParams({ q: query });
        if (subject) params.append('subject', subject);
        
        const data = await apiCall(`/api/topics/search?${params}`);
        return data;
    } catch (error) {
        console.error('Search failed:', error);
        throw error;
    }
}

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('🔄 API Call:', url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ API request failed:', error);
    throw error;
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return await response.json();
  } catch (error) {
    throw new Error('Backend server is not available');
  }
};

// Test connection
export const testConnection = async () => {
  try {
    const health = await healthCheck();
    console.log('✅ Backend connected:', health);
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
};

// Mock fallbacks for missing endpoints
const mockAuthAPI = {
  login: async (email, password) => {
    const user = {
      id: Date.now().toString(),
      email: email,
      name: email.split('@')[0],
      grade: '11'
    };
    
    return {
      success: true,
      user: user,
      token: 'mock-token-' + Date.now()
    };
  },

  register: async (userData) => {
    const user = {
      id: Date.now().toString(),
      email: userData.email,
      name: userData.username || userData.email.split('@')[0],
      age: userData.age,
      grade: userData.grade || '11'
    };
    
    return {
      success: true,
      user: user,
      token: 'mock-token-' + Date.now()
    };
  }
};

// Export APIs
export const authAPI = {
  login: async (email, password) => {
    // Try real backend first, then fallback to mock
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return response;
    } catch (error) {
      console.log('Using mock authentication');
      return await mockAuthAPI.login(email, password);
    }
  },

  register: async (userData) => {
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      console.log('Using mock registration');
      return await mockAuthAPI.register(userData);
    }
  }
};

export const quizAPI = {
  generateQuiz: async (topic, grade = '11', difficulty = 'medium') => {
    return apiRequest('/api/initial_quiz', {
      method: 'POST',
      body: JSON.stringify({ topic, grade, difficulty }),
    });
  }
};

// Debug helper
export const enableAPIDebug = () => {
  window.debugAPI = {
    authAPI,
    quizAPI,
    healthCheck,
    testConnection
  };
  console.log('🔧 API debug enabled. Use debugAPI in console.');
};