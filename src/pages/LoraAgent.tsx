import React, { useState } from "react";
import { planTrip } from "../api/loraAgent";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

export default function LoraAgent({ onShowTrip }: { onShowTrip?: (trip:any)=>void }) {
  const [city, setCity] = useState("");
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function onPlan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await planTrip(city, vibe);
      setResult(r);
      if (onShowTrip) onShowTrip(r);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center parchment-texture">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
        <div className="space-y-6">
      <form className="bg-parchment p-8 rounded-xl shadow-lg border border-gold/20 max-w-sm w-full">
        <h3 className="text-xl text-deepbrown mb-6 text-center">AI Trip Planner</h3>
        <input
          className="w-full mb-4 p-3 rounded-lg border border-gold/30 bg-parchment-dark text-deepbrown"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="w-full mb-4 p-3 rounded-lg border border-gold/30 bg-parchment-dark text-deepbrown"
          placeholder="Vibe"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
        />
        <Button 
          type="submit"
          onClick={onPlan} 
          className="w-full mb-3" 
          disabled={loading}
        >{loading?"Planning...":"Plan Trip"}</Button>
      </form>

      {result && (
        <div className="mt-8 bg-parchment p-6 rounded-xl shadow-lg border border-gold/20 max-w-xl w-full">
            
            <p className="text-sm text-deepbrown/70 mb-2">
            Search Focus
            </p>
            <h4 className="text-lg font-semibold text-deepbrown mb-4">
            {result.google_query}
            </h4>

            <p className="text-sm text-deepbrown/70 mb-1">
            Suggested Itinerary
            </p>
            <p className="text-deepbrown mb-6 leading-relaxed">
            {result.itinerary}
            </p>

            <p className="text-sm text-deepbrown/70 mb-3">
            Top Places
            </p>

            <ul className="space-y-3">
            {result.places.map((place: any, idx: number) => (
                <li
                key={idx}
                className="p-4 rounded-lg bg-parchment-dark border border-gold/10"
                >
                <div className="flex justify-between items-start">
                    <div>
                    <h5 className="font-medium text-deepbrown">
                        {place.name}
                    </h5>
                    <p className="text-xs text-deepbrown/70">
                        {place.address}
                    </p>
                    </div>

                    {place.rating && (
                    <span className="text-sm font-semibold text-gold">
                        ⭐ {place.rating}
                    </span>
                    )}
                </div>
                </li>
            ))}
            </ul>
        </div>
      )}
      </div>
      </main>
    </div>
  );
}
