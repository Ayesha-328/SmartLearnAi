# app/routes/learning_routes.py
from flask import Blueprint, jsonify, request
from app.models import KnowledgeGraphNode, VideoTranscript, Quiz, QuizQuestion
from app.kg_pipeline.yt_videos import get_video_transcript_and_quiz
from bson import ObjectId

learning_bp = Blueprint('learning', __name__)

# ================================================================
# TASK 1: GET ALL SUBTOPICS FOR A SUBJECT
# ================================================================

@learning_bp.route('/api/subjects/<subject_name>/topics', methods=['GET'])
def get_subject_topics(subject_name):
    """
    Get all topics/nodes for a specific subject.
    
    Example: GET /api/subjects/Physics/topics
    
    Returns:
        {
            "success": true,
            "subject": "Physics",
            "topics": [
                {
                    "code": "PHY_BASE",
                    "title": "Basic Physics Concepts",
                    "description": "...",
                    "difficulty_level": "base",
                    "has_video": true,
                    "has_quiz": true,
                    "video_count": 2,
                    "estimated_hours": 2.5
                },
                ...
            ],
            "total_topics": 15
        }
    """
    try:
        print(f"[API] Fetching topics for subject: {subject_name}")
        # Normalize subject name (case-insensitive)
        subject_name = subject_name.strip().title()
        
        # Query all nodes for this subject
        nodes = KnowledgeGraphNode.objects(subject=subject_name).order_by('title')
        
        if not nodes:
            return jsonify({
                "success": False,
                "message": f"No topics found for subject: {subject_name}",
                "subject": subject_name,
                "topics": [],
                "total_topics": 0
            }), 404
        
        # Format topics data
        topics_list = []
        for node in nodes:
            # Check if node has videos
            has_video = bool(node.videos and len(node.videos) > 0)
            
            # Check if node has quiz
            has_quiz = Quiz.objects(KG_Node_ID=node).first() is not None
            
            topic_data = {
                "code": node.code,
                "title": node.title,
                "description": node.description or "",
                "difficulty_level": node.difficulty_level,
                "has_video": has_video,
                "has_quiz": has_quiz,
                "video_count": len(node.videos) if node.videos else 0,
                "keywords": node.keywords or [],
                "objectives": node.objectives or [],
                "estimated_hours": node.estimated_hours or 0,
                "prerequisites": node.prerequisites or [],
                "next_topics": node.next_topics or []
            }
            topics_list.append(topic_data)
        
        return jsonify({
            "success": True,
            "subject": subject_name,
            "topics": topics_list,
            "total_topics": len(topics_list)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to fetch topics"
        }), 500


# ================================================================
# TASK 2: GET VIDEO & QUIZ FOR A TOPIC
# ================================================================

@learning_bp.route('/api/topics/<topic_code>/content', methods=['GET'])
def get_topic_content(topic_code):
    """
    Get video and quiz for a specific topic.
    Uses the smart_video_fetcher to fetch/generate content.
    """
    try:
        # Query parameters
        num_questions = int(request.args.get('num_questions', 10))
        force_regenerate = request.args.get('force_regenerate', 'false').lower() == 'true'
        validate_llm = request.args.get('validate_llm', 'true').lower() == 'true'
        
        print(f"[API] Fetching content for topic: {topic_code}")
        
        # Fetch video and quiz
        result = get_video_transcript_and_quiz(
            code_or_topic=topic_code,
            num_questions=num_questions,
            validate_with_llm=validate_llm,
            force_regenerate_quiz=force_regenerate
        )
        
        # Handle error from fetcher
        if result.get('status') == 'error':
            return jsonify({
                "success": False,
                "error": result.get('error', 'Unknown error'),
                "message": "Failed to fetch topic content",
                "topic_code": topic_code
            }), 404
        
        # Topic title
        node = KnowledgeGraphNode.objects(code=topic_code).first()
        topic_title = node.title if node else topic_code
        
        return jsonify({
            "success": True,
            "topic_code": topic_code,
            "topic_title": topic_title,
            "youtube_url": result.get('youtube_url'),
            "youtube_id": result.get('youtube_id'),
            "transcript": result.get('transcript', ''),
            "quiz": result.get('quiz', []),
            "video_status": result.get('video_status', 'unknown'),
            "quiz_status": result.get('quiz_status', 'unknown'),
            "confidence": result.get('confidence', 0.0),
            "educational_quality": result.get('educational_quality', 'unknown'),
            "num_questions": result.get('num_questions', 0),
            "quiz_id": result.get('quiz_id'),
            "topic": result.get('topic')
        }), 200
        
    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": str(ve),
            "message": "Invalid request parameters"
        }), 400
    except Exception as e:
        print(f"[API ERROR] Failed to fetch content for {topic_code}: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to fetch topic content"
        }), 500



# ================================================================
# BONUS: GET ALL AVAILABLE SUBJECTS
# ================================================================

@learning_bp.route('/api/subjects', methods=['GET'])
def get_all_subjects():
    """
    Get list of all available subjects.
    
    Returns:
        {
            "success": true,
            "subjects": [
                {
                    "name": "Physics",
                    "topic_count": 15,
                    "total_videos": 25,
                    "total_quizzes": 12
                },
                ...
            ]
        }
    """
    try:
        print("[API] Fetching all subjects")
        # Get all unique subjects
        pipeline = [
            {"$group": {
                "_id": "$subject",
                "topic_count": {"$sum": 1},
                "total_videos": {"$sum": {"$size": {"$ifNull": ["$videos", []]}}
                }
            }},
            {"$sort": {"_id": 1}}
        ]
        
        subjects_data = list(KnowledgeGraphNode.objects.aggregate(pipeline))
        
        subjects_list = []
        for subj in subjects_data:
            subject_name = subj['_id']
            
            # Count quizzes for this subject
            subject_nodes = KnowledgeGraphNode.objects(subject=subject_name)
            quiz_count = Quiz.objects(KG_Node_ID__in=subject_nodes).count()
            
            subjects_list.append({
                "name": subject_name,
                "topic_count": subj['topic_count'],
                "total_videos": subj['total_videos'],
                "total_quizzes": quiz_count
            })
        
        return jsonify({
            "success": True,
            "subjects": subjects_list,
            "total_subjects": len(subjects_list)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to fetch subjects"
        }), 500


# ================================================================
# HELPER ENDPOINT: SEARCH TOPICS
# ================================================================

@learning_bp.route('/api/topics/search', methods=['GET'])
def search_topics():
    """
    Search for topics across all subjects.
    
    Query Parameters:
        - q: Search query (required)
        - subject: Filter by subject (optional)
    
    Example: GET /api/topics/search?q=newton&subject=Physics
    
    Returns:
        {
            "success": true,
            "query": "newton",
            "results": [
                {
                    "code": "PHY_NEWTON_LAWS",
                    "title": "Newton's Laws of Motion",
                    "subject": "Physics",
                    "description": "...",
                    ...
                }
            ],
            "total_results": 3
        }
    """
    try:
        query = request.args.get('q', '').strip()
        subject_filter = request.args.get('subject', '').strip()
        
        if not query:
            return jsonify({
                "success": False,
                "message": "Search query is required"
            }), 400
        
        # Build search filter
        search_filter = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"keywords": {"$regex": query, "$options": "i"}}
            ]
        }
        
        if subject_filter:
            search_filter["subject"] = subject_filter.title()
        
        # Search nodes
        nodes = KnowledgeGraphNode.objects(__raw__=search_filter).limit(20)
        
        results = []
        for node in nodes:
            has_video = bool(node.videos and len(node.videos) > 0)
            has_quiz = Quiz.objects(KG_Node_ID=node).first() is not None
            
            results.append({
                "code": node.code,
                "title": node.title,
                "subject": node.subject,
                "description": node.description or "",
                "difficulty_level": node.difficulty_level,
                "has_video": has_video,
                "has_quiz": has_quiz,
                "keywords": node.keywords or []
            })
        
        return jsonify({
            "success": True,
            "query": query,
            "results": results,
            "total_results": len(results)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Search failed"
        }), 500