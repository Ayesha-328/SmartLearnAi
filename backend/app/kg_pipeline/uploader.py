import json
import os
from datetime import datetime
from pymongo import UpdateOne
from app.models import KnowledgeGraphNode
from app.db import *

IN_FILE = os.path.join(os.path.dirname(__file__), "kg_final.json")

def normalize_node(n):
    """Convert a raw JSON node into the KnowledgeGraphNode-compatible format."""
    return {
        "code": n.get("code"),
        "subject": n.get("subject"),
        "title": n.get("title"),
        "description": n.get("description", ""),
        "difficulty_level": n.get("difficulty_level", "base"),
        "prerequisites": n.get("prerequisites", []),
        "next_topics": n.get("next_topics", []),
        "content_refs": n.get("content_refs", []),
        "keywords": n.get("keywords", []),
        "objectives": n.get("objectives", []),
        "estimated_hours": float(n.get("estimated_hours", 0)),
        "createdAt": (
            datetime.fromisoformat(n["created_at"].replace("Z", ""))
            if n.get("created_at")
            else datetime.utcnow()
        ),
    }

def upsert_topics():
    if not os.path.exists(IN_FILE):
        raise RuntimeError("❌ kg_final.json not found — please build the graph first.")
    
    with open(IN_FILE, "r", encoding="utf-8") as f:
        nodes = json.load(f)
    
    ops = []
    for raw_node in nodes:
        node = normalize_node(raw_node)
        if not node["code"]:
            print(f"⚠️ Skipping node without code: {node}")
            continue
        
        ops.append(UpdateOne({"code": node["code"]}, {"$set": node}, upsert=True))
    
    if ops:
        collection = KnowledgeGraphNode._get_collection()
        res = collection.bulk_write(ops)
        print(f"✅ Upload complete.")
        print(f"Inserted or updated {len(nodes)} nodes.")
        print(f"Upserted: {len(res.upserted_ids)}, Modified: {res.modified_count}")
    else:
        print("⚠️ No valid nodes found to upload.")

if __name__ == "__main__":
    upsert_topics()
