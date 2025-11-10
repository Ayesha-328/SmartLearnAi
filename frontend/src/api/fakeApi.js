// src/api/fakeApi.js

export const getStudyMaterials = async () => {
  // Simulate backend delay
  await new Promise((res) => setTimeout(res, 500));

  return [
    {
      id: 1,
      title: "Understanding Newton’s Laws of Motion",
      subject: "Physics",
      description:
        "Explore how Newton’s three laws govern the motion of every object in the universe — from falling apples to orbiting planets.",
      thumbnail: "⚛️",
    },
    {
      id: 2,
      title: "The Magic of Chemical Bonding",
      subject: "Chemistry",
      description:
        "Learn how atoms connect to form the matter around us, through ionic, covalent, and metallic bonds explained simply.",
      thumbnail: "🧪",
    },
    {
      id: 3,
      title: "Introduction to Artificial Intelligence",
      subject: "AI",
      description:
        "Dive into the world of AI — where machines learn, adapt, and make decisions like humans. Includes history, key fields, and examples.",
      thumbnail: "🤖",
    },
    {
      id: 4,
      title: "Mastering Algebra in Mathematics",
      subject: "Math",
      description:
        "Algebra is the foundation of higher-level math. Learn how to manipulate equations and solve for unknowns step by step.",
      thumbnail: "🧮",
    },
  ];
};
