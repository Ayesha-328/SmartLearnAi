# run_pipeline.py
import os
from app.kg_pipeline.kg_builder import build_graph
from app.kg_pipeline.visualizer import visualize_graph
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

    # # 3) Upload to Mongo
    # print("Upserting to MongoDB...")
    # upsert_topics()
    # print("Done.")
