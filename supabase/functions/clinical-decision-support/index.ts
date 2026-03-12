import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { action, symptoms, diagnosis, patient_allergies, patient_conditions, current_medications, medical_history, prescription } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "analyze_symptoms") {
      systemPrompt = `You are a Clinical Decision Support System (CDSS) for a university sick bay at Bishop Barham University College. 
You help medical staff analyze patient symptoms and suggest possible diagnoses. 
You are NOT a replacement for clinical judgment — you provide decision support only.
Always respond in valid JSON with this structure:
{
  "suggested_diagnoses": [{"name": "...", "confidence": "high|medium|low", "reasoning": "..."}],
  "recommended_tests": ["..."],
  "red_flags": ["..."],
  "triage_level": "emergency|urgent|routine"
}
Limit to top 3-5 most likely diagnoses. Consider the patient's medical history and conditions.`;

      userPrompt = `Patient presents with the following symptoms: ${symptoms}
${patient_conditions?.length ? `\nKnown chronic conditions: ${patient_conditions.join(", ")}` : ""}
${medical_history ? `\nRecent medical history: ${medical_history}` : ""}
${patient_allergies?.length ? `\nKnown allergies: ${patient_allergies.join(", ")}` : ""}

Analyze and suggest possible diagnoses.`;

    } else if (action === "recommend_treatment") {
      systemPrompt = `You are a Clinical Decision Support System (CDSS) for a university sick bay.
Based on a diagnosis, suggest treatment options appropriate for a university clinic setting.
Always respond in valid JSON:
{
  "treatment_plan": [{"treatment": "...", "details": "...", "duration": "..."}],
  "medications": [{"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "notes": "..."}],
  "lifestyle_advice": ["..."],
  "follow_up": "...",
  "when_to_refer": "..."
}
Consider patient allergies and conditions when recommending medications.`;

      userPrompt = `Diagnosis: ${diagnosis}
Symptoms: ${symptoms || "Not specified"}
${patient_allergies?.length ? `\nPatient allergies: ${patient_allergies.join(", ")}` : ""}
${patient_conditions?.length ? `\nChronic conditions: ${patient_conditions.join(", ")}` : ""}
${current_medications?.length ? `\nCurrently taking: ${current_medications.join(", ")}` : ""}

Recommend appropriate treatment for a university sick bay setting.`;

    } else if (action === "check_drug_interactions") {
      systemPrompt = `You are a drug interaction and allergy checker for a Clinical Decision Support System.
Check for potential drug interactions, contraindications, and allergy conflicts.
Always respond in valid JSON:
{
  "alerts": [{"type": "interaction|allergy|contraindication", "severity": "high|medium|low", "drug": "...", "message": "...", "recommendation": "..."}],
  "safe_to_prescribe": true|false,
  "summary": "..."
}`;

      userPrompt = `Check for drug interactions and allergy conflicts:
Prescribed medications: ${prescription}
${patient_allergies?.length ? `\nPatient allergies: ${patient_allergies.join(", ")}` : "No known allergies"}
${patient_conditions?.length ? `\nChronic conditions: ${patient_conditions.join(", ")}` : "No known conditions"}
${current_medications?.length ? `\nCurrently taking: ${current_medications.join(", ")}` : "No current medications"}`;

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ result: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("CDSS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
