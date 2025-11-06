from mongoengine import (
Document, StringField, IntField, ListField, ReferenceField,
FloatField, DateTimeField, EmbeddedDocument,EmbeddedDocumentField, BooleanField
)
from datetime import datetime

# stores a list of transcript segments for a video
class TranscriptSegment(EmbeddedDocument):
    start = FloatField()        # seconds
    duration = FloatField()     # seconds
    text = StringField()

# stores video transcripts linked to KG nodes
class VideoTranscript(Document):
    youtube_id = StringField(required=True, unique=True)
    kg_node = ReferenceField('KnowledgeGraphNode')   # link back to KG node (optional)
    language = StringField(default="en")
    full_text = StringField()
    segments = ListField(EmbeddedDocumentField(TranscriptSegment))
    confidence = FloatField()
    fetched_at = DateTimeField(default=datetime.utcnow)

# ======================
# Knowledge Graph Node
# ======================

class KnowledgeGraphNode(Document):
	subject = StringField(required=True)
	title = StringField(required=True)
	description = StringField()
	difficulty_level = StringField(required=True)
	prerequisites = ListField(StringField())
	next_topics = ListField(StringField())
	content_refs = ListField(StringField())
	keywords = ListField(StringField())
	objectives = ListField(StringField())
	estimated_hours = FloatField()
	code = StringField(unique=True)
	createdAt = DateTimeField(default=datetime.utcnow)
	videos = ListField(StringField()) # URLs to videos
	

# ======================
# Student
# ======================

class Student(Document):
	name = StringField(required=True)
	email = StringField(required=True, unique=True)
	grade = StringField()
	level = StringField(choices=["base", "level_1", "level_2"], required=True, default="base")
	password = StringField(required=True)
	profile_picture = StringField()
	institute = StringField()
	age = IntField()
	interests = ListField(StringField())
	date_joined = DateTimeField(default=datetime.utcnow)
	engagement_level = FloatField(default=0.0)
	session_regularity = FloatField(default=0.0)
	
# ======================
# Quiz Question
# ======================

class QuizQuestion(Document):
	question_text = StringField(required=True)
	difficulty_level = StringField(required=True)
	KG_Node_ID = ReferenceField(KnowledgeGraphNode)
	options = ListField(StringField())
	correct_answer = StringField(required=True)
	explanation = StringField()
	response_time = FloatField() # in seconds
	created_at = DateTimeField(default=datetime.utcnow)
	updated_at = DateTimeField(default=datetime.utcnow)
	student_answer = StringField()
	student_ID = ReferenceField(Student)
	response_time_expected = FloatField() # in seconds
	category = StringField(choices=["why", "what", "when", "where", "who", "how"])
	
# ======================
# Quiz
# ======================

class Quiz(Document):
	KG_Node_ID = ReferenceField(KnowledgeGraphNode)
	score = ListField(FloatField())
	time_completed = DateTimeField()
	result = StringField(choices=["pass", "fail"])
	student_ID = ReferenceField(Student)
	question_IDs = ListField(ReferenceField(QuizQuestion))
	prev_topic_IDs = ListField(StringField())
	quiz_type = StringField(choices=["final", "progress"], required=True)
	level = StringField(choices=["base", "level_1", "level_2"], required=True)
	created_at = DateTimeField(default=datetime.utcnow)

# ======================
# Study Material
# ======================

class StudyMaterial(Document):
	KG_node_ID = ReferenceField(KnowledgeGraphNode, required=True)
	content_type = StringField(choices=["text", "image", "video"], required=True)
	generated_by = StringField(choices=["llm", "custom"], required=True)
	text_content = StringField()
	images = ListField(StringField())
	videos = ListField(StringField())
	quiz_ID = ReferenceField(Quiz)
	student_ID = ReferenceField(Student)
	completion_time = FloatField() # in hours
	created_at = DateTimeField(default=datetime.utcnow)


# ======================
# Knowledge Graph Topic Metrics
# ======================

class KnowledgeGraphTopicMetrics(Document):
	Student_ID = ReferenceField(Student)
	Quiz_ID = ReferenceField(Quiz)
	# KG_Node_ID = ReferenceField(KnowledgeGraphNode)
	accuracy_score = FloatField()
	response_time = FloatField()
	attempt_count = IntField()
	first_attempt_accuracy = FloatField()
	accuracy_trend = FloatField()
	error_pattern = StringField()
	createdAt = DateTimeField(default=datetime.utcnow)

# ======================
# Session
# ======================

class Session(Document):
	Student_ID = ReferenceField(Student, required=True)
	KG_Node_ID = ReferenceField(KnowledgeGraphNode)
	sessionType = StringField(choices=["study", "quiz"], required=True)
	startedAt = DateTimeField(default=datetime.utcnow)
	endedAt = DateTimeField()
	interactions = IntField(default=0)
	response_times = ListField(FloatField())
	completion_rate = FloatField(default=0.0)

# ======================
# Cognitive Profile
# ======================

class CognitiveProfile(Document):
	Student_ID = ReferenceField(Student, required=True)
	accuracy_score = FloatField()
	learning_speed = FloatField()
	response_time_avg = FloatField()
	review_recall_rate = FloatField()
	createdAt = DateTimeField(default=datetime.utcnow)
	updatedAt = DateTimeField(default=datetime.utcnow)