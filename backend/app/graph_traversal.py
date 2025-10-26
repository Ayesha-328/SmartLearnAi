# app/graph_traversal.py
from app.models import KnowledgeGraphNode
from app.db import *


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

# Example usage and retrievals

if __name__ == "__main__":
    # Get all base-level Physics topics
    physics_base = get_topics_by_subject("Physics", "base")
    print("Base-level Physics topics:")
    for t in physics_base:
        print("-", t.title)

    # Get prerequisites of a topic
    prereqs = get_prerequisites("PHY_MECHANICS")
    print("\nPrerequisites for Mechanics:")
    for p in prereqs:
        print("-", p.title)

    # Get the full prerequisite chain (base → target)
    chain = get_full_prerequisite_chain("PHY_MECHANICS")
    print("\nFull chain:", " → ".join(chain))

    # Get next topics
    nexts = get_next_topics("PHY_BASE")
    print("\nNext topics after PHY_BASE:")
    for n in nexts:
        print("-", n.title)

    # Search by keyword
    res = search_topics("optics")
    print("\nTopics related to 'optics':")
    for r in res:
        print("-", r.title)
