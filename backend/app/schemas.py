from app.db import *
from backend.app.models_new import Student, KnowledgeGraphNode

# Create a test document
student = Student(
    name="test student",
    email="student@test.com",
    grade="10",
    password="test123",
    institute="XYZ",
    age=16,
    interests=["math", "science"]
)
student.save()

print("✅ Student saved successfully!")
