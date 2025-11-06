# app/graph_traversal.py
from app.models import KnowledgeGraphNode, VideoTranscript, TranscriptSegment
from app.db import *
from youtube_transcript_api import YouTubeTranscriptApi


# 🔹 1. Get all topics of a subject (optionally by difficulty level)
def get_topics_by_subject(subject: str, difficulty_level: str = None):
    query = {"subject": subject}
    if difficulty_level:
        query["difficulty_level"] = difficulty_level
    return list(KnowledgeGraphNode.objects(**query))


# 🔹 2. Get all immediate prerequisites of a topic
def get_prerequisites(code: str):
    node = KnowledgeGraphNode.objects(code=code).first()
    if not node:
        return []
    return KnowledgeGraphNode.objects(code__in=node.prerequisites)


# 🔹 3. Get all next (dependent) topics of a node
def get_next_topics(code: str):
    node = KnowledgeGraphNode.objects(code=code).first()
    if not node:
        return []
    return KnowledgeGraphNode.objects(code__in=node.next_topics)


# 🔹 4. Recursively fetch the full prerequisite chain (bottom-up)
def get_full_prerequisite_chain(code: str):
    visited = set()
    chain = []

    def dfs(cur_code):
        if cur_code in visited:
            return
        visited.add(cur_code)
        node = KnowledgeGraphNode.objects(code=cur_code).first()
        if not node:
            return
        for pre_code in node.prerequisites:
            dfs(pre_code)
        chain.append(cur_code)

    dfs(code)
    return chain  # ordered base → target


# 🔹 5. Recursively fetch all subtopics for a subject (breadth-first style)
def get_all_subtopics(subject: str, start_code: str, depth_limit: int = 2):
    from collections import deque

    visited = set()
    queue = deque([(start_code, 0)])
    result = []

    while queue:
        cur_code, depth = queue.popleft()
        if depth > depth_limit or cur_code in visited:
            continue
        visited.add(cur_code)
        node = KnowledgeGraphNode.objects(code=cur_code).first()
        if not node:
            continue
        result.append(node)
        for nxt in node.next_topics:
            queue.append((nxt, depth + 1))
    return result


# 🔹 6. Search topics by keyword
def search_topics(keyword: str):
    return list(
        KnowledgeGraphNode.objects(
            keywords__icontains=keyword
        ).only("code", "title", "subject", "difficulty_level")
    )

def show_node_video_and_transcript(code):
    """
    Fetch and print stored YouTube video(s) and combined transcript(s)
    for a given KnowledgeGraphNode code.
    """
    node = KnowledgeGraphNode.objects(code=code).first()
    if not node:
        print(f"[show_node_video_and_transcript] ❌ No node found with code: {code}")
        return

    if not node.videos or len(node.videos) == 0:
        print(f"[show_node_video_and_transcript] ℹ️ No videos stored yet for node: {node.title} ({node.code})")
        return

    print(f"\n🎓 Node: {node.title} ({node.code})")
    print(f"📚 Stored videos: {len(node.videos)}\n")

    for vid_id in node.videos:
        print(f"🎥 Video: https://www.youtube.com/watch?v={vid_id}")

        vt = VideoTranscript.objects(youtube_id=vid_id).first()
        if not vt:
            print("⚠️ Transcript not found in database.\n")
            continue

        if not vt.segments:
            print("⚠️ Transcript segments are empty.\n")
            continue

        # Combine all segment texts into one readable transcript
        full_transcript = " ".join(seg.text.strip() for seg in vt.segments if seg.text)

        print(f"✅ Transcript found ({len(vt.segments)} segments)")
        print("--- Transcript Preview ---")
        print(full_transcript[:800] + ("..." if len(full_transcript) > 800 else ""))  # print first 800 chars
        print("--- End of Transcript ---\n")

def get_youtube_transcript(video_id):
    try:
        # Directly fetch transcript list of dicts
        ytt_api = YouTubeTranscriptApi()
        raw = ytt_api.fetch(video_id)
        # raw is list of dicts with keys "text", "start", "duration"
        return raw

    except Exception as e:
        return f"Error fetching transcript: {e}"




# Example usage and retrievals

if __name__ == "__main__":
    # Example usage:
    video_id = "ZAqIoDhornk"  # Replace with the actual YouTube video ID
    transcript = get_youtube_transcript(video_id)
    print(transcript)

    # Show videos and transcripts for a specific node
    # show_node_video_and_transcript("BIO_BASE")

    # Get all base-level Physics topics
    # physics_base = get_topics_by_subject("Physics", "base")
    # print("Base-level Physics topics:")
    # for t in physics_base:
    #     print("-", t.title)

    # # Get prerequisites of a topic
    # prereqs = get_prerequisites("PHY_MECHANICS")
    # print("\nPrerequisites for Mechanics:")
    # for p in prereqs:
    #     print("-", p.title)

    # # Get the full prerequisite chain (base → target)
    # chain = get_full_prerequisite_chain("PHY_MECHANICS")
    # print("\nFull chain:", " → ".join(chain))

    # # Get next topics
    # nexts = get_next_topics("PHY_BASE")
    # print("\nNext topics after PHY_BASE:")
    # for n in nexts:
    #     print("-", n.title)

    # # Search by keyword
    # res = search_topics("optics")
    # print("\nTopics related to 'optics':")
    # for r in res:
    #     print("-", r.title)
