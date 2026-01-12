import requests
from dotenv import load_dotenv
import os
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
import json

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
maps_api_key = os.getenv("GOOGLE_MAPS_API_KEY")
groq_base_url = os.getenv("GROQ_BASE_URL")
places_url = os.getenv("PLACES_URL")
MAX_TOKENS = 200

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: make more aggressive user limiting, check by bearer token for auth etc

def groq_chat(messages, model="openai/gpt-oss-20b"):
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages
        # "max_completion_tokens": MAX_TOKENS
    }

    r = requests.post(groq_base_url, json=payload, headers=headers)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

def google_text_search(query, limit=5):
    r = requests.get(places_url, params={"query": query, "key": maps_api_key})
    r.raise_for_status()
    results = r.json().get("results", [])[:limit]
    simplified = []
    for res in results:
        simplified.append({
            "name": res.get("name"),
            "address": res.get("formatted_address"),
            "rating": res.get("rating"),
            "location": res.get("geometry", {}).get("location")
        })
    return simplified

# TODO: plan trip should also take in a user and pull existing prefs from db and upload them as well
@app.post("/lora/plan")
async def plan_trip(request: Request):
    body = await request.json()
    city = body.get("city")
    vibe = body.get("vibe") or body.get("interest") or "sightseeing"
    dates = body.get("dates")
    # uid = user.get("uid")

    if not city or not vibe:
        raise HTTPException(status_code=400, detail="Missing city or vibe")

    print(f"Received request: city={city}, vibe={vibe}")

    # step 1: parse out google places queries from the travel vibe and place
    try:
        google_query = groq_chat([
            {"role": "system", "content": "Turn a travel interest into a concise Google Places query. Only return the query."},
            {"role": "user", "content": f"Interest: {vibe} in {city}"}
        ]).strip()
        print("Generated Google query:", google_query)
    except Exception as e:
        print("Error generating Google query from Groq:", e)
        raise HTTPException(status_code=500, detail=f"Groq API failed: {e}")

    # step 2: call google places for top results
    try:
        places = google_text_search(f"{google_query} in {city}")
        print("Retrieved places:", places)
    except Exception as e:
        print("Error retrieving places from Google Places API:", e)
        raise HTTPException(status_code=500, detail=f"Google Places API failed: {e}")
    names = [p["name"] for p in places]

    # TODO: maybe consider doing a more detailed account of the places from here?

    try:
        itinerary = groq_chat([
            {"role": "system", "content": "Write a short 3-sentence itinerary using these POIs."},
            {"role": "assistant", "content": f"POIs: {names}"},
            {"role": "user", "content": "Create the itinerary."}
        ])
        print("Generated itinerary:", itinerary)
    except Exception as e:
        print("Error generating itinerary from Groq:", e)
        raise HTTPException(status_code=500, detail=f"Groq API failed (itinerary): {e}")

    return {
        "google_query": google_query,
        "places": places,
        "itinerary": itinerary
    }