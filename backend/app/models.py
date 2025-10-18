from mongoengine import Document, StringField, IntField, ListField, ReferenceField, FloatField, DateTimeField, EmbeddedDocument, EmbeddedDocumentField
from datetime import datetime

# ======================
# Knowledge Graph Node
# ======================
class KnowledgeGraphNode(Document):
    KG_node_ID = StringField(required=True, unique=True)
    level = StringField(required=True)
    subject = StringField(required=True)
    topic = StringField(required=True)
    description = StringField()
    prerequisites = ListField(StringField())
    next_topics = ListField(StringField())
    content_refs = ListField(StringField())
    keywords = ListField(StringField())
    createdAt = DateTimeField(default=datetime.utcnow)

# ======================
# Student
# ======================
class Student(Document):
    Student_ID = StringField(required=True, unique=True)
    Name = StringField(required=True)
    Email = StringField(required=True, unique=True)
    Grade = StringField()
    Level = StringField()
    Password = StringField()
    Profile_Picture = StringField()
    Institute = StringField()
    Age = IntField()
    Interests = ListField(StringField())

# ======================
# Study Material
# ======================
class StudyMaterial(Document):
    SM_ID = StringField(required=True, unique=True)
    KG_node_ID = ReferenceField(KnowledgeGraphNode)
    Content_Type = StringField(choices=["text", "image", "video", "quiz"])
    Generated_By = StringField()
    Text_Content = StringField()
    Images = ListField(StringField())
    Videos = ListField(StringField())
    Quiz_ID = StringField()
    Student_ID = ReferenceField(Student)
    Est_Completion_Time = StringField()
    Created_At = DateTimeField(default=datetime.utcnow)

# ======================
# Quiz Question
# ======================
class QuizQuestion(Document):
    Question_ID = StringField(required=True, unique=True)
    Question_Text = StringField(required=True)
    Question_Type = StringField()
    Difficulty_Level = StringField()
    KG_Node_ID = ReferenceField(KnowledgeGraphNode)
    Options = ListField(StringField())
    Correct_Answer = StringField()
    Explanation = StringField()
    Created_At = DateTimeField(default=datetime.utcnow)
    Updated_At = DateTimeField(default=datetime.utcnow)

# ======================
# Quiz
# ======================
class Quiz(Document):
    Quiz_ID = StringField(required=True, unique=True)
    KG_Node_ID = ListField(ReferenceField(KnowledgeGraphNode))
    Score = FloatField()
    Time_Completed = DateTimeField()
    Decision = StringField()
    Student_ID = ReferenceField(Student)
    QuestionIDs = ListField(ReferenceField(QuizQuestion))

# ======================
# Knowledge Graph Topic Metrics
# ======================
class KnowledgeGraphTopicMetrics(Document):
    KG_TM_ID = StringField(required=True, unique=True)
    Student_ID = ReferenceField(Student)
    Quiz_ID = ReferenceField(Quiz)
    Accuracy_Score = FloatField()
    Response_Time = FloatField()
    Attempt_Count = IntField()
    First_Attempt_Accuracy = FloatField()
    Accuracy_Trend = FloatField()
    Error_Pattern = StringField()

# ======================
# Cognitive Profile
# ======================
class CognitiveProfile(Document):
    CP_ID = StringField(required=True, unique=True)
    Student_ID = ReferenceField(Student)
    Accuracy_Score = FloatField()
    Learning_Speed = FloatField()
    Response_Time_Avg = FloatField()
    Review_Recall_Rate = FloatField()
    Engagement_Ratio = FloatField()
    Session_Regularity = FloatField()
    Motivation_Estimate = FloatField()
    Confidence_Level = FloatField()
    Updated_At = DateTimeField(default=datetime.utcnow)

# ======================
# Session
# ======================
class Session(Document):
    Session_ID = StringField(required=True, unique=True)
    Student_ID = ReferenceField(Student)
    KG_Node_ID = ReferenceField(KnowledgeGraphNode)
    Type = StringField()
    StartedAt = DateTimeField(default=datetime.utcnow)
    EndedAt = DateTimeField()
    Engagement_Score = FloatField()
    Response_Times = ListField(FloatField())
    Attention_Span = FloatField()