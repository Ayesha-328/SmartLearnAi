import json, time, os
from app.kg_pipeline.llm_client import llm_call
import networkx as nx
from tqdm import tqdm
from datetime import datetime
from collections import deque

SEED_FILE = os.path.join(os.path.dirname(__file__), "kg_seed.json")
OUT_FILE = os.path.join(os.path.dirname(__file__), "kg_final.json")
CACHE_FILE = os.path.join(os.path.dirname(__file__), "kg_cache.json")

DIFFICULTY_LEVELS = ["base", "level_1", "level_2", "level_3", "level_4"]

# Load or initialize cache
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        CACHE = json.load(f)
else:
    CACHE = {}

PROMPT_TEMPLATE = """
You are an educational curriculum designer for Grades 9-12 science. Create a comprehensive breakdown for the topic: "{topic}" in {subject}.

CRITICAL GUIDELINES:
- For depth {depth}, provide BROAD coverage of the entire topic area
- Include topics across ALL difficulty levels appropriate for {subject}
- Balance between fundamental concepts and advanced applications
- Ensure logical progression from basic to complex topics

Generate JSON with these keys:
- subtopics: list of 4-8 essential subtopics that comprehensively cover "{topic}"
- prerequisites: list of 2-5 prerequisite topics (do not consider cross-subject prerequisites)
- objectives: list of 3-6 specific, measurable learning objectives
- difficulty_level: assign appropriate level based on complexity:
  • base: Foundational concepts, introductory level (Grade 9)
  • level_1: Basic applications and understanding (Grade 9-10)  
  • level_2: Intermediate concepts with problem-solving (Grade 10-11)
  • level_3: Advanced topics requiring deep understanding (Grade 11-12)
  • level_4: Specialized/competitive exam level topics
- keywords: list of 5-10 relevant keywords
- estimated_hours: realistic time (1-6 hours) based on complexity

STRATEGY FOR DEPTH {depth}:
- Include 40-50 percent base level topics (fundamentals everyone must know)
- Include 30-40 percent level_1 topics (core applications)  
- Include 20-30 percent level_2+ topics (important advanced concepts)
- Ensure the subtopics list represents the FULL scope of "{topic}" for example if depth is 1 in physics subtopics should cover mechanics, thermodynamics, electromagnetism, optics, and modern physics.

Return ONLY valid JSON.
"""


def save_cache():
    """Persist cache to file."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(CACHE, f, indent=2, ensure_ascii=False)

def expand_topic(topic_name, subject, current_level="base", max_retries=2, depth=1):
    """Expand a topic using LLM or return from cache if available."""
    cache_key = f"{subject}::{topic_name}::{current_level}"

    # ✅ Use cached response if available
    if cache_key in CACHE:
        return CACHE[cache_key]

    prompt = PROMPT_TEMPLATE.format(topic=topic_name, subject=subject, level=current_level, depth=depth)
    for attempt in range(max_retries + 1):
        try:
            data = llm_call(prompt, max_tokens=1200)
            # txt = raw.strip()
            # if txt.startswith("```"):
            #     lines = txt.splitlines()
            #     txt = "\n".join(lines[1:-1]) if len(lines) > 2 else txt
            # data = json.loads(raw)
            if data.get("difficulty_level") not in DIFFICULTY_LEVELS:
                data["difficulty_level"] = current_level

            # ✅ Save to cache
            CACHE[cache_key] = data
            save_cache()

            return data

        except Exception as e:
            # print(f"LLM parse error (attempt {attempt+1}): {e}")
            if attempt < max_retries:
                time.sleep(2 + attempt * 2)
            else:
                raise RuntimeError(f"Failed to get valid JSON for topic: {topic_name}")

def generate_code(subject, title):
    subject_prefix = subject[:3].upper()
    title_part = title.upper().replace(" ", "_").replace("-", "_")
    title_part = "".join(c for c in title_part if c.isalnum() or c == "_")[:40]
    return f"{subject_prefix}_{title_part}"

def build_graph(seed_nodes, recursive_depth=2, max_nodes=500):
    G = nx.DiGraph()
    nodes_map = {}
    processed = set()

    print(f"\n{'='*60}")
    print(f"Building Knowledge Graph")
    print(f"Recursive Depth: {recursive_depth} | Max Nodes: {max_nodes}")
    print(f"{'='*60}\n")

    # Initialize seed nodes with varied difficulties
    for s in seed_nodes:
        code = s.get("code") or generate_code(s["subject"], s["title"])
        node = {
            "code": code,
            "subject": s["subject"],
            "title": s["title"],
            "description": s.get("description", ""),
            "difficulty_level": s.get("difficulty_level", "base"),
            "objectives": s.get("objectives", []),
            "prerequisites": s.get("prerequisites", []),
            "next_topics": [],
            "keywords": s.get("keywords", []),
            "estimated_hours": s.get("estimated_hours", 3.0),
            "created_at": datetime.now().isoformat()
        }
        nodes_map[code] = node
        G.add_node(code)

    q = deque((code, recursive_depth, 0) for code in nodes_map.keys())  # Added depth counter
    pbar = tqdm(total=max_nodes, desc="Expanding topics")
    pbar.update(len(nodes_map))

    while q and len(nodes_map) < max_nodes:
        code, depth_remaining, current_depth = q.popleft()
        if code in processed or depth_remaining <= 0:
            continue
        processed.add(code)

        node = nodes_map[code]
        title = node["title"]
        subject = node["subject"]
        current_level = node["difficulty_level"]

        try:
            # Pass current depth to expand_topic
            expansion = expand_topic(title, subject, current_level, depth=current_depth + 1)
            
            node["objectives"] = expansion.get("objectives", node["objectives"])
            node["keywords"] = expansion.get("keywords", node["keywords"])
            node["estimated_hours"] = expansion.get("estimated_hours", node["estimated_hours"])
            
            # Use the difficulty level from expansion, don't force inheritance
            child_difficulty = expansion.get("difficulty_level", current_level)

            # Expand subtopics
            for sub_title in expansion.get("subtopics", []):
                if len(nodes_map) >= max_nodes:
                    break
                    
                sub_code = generate_code(subject, sub_title)
                if sub_code not in nodes_map:
                    nodes_map[sub_code] = {
                        "code": sub_code,
                        "subject": subject,
                        "title": sub_title,
                        "description": f"Subtopic of {title}",
                        "difficulty_level": child_difficulty,  # Use the assigned difficulty
                        "objectives": [],
                        "prerequisites": [code],
                        "next_topics": [],
                        "keywords": [],
                        "estimated_hours": max(1.0, expansion.get("estimated_hours", 2.0) * 0.7),
                        "created_at": datetime.now().isoformat()
                    }
                    G.add_node(sub_code)
                    q.append((sub_code, depth_remaining - 1, current_depth + 1))
                    pbar.update(1)
                
                if not G.has_edge(code, sub_code):
                    G.add_edge(code, sub_code, relationship="leads_to")

            # Expand prerequisites with appropriate difficulty levels
            for pre_title in expansion.get("prerequisites", []):
                if len(nodes_map) >= max_nodes:
                    break
                    
                pre_code = generate_code(subject, pre_title)
                if pre_code not in nodes_map:
                    # Prerequisites should generally be easier than current topic
                    pre_level_idx = max(0, DIFFICULTY_LEVELS.index(child_difficulty) - 1)
                    pre_level = DIFFICULTY_LEVELS[pre_level_idx]
                    
                    nodes_map[pre_code] = {
                        "code": pre_code,
                        "subject": subject,
                        "title": pre_title,
                        "description": f"Prerequisite for {title}",
                        "difficulty_level": pre_level,
                        "objectives": [],
                        "prerequisites": [],
                        "next_topics": [code],
                        "keywords": [],
                        "estimated_hours": 1.5,
                        "created_at": datetime.now().isoformat()
                    }
                    G.add_node(pre_code)
                    q.append((pre_code, depth_remaining - 1, current_depth + 1))
                    pbar.update(1)
                
                if not G.has_edge(pre_code, code):
                    G.add_edge(pre_code, code, relationship="prerequisite_for")

            time.sleep(1.2)  # Slightly reduced sleep time

        except Exception as e:
            print(f"\n⚠ Failed to expand '{title}': {e}")
            continue

    pbar.close()


    # Populate edges data back to nodes
    for node_code in G.nodes:
        nodes_map[node_code]["next_topics"] = [t for _, t in G.out_edges(node_code)]
        prereq_nodes = [
            p for p, _ in G.in_edges(node_code)
            if G.edges[p, node_code].get("relationship") == "prerequisite_for"
        ]
        if prereq_nodes:
            nodes_map[node_code]["prerequisites"] = list(
                set(nodes_map[node_code].get("prerequisites", []) + prereq_nodes)
            )

    # --- Automatically Remove Cycles ---
    if not nx.is_directed_acyclic_graph(G):
        print("\n⚠ WARNING: Graph contains cycles! Attempting to remove them automatically...")
        cycles = list(nx.simple_cycles(G))
        print(f"  Found {len(cycles)} cycle(s) — removing 1 edge from each to break cycles...")

        removed_edges = []
        for cycle in cycles:
            if len(cycle) > 1:
                # Remove the last edge in the cycle
                u, v = cycle[-1], cycle[0]
                if G.has_edge(u, v):
                    G.remove_edge(u, v)
                    removed_edges.append((u, v))
        print(f"✅ Removed {len(removed_edges)} edges to make graph acyclic.")

    if nx.is_directed_acyclic_graph(G):
        print("\n✓ Graph is now acyclic (DAG)")
    else:
        print("\n⚠ Still cyclic — manual inspection required.")

    # --- Stats and Saving ---
    print(f"\n{'='*60}")
    print("Knowledge Graph Statistics:")
    print(f"  Total Nodes: {len(nodes_map)}")
    print(f"  Total Edges: {G.number_of_edges()}")
    print(f"  Subjects: {set(n['subject'] for n in nodes_map.values())}")
    diff_dist = {}
    for node in nodes_map.values():
        lvl = node["difficulty_level"]
        diff_dist[lvl] = diff_dist.get(lvl, 0) + 1
    print("Difficulty Distribution:")
    for lvl in DIFFICULTY_LEVELS:
        print(f"    {lvl}: {diff_dist.get(lvl, 0)}")
    print(f"{'='*60}\n")

    final_nodes = list(nodes_map.values())
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_nodes, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved knowledge graph to: {OUT_FILE}")

    return G, final_nodes


