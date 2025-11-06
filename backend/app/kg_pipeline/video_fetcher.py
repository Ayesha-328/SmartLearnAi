# app/kg_pipeline/video_fetcher.py
import os, time, hashlib
from datetime import datetime
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from app.models import KnowledgeGraphNode, VideoTranscript, TranscriptSegment
from dotenv import load_dotenv
from app.db import *

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# build client if key present
YOUTUBE = None
if YOUTUBE_API_KEY:
    YOUTUBE = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

def search_videos_for_topic(query, max_results=5):
    """Return list of candidate youtube ids and meta (requires YOUTUBE_API_KEY)."""
    if not YOUTUBE:
        return []  # no search possible
    res = YOUTUBE.search().list(
        q=query,
        part="snippet",
        type="video",
        maxResults=max_results,
        videoDuration="medium"  # prefer short videos for students
    ).execute()
    videos = []
    for it in res.get("items", []):
        videos.append({
            "youtube_id": it["id"]["videoId"],
            "title": it["snippet"]["title"],
            "channel": it["snippet"]["channelTitle"],
            "publishedAt": it["snippet"]["publishedAt"],
            "thumbnail": it["snippet"]["thumbnails"]["default"]["url"]
        })
    return videos

def fetch_transcript_for_video(youtube_id, languages=['en']):
    """
    Try to fetch transcript via youtube_transcript_api.
    Returns list of segments: [{"text":..., "start":..., "duration":...}, ...] or None.
    """
    try:
        ytt_api = YouTubeTranscriptApi()
        raw = ytt_api.fetch(youtube_id, languages=languages)
        # raw is list of dicts with keys "text", "start", "duration"
        return raw
    except (NoTranscriptFound, TranscriptsDisabled):
        return None
    except Exception as e:
        # Could be rate limit / network errors — return None to skip
        print(f"[video_fetcher] transcript fetch error for {youtube_id}: {e}")
        return None

def attach_videos_to_nodes(nodes, max_videos=2, search_max_results=6, pause_between=1.0):
    """
    nodes: list of node dicts (as produced by build_graph) or KnowledgeGraphNode objects
    For each node:
     - run search using node['title'] + top keywords
     - for each candidate try fetching transcript
     - if transcript exists, save as VideoTranscript and add youtube_id to node.videos
    """
    for n in nodes:
        # Accept either dict or model instance
        if isinstance(n, KnowledgeGraphNode):
            node_doc = n
            code = n.code
            title = n.title
            keywords = n.keywords or []
        else:
            node_doc = None
            code = n.get("code")
            title = n.get("title")
            keywords = n.get("keywords", [])

        query = title
        if keywords:
            query = f"{title} " + " ".join(keywords[:3])

        print(f"[video_fetcher] Searching videos for: {code} / {title}")
        candidates = search_videos_for_topic(query, max_results=search_max_results)
        added = 0
        for c in candidates:
            if added >= max_videos:
                break
            youtube_id = c["youtube_id"]

            # skip if we already have this transcript or it's already attached
            if node_doc:
                if youtube_id in (node_doc.videos or []):
                    continue
            else:
                # if using dict nodes: check DB if already exists in node
                existing = KnowledgeGraphNode.objects(code=code).first()
                if existing and youtube_id in (existing.videos or []):
                    continue

            # try to fetch transcript
            raw = fetch_transcript_for_video(youtube_id, languages=['en'])
            if not raw:
                # try next candidate
                continue

            # Save transcript doc
            segments = []
            for seg in raw:
                segments.append(TranscriptSegment(
                    start=getattr(seg, "start", 0.0),
                    duration=getattr(seg, "duration", 0.0),
                    text=getattr(seg, "text", "").strip()
                ))
            try:
                vt = VideoTranscript.objects(youtube_id=youtube_id).first()
                if not vt:
                    vt = VideoTranscript(
                        youtube_id=youtube_id,
                        kg_node = KnowledgeGraphNode.objects(code=code).first(),  # may be None for now
                        language="en",
                        segments=segments,
                        fetched_at=datetime.utcnow()
                    )
                    vt.save()
                else:
                    # update segments if necessary
                    vt.segments = segments
                    vt.fetched_at = datetime.utcnow()
                    vt.save()
            except Exception as e:
                print(f"[video_fetcher] Error saving transcript for {youtube_id}: {e}")
                continue

            # Attach youtube_id to KG node
            try:
                if node_doc:
                    if not node_doc.videos:
                        node_doc.videos = []
                    if youtube_id not in node_doc.videos:
                        node_doc.videos.append(youtube_id)
                        node_doc.save()
                else:
                    # node is a dict: update DB doc
                    KnowledgeGraphNode.objects(code=code).update_one(push__videos=youtube_id, upsert=True)
            except Exception as e:
                print(f"[video_fetcher] Error attaching youtube id to node {code}: {e}")
                # continue anyway

            added += 1
            time.sleep(pause_between)  # be polite with API usage

        print(f"[video_fetcher] Added {added} videos for {code}")
