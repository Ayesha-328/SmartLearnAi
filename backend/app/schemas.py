from db import *
from models import Student, KnowledgeGraphNode

# Create a test document
student = Student(
    Student_ID="S001",
    Name="test student",
    Email="student@test.com",
    Grade="10",
    Level="base",
    Password="test123",
    Institute="XYZ",
    Age=16,
    Interests=["math", "science"]
)
student.save()

print("✅ Student saved successfully!")
