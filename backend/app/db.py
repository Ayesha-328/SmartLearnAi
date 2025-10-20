# app/db.py
import os
from mongoengine import connect
from dotenv import load_dotenv

load_dotenv()

connect(
    db=os.getenv("DATABASE_NAME"),
    host=os.getenv("MONGODB_URI"),
)

# handy function to convert ObjectId to str (optional)
from bson import ObjectId
def oid_str(doc):
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    return doc
