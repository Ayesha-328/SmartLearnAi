# app/main.py
from fastapi import FastAPI
# from app.routes import topics, students

app = FastAPI(title="SmartLearn API (MVP)")

# app.include_router(topics.router)
# app.include_router(students.router)

@app.get("/")
async def root():
    return {"status": "ok", "service": "SmartLearn Backend"}