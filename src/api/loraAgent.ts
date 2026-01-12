export async function planTrip(city: string, vibe: string, dates?: {start?:string,end?:string}) {
  const resp = await fetch("http://localhost:8000/lora/plan", {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
    },
    body: JSON.stringify({ city, vibe, dates })
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Agent error: ${resp.status} ${t}`);
  }
  return resp.json();
}
