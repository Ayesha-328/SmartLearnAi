# llm_client.py
import os
import requests
from dotenv import load_dotenv
import json

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")

def llm_call(prompt, max_tokens=800, parse_json=True):
    """
    Calls Groq Cloud API with a system + user prompt.
    Returns the model's textual response or parsed JSON.
    """
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set in .env")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are an educational assistant that helps create structured knowledge graphs for grade 9–12 science topics."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "response_format": {"type": "json_object"}  # This forces JSON output
    }

    try:
        r = requests.post(url, json=body, headers=headers, timeout=60)
        r.raise_for_status()
        j = r.json()
        content = j["choices"][0]["message"]["content"].strip()
        # print("LLM raw response:", content)
        
        # Clean the response
        txt = content.strip()
        if txt.startswith("```json"):
            txt = txt[7:]
        if txt.startswith("```"):
            txt = txt[3:]
        if txt.endswith("```"):
            txt = txt[:-3]
        txt = txt.strip()
        
        # Parse JSON
        data = json.loads(txt)
        print("LLM parsed data type:", type(data))
        
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to parse LLM response: {content}") from e

# # Alternative OpenRouter implementation (commented out)

# OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")


# def llm_call(prompt, max_tokens=800):
#     if not OPENROUTER_API_KEY:
#         raise RuntimeError("OPENROUTER_API_KEY not set in .env")
#     url = "https://openrouter.ai/api/v1/chat/completions"
#     headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
#     body = {
#         "model": OPENROUTER_MODEL,
#         "messages": [{"role":"system","content":"You are an educational curriculum assistant for students of grade 9 to 12 for science subjects."},
#                      {"role":"user","content": prompt}],
#         "max_tokens": max_tokens,
#         "temperature": 0.0
#     }
#     r = requests.post(url, json=body, headers=headers, timeout=60)
#     r.raise_for_status()
#     j = r.json()
#     # OpenRouter's response structure similar to OpenAI: pick content
#     try:
#         return j["choices"][0]["message"]["content"]
#     except Exception:
#         raise RuntimeError("Unexpected OpenRouter response: " + str(j))