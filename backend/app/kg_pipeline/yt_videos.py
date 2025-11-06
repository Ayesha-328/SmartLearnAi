# app/kg_pipeline/smart_video_fetcher.py
import os
from datetime import datetime, timezone
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from app.models import KnowledgeGraphNode, VideoTranscript, TranscriptSegment, Quiz, QuizQuestion
from app.kg_pipeline.llm_client import llm_call
from dotenv import load_dotenv
from app.db import *

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Build client if key present
YOUTUBE = None
if YOUTUBE_API_KEY:
    YOUTUBE = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)


def validate_topic_search(query):
    """
    Use LLM to validate if the search query is a valid educational topic.
    Returns dict with 'is_valid' (bool) and 'reason' (str)
    """
    prompt = f"""Analyze if the following search query is a valid educational topic for grade 9-12 science education.

Query: "{query}"

Determine:
1. Is this a legitimate educational topic (physics, chemistry, biology)?
2. Is it specific enough to find relevant educational videos?
3. Is it appropriate for high school students?

Return your analysis in this JSON format:
{{
    "is_valid": true/false,
    "subject": "subject area only from one of these subjects must (Physics, Chemistry, Biology)",
    "difficulty_level": "Suggested difficulty level (e.g., Basic, Intermediate, Advanced)",
    "reason": "Brief explanation of why it's valid or invalid",
    "suggested_query": "Improved query if the original needs refinement (or same query if it's good)"
}}

Examples of valid topics: "Newton's Laws of Motion", "Chemical Bonding", "Photosynthesis"
Examples of invalid topics: "random stuff", "xyz", "how to hack"
"""
    
    try:
        result = llm_call(prompt, max_tokens=300, parse_json=True)
        return {
            'is_valid': result.get('is_valid', False),
            'reason': result.get('reason', 'Unknown'),
            'suggested_query': result.get('suggested_query', query)
        }
    except Exception as e:
        print(f"[smart_fetcher] LLM validation error: {e}")
        # On error, default to accepting the query
        return {
            'is_valid': True,
            'reason': 'LLM validation failed, proceeding with original query',
            'suggested_query': query
        }


def validate_transcript_relevance(transcript_text, topic, youtube_id, min_length=500):
    """
    Use LLM to check if the transcript is relevant to the topic and of educational quality.
    
    Args:
        transcript_text: The full transcript text
        topic: The topic/query we're searching for
        youtube_id: YouTube video ID
        min_length: Minimum transcript length in characters
    
    Returns:
        dict with 'is_relevant' (bool), 'confidence' (float 0-1), 'reason' (str)
    """
    # Basic length check
    if len(transcript_text) < min_length:
        return {
            'is_relevant': False,
            'confidence': 0.0,
            'reason': f'Transcript too short ({len(transcript_text)} chars, minimum {min_length})',
            'youtube_id': youtube_id
        }
    
    # Take first 2000 characters for LLM analysis (to save tokens)
    sample_text = transcript_text[:2000]
    
    prompt = f"""Analyze if this video transcript is relevant and appropriate for the educational topic.

Topic: "{topic}"

Transcript Sample (first 2000 chars):
\"\"\"
{sample_text}
\"\"\"

Full transcript length: {len(transcript_text)} characters

Evaluate:
1. Is the content directly related to the topic?
2. Is it educational and appropriate for high school students (grade 9-12)?
3. Does it explain concepts clearly (not just entertainment/vlog)?
4. Is the language professional and clear?

Return your analysis in this JSON format:
{{
    "is_relevant": true/false,
    "confidence": 0.0-1.0,
    "reason": "Brief explanation of your decision",
    "educational_quality": "high/medium/low"
}}

A transcript is relevant if it teaches the topic with clear explanations.
A transcript is NOT relevant if it's off-topic, too casual/entertainment-focused, or unclear.
"""
    
    try:
        result = llm_call(prompt, max_tokens=400, parse_json=True)
        
        is_relevant = result.get('is_relevant', False)
        confidence = float(result.get('confidence', 0.0))
        educational_quality = result.get('educational_quality', 'low')
        
        # Additional check: if quality is low, mark as not relevant
        if educational_quality == 'low':
            is_relevant = False
        
        return {
            'is_relevant': is_relevant,
            'confidence': confidence,
            'reason': result.get('reason', 'Unknown'),
            'educational_quality': educational_quality,
            'youtube_id': youtube_id
        }
    except Exception as e:
        print(f"[smart_fetcher] LLM transcript validation error: {e}")
        # On error, default to accepting if transcript is long enough
        return {
            'is_relevant': True,
            'confidence': 0.5,
            'reason': 'LLM validation failed, proceeding based on length check',
            'educational_quality': 'unknown',
            'youtube_id': youtube_id
        }


def search_multiple_videos(query, max_results=5):
    """Search for multiple videos on YouTube"""
    if not YOUTUBE:
        return []
    
    try:
        res = YOUTUBE.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=max_results,
            videoDuration="medium"
        ).execute()
        
        items = res.get("items", [])
        return [item["id"]["videoId"] for item in items]
    except Exception as e:
        print(f"[smart_fetcher] YouTube search error: {e}")
        return []


def search_single_video(query, max_results=1):
    """Search for a single video on YouTube"""
    videos = search_multiple_videos(query, max_results)
    return videos[0] if videos else None


def fetch_and_save_transcript(youtube_id, kg_node_code=None, topic=None, validate=True):
    """
    Fetch transcript for a video using YouTubeTranscriptApi().fetch(...) and save it to DB.
    
    Args:
        youtube_id: YouTube video ID
        kg_node_code: Knowledge graph node code (optional)
        topic: Topic name for validation (optional but recommended)
        validate: Whether to validate transcript relevance with LLM (default True)
    
    Returns:
        dict with 'transcript' (str), 'is_valid' (bool), 'reason' (str) or None if failed
    """
    try:
        # Use .fetch() which returns FetchedTranscriptSnippet objects
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.fetch(youtube_id, languages=['en'])

        if not transcript_list:
            return None

        # Create TranscriptSegment objects and collect text parts
        segments = []
        full_text_parts = []

        for item in transcript_list:
            text = getattr(item, "text", "") or ""
            start = getattr(item, "start", 0.0) or 0.0
            duration = getattr(item, "duration", 0.0) or 0.0

            seg = TranscriptSegment(
                start=float(start),
                duration=float(duration),
                text=text.strip()
            )
            segments.append(seg)
            full_text_parts.append(text.strip())

        # Join all text segments
        full_transcript_text = " ".join([p for p in full_text_parts if p])

        # LLM Validation Check - MUST PASS before saving to DB
        validation_result = None
        if validate and topic:
            print(f"[smart_fetcher] Validating transcript relevance for topic: {topic}")
            validation_result = validate_transcript_relevance(full_transcript_text, topic, youtube_id)
            
            if not validation_result['is_relevant']:
                print(f"[smart_fetcher] Transcript validation FAILED - NOT saving to DB: {validation_result['reason']}")
                return {
                    'transcript': None,
                    'is_valid': False,
                    'reason': validation_result['reason'],
                    'confidence': validation_result.get('confidence', 0.0)
                }
            else:
                print(f"[smart_fetcher] Transcript validation PASSED - proceeding to save in DB")
        
        # Save to database ONLY after validation passes (or if validation is disabled)
        try:
            existing_transcript = VideoTranscript.objects(youtube_id=youtube_id).first()

            kg_node = None
            if kg_node_code:
                kg_node = KnowledgeGraphNode.objects(code=kg_node_code).first()

            if existing_transcript:
                existing_transcript.segments = segments
                existing_transcript.full_text = full_transcript_text
                if kg_node:
                    existing_transcript.kg_node = kg_node
                existing_transcript.fetched_at = datetime.now(timezone.utc)
                existing_transcript.save()
                print(f"[smart_fetcher] Updated existing transcript in DB for video {youtube_id}")
            else:
                new_transcript = VideoTranscript(
                    youtube_id=youtube_id,
                    kg_node=kg_node,
                    language="en",
                    segments=segments,
                    full_text=full_transcript_text,
                    fetched_at=datetime.now(timezone.utc)
                )
                new_transcript.save()
                print(f"[smart_fetcher] Saved new transcript to DB for video {youtube_id}")

        except Exception as e:
            print(f"[smart_fetcher] Database save error: {e}")
            # Even if DB save fails, return the validated transcript
            return {
                'transcript': full_transcript_text,
                'is_valid': True,
                'reason': f"Validation passed but DB save failed: {str(e)}",
                'confidence': validation_result.get('confidence', 1.0) if validation_result else 1.0,
                'educational_quality': validation_result.get('educational_quality', 'unknown') if validation_result else 'unknown'
            }

        # Return success with validation info
        return {
            'transcript': full_transcript_text,
            'is_valid': True,
            'reason': validation_result['reason'] if validation_result else 'Transcript fetched successfully (validation disabled)',
            'confidence': validation_result.get('confidence', 1.0) if validation_result else 1.0,
            'educational_quality': validation_result.get('educational_quality', 'unknown') if validation_result else 'unknown'
        }

    except (NoTranscriptFound, TranscriptsDisabled) as e:
        print(f"[smart_fetcher] No transcript available for {youtube_id}: {e}")
        return None
    except Exception as e:
        print(f"[smart_fetcher] Transcript fetch error for {youtube_id}: {e}")
        return None


def find_video_with_transcript(search_query, max_videos=5, kg_node_code=None, validate_with_llm=True):
    """
    Search for videos and return the first one that has a valid transcript.
    
    Args:
        search_query: Search query for YouTube
        max_videos: Maximum number of videos to try
        kg_node_code: KG node code (optional)
        validate_with_llm: Whether to validate with LLM (default True)
    
    Returns:
        tuple: (youtube_id, transcript_text, validation_info) or (None, None, None)
    """
    # First, validate the search query with LLM
    if validate_with_llm:
        print(f"[smart_fetcher] Validating search query: {search_query}")
        topic_validation = validate_topic_search(search_query)
        
        if not topic_validation['is_valid']:
            print(f"[smart_fetcher] Invalid search topic: {topic_validation['reason']}")
            return None, None, {'error': topic_validation['reason']}
        
        # Use suggested query if different
        if topic_validation['suggested_query'] != search_query:
            print(f"[smart_fetcher] Using improved query: {topic_validation['suggested_query']}")
            search_query = topic_validation['suggested_query']
    
    video_ids = search_multiple_videos(search_query, max_results=max_videos)
    
    if not video_ids:
        print(f"[smart_fetcher] No videos found for query: {search_query}")
        return None, None, None
    
    for youtube_id in video_ids:
        print(f"[smart_fetcher] Trying video: {youtube_id}")
        result = fetch_and_save_transcript(
            youtube_id, 
            kg_node_code=kg_node_code, 
            topic=search_query,
            validate=validate_with_llm
        )
        
        if result and result['is_valid'] and result['transcript']:
            print(f"[smart_fetcher] Found valid video with transcript: {youtube_id}")
            print(f"[smart_fetcher] Confidence: {result['confidence']}, Quality: {result.get('educational_quality', 'N/A')}")
            return youtube_id, result['transcript'], result
        else:
            reason = result['reason'] if result else 'No transcript available'
            print(f"[smart_fetcher] Video {youtube_id} rejected: {reason}")
    
    print(f"[smart_fetcher] No valid video with transcript found after trying {len(video_ids)} videos")
    return None, None, None


def get_video_and_transcript(code_or_topic, validate_with_llm=True):
    """
    Main function to get video URL and transcript for a given topic code or name.
    
    Args:
        code_or_topic: Either a KG node code (e.g., "PHY_BASE") or topic name
        validate_with_llm: Whether to use LLM validation (default True)
    
    Returns:
        dict: {
            'youtube_id': str,
            'youtube_url': str,
            'transcript': str,
            'status': str,
            'confidence': float,  # LLM confidence in relevance
            'educational_quality': str  # high/medium/low
        }
    """
    
    # Step 1: Search for the node in database
    # Try to find node by code OR by title/subject (match either field)
    try:
        kg_node = KnowledgeGraphNode.objects(__raw__={
            '$or': [
                {'code': code_or_topic},
                {'title': code_or_topic},
                {'subject': code_or_topic}
            ]
        }).first()

    except Exception:
        # Fallback: try sequential queries if __raw__ isn't supported
        kg_node = KnowledgeGraphNode.objects(code=code_or_topic).first() \
                  or KnowledgeGraphNode.objects(title=code_or_topic).first() \
                  or KnowledgeGraphNode.objects(subject=code_or_topic).first()
    
    if not kg_node:
        kg_node = KnowledgeGraphNode.objects(title=code_or_topic).first()
        if not kg_node:
            kg_node = KnowledgeGraphNode.objects(subject=code_or_topic).first()
    
    # Case 1: Node exists and has videos
    print("\n**********Case 1: Knowledge Graph Node and video exsits...**********")
    if kg_node and kg_node.videos and len(kg_node.videos) > 0:
        # Try each video in the list until we find one with a valid transcript
        for youtube_id in kg_node.videos:
            existing_transcript = VideoTranscript.objects(youtube_id=youtube_id).first()
            
            if existing_transcript and existing_transcript.segments:
                full_text = ' '.join([seg.text for seg in existing_transcript.segments])
                
                # Validate existing transcript if requested
                if validate_with_llm:
                    topic = kg_node.title or code_or_topic
                    validation = validate_transcript_relevance(full_text, topic, youtube_id)
                    
                    if not validation['is_relevant']:
                        print(f"[smart_fetcher] Existing transcript invalid: {validation['reason']}")
                        continue  # Try next video
                
                return {
                    'youtube_id': youtube_id,
                    'youtube_url': f'https://www.youtube.com/watch?v={youtube_id}',
                    'transcript': full_text,
                    'status': 'found_existing',
                    'confidence': 1.0,
                    'educational_quality': 'validated'
                }
            else:
                # Try to fetch transcript
                topic = kg_node.title or code_or_topic
                result = fetch_and_save_transcript(
                    youtube_id, 
                    kg_node_code=kg_node.code,
                    topic=topic,
                    validate=validate_with_llm
                )
                
                if result and result['is_valid'] and result['transcript']:
                    return {
                        'youtube_id': youtube_id,
                        'youtube_url': f'https://www.youtube.com/watch?v={youtube_id}',
                        'transcript': result['transcript'],
                        'status': 'fetched_transcript',
                        'confidence': result.get('confidence', 1.0),
                        'educational_quality': result.get('educational_quality', 'unknown')
                    }
        
        # No existing videos have valid transcripts, search for new one
        print(f"[smart_fetcher] No existing videos have valid transcripts, searching for new video...")
        search_query = f"{kg_node.title} {' '.join(kg_node.keywords[:3]) if kg_node.keywords else ''}"
        youtube_id, transcript_text, validation_info = find_video_with_transcript(
            search_query, 
            max_videos=5, 
            kg_node_code=kg_node.code,
            validate_with_llm=validate_with_llm
        )
        
        if youtube_id:
            kg_node.videos.append(youtube_id)
            kg_node.save()
            
            return {
                'youtube_id': youtube_id,
                'youtube_url': f'https://www.youtube.com/watch?v={youtube_id}',
                'transcript': transcript_text,
                'status': 'fetched_new_after_retry',
                'confidence': validation_info.get('confidence', 1.0) if validation_info else 1.0,
                'educational_quality': validation_info.get('educational_quality', 'unknown') if validation_info else 'unknown'
            }
        else:
            return {
                'youtube_id': None,
                'youtube_url': None,
                'transcript': None,
                'status': 'no_valid_transcript_available',
                'confidence': 0.0,
                'educational_quality': 'none'
            }
    
    # Case 2: Node exists but has no videos
    elif kg_node:
        print("\n**********Case 2: Knowledge Graph Node exsits but no video. Creating new node...**********")
        search_query = f"{kg_node.title} {' '.join(kg_node.keywords[:3]) if kg_node.keywords else ''}"
        youtube_id, transcript_text, validation_info = find_video_with_transcript(
            search_query, 
            max_videos=5, 
            kg_node_code=kg_node.code,
            validate_with_llm=validate_with_llm
        )
        
        if not youtube_id:
            return {
                'youtube_id': None,
                'youtube_url': None,
                'transcript': None,
                'status': 'no_video_with_valid_transcript_found',
                'confidence': 0.0,
                'educational_quality': 'none'
            }
        
        if not kg_node.videos:
            kg_node.videos = []
        kg_node.videos.append(youtube_id)
        kg_node.save()
        
        return {
            'youtube_id': youtube_id,
            'youtube_url': f'https://www.youtube.com/watch?v={youtube_id}',
            'transcript': transcript_text,
            'status': 'fetched_new',
            'confidence': validation_info.get('confidence', 1.0) if validation_info else 1.0,
            'educational_quality': validation_info.get('educational_quality', 'unknown') if validation_info else 'unknown'
        }
    
    # Case 3: Node doesn't exist at all
    else:
        print("\n**********Case 3: Knowledge Graph Node does not exist. Creating new node...**********")
        # Step 1: Validate the topic (optional but recommended)
        topic_validation = validate_topic_search(code_or_topic)
        topic_name = topic_validation.get('suggested_query', code_or_topic)
        subject = topic_validation.get('subject', 'Science')
        difficulty_level = topic_validation.get('difficulty_level', 'Basic')
    
        # Step 2: Search for video and transcript from YouTube/API
        youtube_id, transcript_text, validation_info = find_video_with_transcript(
            topic_name, 
            max_videos=5, 
            kg_node_code=None,
            validate_with_llm=validate_with_llm
        )
    
        if not youtube_id:
            return {
                'youtube_id': None,
                'youtube_url': None,
                'transcript': None,
                'status': 'no_video_with_valid_transcript_found',
                'confidence': 0.0,
                'educational_quality': 'none'
            }
    
        # Step 3: Create a new Knowledge Graph Node
        try:
            new_node = KnowledgeGraphNode(
                title=topic_name,
                subject=subject,  # or detect subject using LLM
                code=f"{subject[:3].upper()}_{topic_name.upper().replace(' ', '_')}",
                videos=[youtube_id],
                createdAt=datetime.now(timezone.utc),
                difficulty_level=difficulty_level=="Basic" and "base" or (difficulty_level=="Intermediate" and "level_1" or "level_2")
            )
            new_node.save()
            print(f"[smart_fetcher] Created new KG node for topic: {topic_name}")
        except Exception as e:
            print(f"[smart_fetcher] Error creating new KG node: {e}")
    
        # Step 4: Save transcript to DB linked to new node
        fetch_and_save_transcript(
            youtube_id,
            kg_node_code=new_node.code if 'new_node' in locals() else None,
            topic=topic_name,
            validate=validate_with_llm
        )
    
        # Step 5: Return the final response
        return {
            'youtube_id': youtube_id,
            'youtube_url': f'https://www.youtube.com/watch?v={youtube_id}',
            'transcript': transcript_text,
            'status': 'fetched_new_node_created',
            'confidence': validation_info.get('confidence', 1.0) if validation_info else 1.0,
            'educational_quality': validation_info.get('educational_quality', 'unknown') if validation_info else 'unknown'
        }


def generate_quiz_from_transcript(transcript_text, topic=None, num_questions=10, kg_node_code=None, youtube_id=None, force_regenerate=False):
    """
    Generate a 10-question multiple-choice quiz from a YouTube video transcript
    using the 5Ws & H principle (Who, What, When, Where, Why, How).
    
    Checks database first - if quiz already exists for this video/topic, returns it.
    Otherwise generates new quiz and saves to database.

    Args:
        transcript_text (str): The full transcript text of the video.
        topic (str, optional): The main topic of the video for context.
        num_questions (int): Number of MCQs to generate (default: 10)
        kg_node_code (str, optional): Knowledge graph node code for linking
        youtube_id (str, optional): YouTube video ID for tracking
        force_regenerate (bool): If True, regenerate quiz even if exists (default: False)

    Returns:
        dict: {
            "quiz": [
                {
                    "question": str,
                    "options": [str, str, str, str],
                    "correct_answer": str,
                    "category": "who/what/when/where/why/how",
                    "explanation": str
                }
            ],
            "topic": str,
            "num_questions": int,
            "source": "database/generated",
            "youtube_id": str,
            "quiz_id": str
        }
    """
    if not transcript_text or len(transcript_text.strip()) == 0:
        return {
            "quiz": [],
            "topic": topic or "Unknown",
            "num_questions": 0,
            "error": "Transcript is empty. Cannot generate quiz."
        }

    # Step 1: Check if quiz already exists in database (unless force_regenerate)
    if not force_regenerate and (kg_node_code or youtube_id):
        print(f"[quiz_generator] Checking database for existing quiz...")
        
        # Find KG node
        kg_node = None
        if kg_node_code:
            kg_node = KnowledgeGraphNode.objects(code=kg_node_code).first()
        elif youtube_id:
            video_transcript = VideoTranscript.objects(youtube_id=youtube_id).first()
            if video_transcript and video_transcript.kg_node:
                kg_node = video_transcript.kg_node
        
        if kg_node:
            # Find existing progress quiz for this node
            existing_quiz = Quiz.objects(
                KG_Node_ID=kg_node,
                quiz_type="progress"
            ).first()
            
            if existing_quiz and existing_quiz.question_IDs:
                print(f"[quiz_generator] ✅ Found existing quiz with {len(existing_quiz.question_IDs)} questions")
                
                # Convert database quiz to return format
                quiz_data = []
                for q_ref in existing_quiz.question_IDs:
                    quiz_data.append({
                        "question": q_ref.question_text,
                        "options": q_ref.options,
                        "correct_answer": q_ref.correct_answer,
                        "category": "mixed",
                        "explanation": q_ref.explanation or ""
                    })
                
                return {
                    "quiz": quiz_data[:num_questions],
                    "topic": topic or kg_node.title,
                    "num_questions": len(quiz_data[:num_questions]),
                    "source": "database",
                    "youtube_id": youtube_id,
                    "quiz_id": str(existing_quiz.id)
                }

    # Step 2: Generate new quiz using LLM
    print(f"[quiz_generator] 🔄 Generating new quiz for topic: {topic}")
    sample_text = transcript_text[:3000]  # Limit size to reduce LLM cost

    prompt = f"""You are an educational quiz generator for high school science (grades 9-12). 
Your task is to create {num_questions} multiple-choice questions that test understanding of CORE SCIENTIFIC CONCEPTS ONLY.

Topic: "{topic or 'General Educational Topic'}"

Transcript excerpt:
\"\"\" 
{sample_text}
\"\"\" 

=== CRITICAL RULES ===

1. ONLY ask questions about SCIENTIFIC CONCEPTS, THEORIES, FACTS, and PROCESSES
   - Focus on definitions, mechanisms, relationships, and principles
   - Test understanding of HOW things work and WHY they happen
   - Category of each question must be one of: who, what, when, where, why, how 

2. NEVER ask questions about:
   ❌ Who the content is for ("Who can benefit from...", "Who should study...")
   ❌ Teaching methods or difficulty ("Why is it challenging to teach...", "How should students learn...")
   ❌ The video itself ("What is being discussed?", "What is the primary subject?")
   ❌ Meta-commentary about learning or education
   ❌ Introductions, greetings, or channel promotion content
   ❌ General motivational or philosophical statements
   ❌ Relationships between different subjects ("What should you study to understand...")

3. SKIP the first 20% of the transcript if it contains introductions/greetings

4. Each question must:
   - Test a specific scientific concept from the transcript
   - Have 4 distinct, plausible options
   - Include a brief, factual explanation
   - Use clear, grade-appropriate language
   - Be answerable ONLY from the scientific content provided

=== QUESTION CATEGORIES ===
Use the 5Ws + H framework, but ONLY for scientific content:
- WHO: Scientists, organisms, or entities involved in processes
- WHAT: Definitions, structures, components, or phenomena
- WHEN: Timing of processes, sequences, or conditions
- WHERE: Locations of processes, structures, or reactions
- WHY: Reasons, causes, or purposes of scientific phenomena
- HOW: Mechanisms, processes, or methods

=== EXAMPLES ===

TOPIC: Biology - Cells

✅ GOOD QUESTIONS (ask these types):
{{
    "question": "What is the function of mitochondria in eukaryotic cells?",
    "options": ["Protein synthesis", "Energy production", "DNA storage", "Waste removal"],
    "correct_answer": "Energy production",
    "category": "what",
    "explanation": "Mitochondria are known as the powerhouse of the cell, producing ATP through cellular respiration."
}}

{{
    "question": "How do cells maintain homeostasis?",
    "options": ["Through cell division", "By regulating internal conditions", "By absorbing sunlight", "Through photosynthesis"],
    "correct_answer": "By regulating internal conditions",
    "category": "how",
    "explanation": "Cells maintain stable internal conditions through various regulatory mechanisms."
}}

❌ BAD QUESTIONS (NEVER ask these):
- "What is the primary subject being discussed?" (meta-question)
- "Who can benefit from learning biology?" (about audience)
- "Why is biology challenging to teach?" (about teaching)
- "What subjects should one study before biology?" (meta-education)
- "Why do students return to biology later?" (about students)

=== OUTPUT FORMAT ===

Return ONLY valid JSON in this exact structure:
{{
    "quiz": [
        {{
            "question": "Clear, specific question about a scientific concept",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Exact text of correct option",
            "category": "what/who/when/where/why/how",
            "explanation": "Brief factual explanation (1-2 sentences)"
        }}
    ]
}}

Generate {num_questions} high-quality questions about the SCIENTIFIC CONTENT now.
"""

    try:
        result = llm_call(prompt, max_tokens=2000, parse_json=True)
        if not result or "quiz" not in result:
            raise ValueError("Invalid LLM response")

        quiz = result["quiz"][:num_questions]
        
        # Step 3: Save quiz to database
        if kg_node_code or youtube_id:
            try:
                print(f"[quiz_generator] 💾 Saving quiz to database...")
        
                # Get or determine KG node
                kg_node = None
                if kg_node_code:
                    kg_node = KnowledgeGraphNode.objects(code=kg_node_code).first()
                elif youtube_id:
                    video_transcript = VideoTranscript.objects(youtube_id=youtube_id).first()
                    if video_transcript and video_transcript.kg_node:
                        kg_node = video_transcript.kg_node
        
                # Check for existing quiz for this KG node (or linked via youtube_id)
                existing_quiz = None
                if kg_node:
                    existing_quiz = Quiz.objects(KG_Node_ID=kg_node, quiz_type="progress").first()
                elif youtube_id:
                    vt = VideoTranscript.objects(youtube_id=youtube_id).first()
                    if vt and vt.kg_node:
                        existing_quiz = Quiz.objects(KG_Node_ID=vt.kg_node, quiz_type="progress").first()
        
                # 🧹 If regenerating and quiz exists → delete old questions first
                if force_regenerate and existing_quiz:
                    print(f"[quiz_generator] ♻️ Regenerating quiz — deleting old questions...")
                    for old_q in existing_quiz.question_IDs:
                        try:
                            old_q.delete()
                        except Exception as del_err:
                            print(f"[quiz_generator] ⚠️ Could not delete old question: {del_err}")
                    existing_quiz.question_IDs = []
        
                # Create new QuizQuestion documents
                question_refs = []
                for q_data in quiz:
                    quiz_question = QuizQuestion(
                        question_text=q_data["question"],
                        difficulty_level="base",
                        KG_Node_ID=kg_node,
                        options=q_data["options"],
                        correct_answer=q_data["correct_answer"],
                        explanation=q_data.get("explanation", ""),
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    quiz_question.save()
                    question_refs.append(quiz_question)
        
                # Replace or create quiz
                if existing_quiz:
                    existing_quiz.question_IDs = question_refs
                    existing_quiz.updated_at = datetime.now(timezone.utc)
                    existing_quiz.level = "base"
                    existing_quiz.save()
                    new_quiz = existing_quiz
                    print(f"[quiz_generator] ✅ Updated existing quiz with {len(question_refs)} questions (ID: {new_quiz.id})")
                else:
                    new_quiz = Quiz(
                        KG_Node_ID=kg_node,
                        quiz_type="progress",
                        level="base",
                        question_IDs=question_refs,
                        created_at=datetime.now(timezone.utc)
                    )
                    new_quiz.save()
                    print(f"[quiz_generator] ✅ Created new quiz with ID: {new_quiz.id}")
        
                return {
                    "quiz": quiz,
                    "topic": topic or (kg_node.title if kg_node else "Unknown"),
                    "num_questions": len(quiz),
                    "source": "generated",
                    "youtube_id": youtube_id,
                    "quiz_id": str(new_quiz.id)
                }
        
            except Exception as db_error:
                print(f"[quiz_generator] ⚠️ Failed to save quiz: {db_error}")
                return {
                    "quiz": quiz,
                    "topic": topic or "Unknown",
                    "num_questions": len(quiz),
                    "source": "generated",
                    "youtube_id": youtube_id,
                    "error": f"Quiz generated but DB save failed: {str(db_error)}"
                }

        # If there's no KG node code or youtube_id linkage, return the generated quiz without saving
        return {
            "quiz": quiz,
            "topic": topic or "Unknown",
            "num_questions": len(quiz),
            "source": "generated",
            "youtube_id": youtube_id
        }

    except Exception as e:
        print(f"[quiz_generator] ❌ Quiz generation failed: {e}")
        return {
            "quiz": [],
            "topic": topic or "Unknown",
            "num_questions": 0,
            "error": str(e)
        }


def get_video_transcript_and_quiz(code_or_topic, num_questions=10, validate_with_llm=True, force_regenerate_quiz=False):
    """
    Comprehensive function that returns video, transcript, and quiz for a topic.
    
    This is a convenience function that combines get_video_and_transcript() 
    with generate_quiz_from_transcript().
    
    Args:
        code_or_topic: KG node code or topic name
        num_questions: Number of quiz questions (default: 10)
        validate_with_llm: Whether to validate transcript with LLM (default: True)
        force_regenerate_quiz: Force regenerate quiz even if exists (default: False)
    
    Returns:
        dict: {
            'youtube_id': str,
            'youtube_url': str,
            'transcript': str,
            'quiz': list,
            'video_status': str,
            'quiz_status': str,
            'confidence': float,
            'educational_quality': str,
            'num_questions': int,
            'quiz_id': str,
            'topic': str
        }
    """
    
    # Step 1: Get video and transcript
    video_result = get_video_and_transcript(code_or_topic, validate_with_llm=validate_with_llm)
    
    if not video_result['transcript']:
        return {
            **video_result,
            'quiz': [],
            'quiz_status': 'no_transcript_for_quiz',
            'num_questions': 0
        }
    
    # Step 2: Get or generate quiz
    kg_node = KnowledgeGraphNode.objects(code=code_or_topic).first()
    if not kg_node:
        kg_node = KnowledgeGraphNode.objects(title=code_or_topic).first()
    
    kg_node_code = kg_node.code if kg_node else None
    topic = kg_node.title if kg_node else code_or_topic
    
    quiz_result = generate_quiz_from_transcript(
        transcript_text=video_result['transcript'],
        topic=topic,
        num_questions=num_questions,
        kg_node_code=kg_node_code,
        youtube_id=video_result['youtube_id'],
        force_regenerate=force_regenerate_quiz
    )
    
    return {
        'youtube_id': video_result['youtube_id'],
        'youtube_url': video_result['youtube_url'],
        'transcript': video_result['transcript'],
        'quiz': quiz_result['quiz'],
        'video_status': video_result['status'],
        'quiz_status': quiz_result.get('source', 'error'),
        'confidence': video_result.get('confidence', 0.0),
        'educational_quality': video_result.get('educational_quality', 'unknown'),
        'num_questions': quiz_result['num_questions'],
        'quiz_id': quiz_result.get('quiz_id'),
        'topic': quiz_result.get('topic')
    }


# Example usage:
if __name__ == "__main__":
    print("=== Testing Smart Video Fetcher with LLM Validation ===\n")
    print("\n=== Case 1: Fetching by code, node exists with video ===")
    result = get_video_transcript_and_quiz("CHE_ATOMIC_STRUCTURE")
    print(f"Status: {result['video_status']}")
    print(f"YouTube URL: {result['youtube_url']}")
    print(f"Confidence: {result.get('confidence', 'N/A')}")
    print(f"Quality: {result.get('educational_quality', 'N/A')}")
    print(f"Transcript length: {len(result['transcript']) if result['transcript'] else 0} characters")
    print(f"First 500 chars: {result['transcript'][:500] if result['transcript'] else 'N/A'}")
    
    print(f"Quiz Status: {result['quiz_status']}")
    print(f"QuizId: {result['quiz_id']}")
    print(f"Number of Questions: {result['num_questions']}")
    for i, q in enumerate(result['quiz'], start=1):
        print(f"\nQ{i}: {q['question']}")
        for opt in q['options']:
            print(f" - {opt}")
        print(f"Correct Answer: {q['correct_answer']}")
        print(f"Category: {q['category']}")