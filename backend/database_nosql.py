from pymongo import MongoClient
from datetime import datetime
import os

# Falls back to local instance if MONGO_URI isn't defined in your backend .env file
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)
db = client["purradvisor_saas"]
chat_collection = db["chat_streams"]

def save_chat_session(token_id: str, message_history: list):
    """Upserts the elastic polymorphic conversational stream document inside MongoDB."""
    chat_collection.update_one(
        {"token_id": token_id.upper()},
        {
            "$set": {
                "messages": message_history,
                "last_updated": datetime.now().isoformat()
            }
        },
        upsert=True
    )

def fetch_chat_session(token_id: str):
    """Retrieves unstructured historical messages for a given session token."""
    doc = chat_collection.find_one({"token_id": token_id.upper()})
    if doc:
        return doc.get("messages", [])
    return []