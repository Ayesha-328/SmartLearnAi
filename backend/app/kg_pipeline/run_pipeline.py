# run_pipeline.py
import os
from app.kg_pipeline.kg_builder import build_graph
from app.kg_pipeline.visualizer import visualize_graph
from app.kg_pipeline.uploader import upsert_topics
from app.kg_pipeline.video_fetcher import attach_videos_to_nodes
import json
import networkx as nx

if __name__ == "__main__":
    # 1) Build (reads kg_seed.json)
    print("Expanding seeds to build KG...")
    from app.kg_pipeline.kg_builder import SEED_FILE
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        seeds = json.load(f)
    G, nodes = build_graph(seeds, recursive_depth=1)

    # 2) Visualize
    print("Visualizing graph...")
    visualize_graph(G, output_html="kg_vis.html")

    # Attach videos + transcripts to each KG node (saves to DB)
    print("Attaching videos & transcripts to KG nodes...")
  
    # 3) Upload to Mongo
    print("Upserting to MongoDB...")
    upsert_topics()
    print("Done.")
    
    # nodes is list of dicts returned by build_graph -> attach will update DB documents
    attach_videos_to_nodes(nodes, max_videos=2, search_max_results=6)
    print("Video attachment complete.")
    

