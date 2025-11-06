from mongoengine import (
    Document, StringField, IntField, ListField, ReferenceField,
    FloatField, DateTimeField, EmbeddedDocument, BooleanField, DictField
)
from datetime import datetime

# ======================
# Knowledge Graph Node (MINIMAL CHANGES)
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
    
    # NEW: Store curated video IDs for this topic
    video_ids = ListField(StringField())  # List of YouTube video IDs
    
    createdAt = DateTimeField(default=datetime.utcnow)

# ======================
# NEW: Video Content Document
# ======================

class VideoContent(Document):
    """Stores YouTube videos and their metadata for topics"""
    
    KG_node_ID = ReferenceField(KnowledgeGraphNode, required=True)
    
    # YouTube video details
    youtube_video_id = StringField(required=True, unique=True)
    video_title = StringField(required=True)
    video_url = StringField(required=True)
    channel_name = StringField()
    duration = IntField()  # in seconds
    thumbnail_url = StringField()
    
    # Transcript data
    transcript = StringField()  # Full transcript text
    transcript_segments = ListField(DictField())  # [{text, start, duration}]
    
    # Video metadata
    language = StringField(default="en")
    quality_score = FloatField(default=0.0)  # Based on views, likes, comments
    view_count = IntField()
    likes = IntField()
    
    # Topic coverage analysis
    topic_coverage = DictField()  # Which objectives/keywords are covered
    difficulty_match = StringField()  # How well it matches topic difficulty
    
    # Status
    is_active = BooleanField(default=True)
    transcript_fetched = BooleanField(default=False)
    quiz_generated = BooleanField(default=False)
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'indexes': [
            'KG_node_ID',
            'youtube_video_id',
            'is_active'
        ]
    }

# ======================
# Student (NO CHANGES NEEDED)
# ======================

class Student(Document):
    name = StringField(required=True)
    email = StringField(required=True, unique=True)
    grade = StringField()
    level = StringField(choices=["base", "level_1", "level_2", "level_3", "level_4"], 
                       required=True, default="base")
    password = StringField(required=True)
    profile_picture = StringField()
    institute = StringField()
    age = IntField()
    interests = ListField(StringField())
    date_joined = DateTimeField(default=datetime.utcnow)
    engagement_level = FloatField(default=0.0)
    session_regularity = FloatField(default=0.0)

# ======================
# NEW: Video Watch Progress
# ======================

class VideoWatchProgress(Document):
    """Track student's video watching behavior"""
    
    student_ID = ReferenceField(Student, required=True)
    video_ID = ReferenceField(VideoContent, required=True)
    KG_node_ID = ReferenceField(KnowledgeGraphNode, required=True)
    
    # Watch metrics
    watch_percentage = FloatField(default=0.0)  # 0-100
    watch_duration = FloatField(default=0.0)  # seconds watched
    total_duration = FloatField()  # video length
    
    # Engagement metrics
    pauses_count = IntField(default=0)
    rewinds_count = IntField(default=0)
    speed_changes = ListField(FloatField())  # [1.0, 1.5, 2.0]
    
    # Segment-level tracking
    segments_watched = ListField(DictField())  # [{start, end, watched}]
    difficult_segments = ListField(DictField())  # Segments rewatched multiple times
    
    # Status
    completed = BooleanField(default=False)
    started_at = DateTimeField(default=datetime.utcnow)
    completed_at = DateTimeField()
    last_position = FloatField(default=0.0)  # Last watched timestamp
    
    meta = {
        'indexes': [
            'student_ID',
            'video_ID',
            'KG_node_ID',
            ('student_ID', 'video_ID')
        ]
    }

# ======================
# Quiz Question (UPDATED)
# ======================

class QuizQuestion(Document):
    question_text = StringField(required=True)
    difficulty_level = StringField(required=True)
    KG_Node_ID = ReferenceField(KnowledgeGraphNode)
    
    # NEW: Link to video content
    video_ID = ReferenceField(VideoContent)
    video_timestamp = FloatField()  # Where in video this concept appears
    
    # Question metadata
    question_type = StringField(choices=["who", "what", "when", "where", "why", "how"], 
                                required=True)  # 5W1H classification
    
    options = ListField(StringField())
    correct_answer = StringField(required=True)
    explanation = StringField()
    
    # NEW: Context from video
    transcript_context = StringField()  # Relevant transcript portion
    
    response_time_expected = FloatField()  # in seconds
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    # Generation source
    generated_from = StringField(choices=["transcript", "llm", "manual"], default="transcript")

# ======================
# NEW: Quiz Attempt (Student's Answer Record)
# ======================

class QuizAttempt(Document):
    """Records individual question attempts by students"""
    
    student_ID = ReferenceField(Student, required=True)
    question_ID = ReferenceField(QuizQuestion, required=True)
    quiz_ID = ReferenceField('Quiz')  # Parent quiz session
    
    # Student response
    student_answer = StringField()
    is_correct = BooleanField()
    response_time = FloatField()  # seconds taken to answer
    
    # Analysis
    confidence_level = StringField(choices=["high", "medium", "low"])
    question_type = StringField()  # who/what/when/where/why/how
    
    # Context
    attempt_number = IntField(default=1)  # If retrying
    timestamp = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'indexes': [
            'student_ID',
            'question_ID',
            'quiz_ID'
        ]
    }

# ======================
# Quiz (UPDATED)
# ======================

class Quiz(Document):
    KG_Node_ID = ReferenceField(KnowledgeGraphNode)
    student_ID = ReferenceField(Student)
    
    # NEW: Link to video
    video_ID = ReferenceField(VideoContent)
    
    # Quiz metadata
    question_IDs = ListField(ReferenceField(QuizQuestion))
    quiz_type = StringField(choices=["final", "progress", "diagnostic", "remedial"], 
                           required=True)
    level = StringField(choices=["base", "level_1", "level_2", "level_3", "level_4"], 
                       required=True)
    
    # Results
    score = FloatField()  # Overall percentage
    individual_scores = ListField(FloatField())  # Per question
    time_completed = DateTimeField()
    result = StringField(choices=["pass", "fail", "needs_review"])
    
    # NEW: 5W1H Analysis
    w5h1_scores = DictField()  # {"who": 80, "what": 60, "when": 100, ...}
    weak_concepts = ListField(StringField())  # Identified weak areas
    recommended_review_segments = ListField(DictField())  # Video segments to rewatch
    
    # Tracking
    prev_topic_IDs = ListField(StringField())
    attempt_number = IntField(default=1)
    created_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'indexes': [
            'student_ID',
            'KG_Node_ID',
            'video_ID'
        ]
    }

# ======================
# Study Material (UPDATED - Less Used Now)
# ======================

class StudyMaterial(Document):
    """Legacy - Now primarily for supplementary text content"""
    
    KG_node_ID = ReferenceField(KnowledgeGraphNode, required=True)
    content_type = StringField(choices=["text", "image", "summary"], required=True)
    generated_by = StringField(choices=["llm", "custom"], required=True)
    
    text_content = StringField()
    images = ListField(StringField())
    
    # NEW: Can be generated from video transcript
    source_video_ID = ReferenceField(VideoContent)
    
    quiz_ID = ReferenceField(Quiz)
    student_ID = ReferenceField(Student)
    completion_time = FloatField()
    created_at = DateTimeField(default=datetime.utcnow)

# ======================
# Knowledge Graph Topic Metrics (UPDATED)
# ======================

class KnowledgeGraphTopicMetrics(Document):
    Student_ID = ReferenceField(Student, required=True)
    KG_Node_ID = ReferenceField(KnowledgeGraphNode, required=True)
    
    # Quiz performance
    Quiz_ID = ReferenceField(Quiz)
    accuracy_score = FloatField()
    response_time = FloatField()
    attempt_count = IntField()
    first_attempt_accuracy = FloatField()
    accuracy_trend = FloatField()
    
    # NEW: Video-based metrics
    videos_watched = IntField(default=0)
    avg_watch_completion = FloatField()  # Average % completion
    total_watch_time = FloatField()  # Total minutes spent
    
    # NEW: 5W1H breakdown
    who_accuracy = FloatField()
    what_accuracy = FloatField()
    when_accuracy = FloatField()
    where_accuracy = FloatField()
    why_accuracy = FloatField()
    how_accuracy = FloatField()
    
    # Weak areas
    error_pattern = StringField()
    weak_question_types = ListField(StringField())  # e.g., ["why", "how"]
    needs_remedial = BooleanField(default=False)
    
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'indexes': [
            'Student_ID',
            'KG_Node_ID',
            ('Student_ID', 'KG_Node_ID')
        ]
    }

# ======================
# Session (UPDATED)
# ======================

class Session(Document):
    Student_ID = ReferenceField(Student, required=True)
    KG_Node_ID = ReferenceField(KnowledgeGraphNode)
    
    sessionType = StringField(choices=["study", "quiz", "video_watch", "remedial"], 
                             required=True)
    
    # NEW: Video session data
    video_ID = ReferenceField(VideoContent)
    watch_progress_ID = ReferenceField(VideoWatchProgress)
    
    startedAt = DateTimeField(default=datetime.utcnow)
    endedAt = DateTimeField()
    interactions = IntField(default=0)
    response_times = ListField(FloatField())
    completion_rate = FloatField(default=0.0)
    
    # NEW: Session outcome
    completed_successfully = BooleanField(default=False)
    next_action = StringField(choices=["quiz", "continue_video", "review", "next_topic"])

# ======================
# Cognitive Profile (NO MAJOR CHANGES)
# ======================

class CognitiveProfile(Document):
    Student_ID = ReferenceField(Student, required=True)
    accuracy_score = FloatField()
    learning_speed = FloatField()
    response_time_avg = FloatField()
    review_recall_rate = FloatField()
    
    # NEW: Video learning preferences
    preferred_video_length = StringField(choices=["short", "medium", "long"])
    avg_watch_speed = FloatField(default=1.0)
    
    createdAt = DateTimeField(default=datetime.utcnow)
    updatedAt = DateTimeField(default=datetime.utcnow)

# ======================
# NEW: Remedial Content
# ======================

class RemedialContent(Document):
    """Stores remedial/reteaching content for weak areas"""
    
    student_ID = ReferenceField(Student, required=True)
    KG_node_ID = ReferenceField(KnowledgeGraphNode, required=True)
    original_video_ID = ReferenceField(VideoContent)
    
    # Weak area identification
    weak_question_types = ListField(StringField())  # ["why", "how"]
    weak_concepts = ListField(StringField())  # Specific concepts
    failed_quiz_ID = ReferenceField(Quiz)
    
    # Remedial resources
    alternative_video_IDs = ListField(ReferenceField(VideoContent))
    specific_segments = ListField(DictField())  # Targeted video segments
    simplified_explanation = StringField()  # LLM-generated simpler explanation
    
    # Status
    status = StringField(choices=["pending", "in_progress", "completed"], 
                        default="pending")
    created_at = DateTimeField(default=datetime.utcnow)
    completed_at = DateTimeField()
    
    meta = {
        'indexes': [
            'student_ID',
            'KG_node_ID',
            'status'
        ]
    }