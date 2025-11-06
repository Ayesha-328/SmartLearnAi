# test_attach.py (quick-run)
from app.kg_pipeline.video_fetcher import attach_videos_to_nodes
from app.kg_pipeline.kg_builder import SEED_FILE
import json, os
from app.db import *

KG_FILE = os.path.join(os.path.dirname(__file__), "kg_final.json")
with open(KG_FILE, "r", encoding="utf-8") as f:
    nodes = json.load(f)

# assume KG nodes are already upserted to DB
attach_videos_to_nodes(nodes, max_videos=2)
print("Test video attachment complete.")