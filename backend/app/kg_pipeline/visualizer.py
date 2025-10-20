# app/visualizer.py
from pyvis.network import Network
import networkx as nx
import json
import os

def visualize_graph(G, output_html="kg_vis.html"):
    net = Network(height="900px", width="100%", directed=True)
    # add nodes with small labels
    for n in G.nodes:
        net.add_node(n, label=n)
    for u, v in G.edges:
        net.add_edge(u, v)
    net.write_html(output_html)
    print(f"✓ Visualization saved to {output_html}")

if __name__ == "__main__":
    # expects graph to be built in memory or load kg_final.json
    HERE = os.path.dirname(__file__)
    final = os.path.join(HERE, "..", "kg_final.json")
    if not os.path.exists(final):
        print("kg_final.json not found. Run kg_builder first.")
    else:
        with open(final, "r", encoding="utf-8") as f:
            nodes = json.load(f)
        # build small NetworkX for visualization
        import networkx as nx
        G = nx.DiGraph()
        for n in nodes:
            G.add_node(n["code"])
        for n in nodes:
            for nxt in n.get("next_topics", []):
                G.add_edge(n["code"], nxt)
        visualize_graph(G, output_html=os.path.join(HERE, "..", "kg_vis.html"))
