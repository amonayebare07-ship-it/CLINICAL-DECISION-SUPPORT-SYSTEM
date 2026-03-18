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
Always respond in valid JSON:
{
  "suggested_diagnoses": [{"name": "...", "confidence": "high|medium|low", "reasoning": "...", "medications": [{"name": "...", "description": "...", "dosage": "..."}]}],
  "recommended_tests": ["..."],
  "red_flags": ["..."],
  "triage_level": "emergency|urgent|routine",
  "symptomatic_relief": [{"symptom": "...", "medication": "...", "dosage": "...", "reasoning": "..."}],
  "follow_up_date": "YYYY-MM-DD",
  "additional_notes": "..."
}
Limit to top 3-5 most likely diagnoses. For EACH diagnosis, you MUST provide at least one recommended medication in the "medications" array. If no specific prescription is needed, suggest over-the-counter relief (e.g., Paracetamol, Oral Rehydration Salts). Also provide specific symptomatic relief for each individual symptom reported. Consider the patient's medical history and conditions. Provide a suggested follow-up date (e.g., 7 days from today) in YYYY-MM-DD format (use 2026-03-25 as today's date context). Provide clinical pearls or additional notes in "additional_notes". Use only valid JSON.`;

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
  "medications": [{"name": "...", "description": "...", "dosage": "...", "frequency": "...", "duration": "...", "notes": "..."}],
  "lifestyle_advice": ["..."],
  "follow_up": "...",
  "follow_up_date": "YYYY-MM-DD",
  "when_to_refer": "...",
  "additional_notes": "..."
}
Consider patient allergies and conditions when recommending medications. Provide a suggested follow-up date (e.g., 7 days from today) in YYYY-MM-DD format (use 2026-03-25 as today's date context). Provide clinical pearls or additional notes in "additional_notes".`;

      userPrompt = `Diagnosis: ${diagnosis || "Not specified (base on symptoms)"}
Symptoms: ${symptoms || "Not specified"}
${patient_allergies?.length ? `\nPatient allergies: ${patient_allergies.join(", ")}` : ""}
${patient_conditions?.length ? `\nChronic conditions: ${patient_conditions.join(", ")}` : ""}
${current_medications?.length ? `\nCurrently taking: ${current_medications.join(", ")}` : ""}

Recommend appropriate treatment for a university sick bay setting. If diagnosis is missing or unclear, base your recommendations on the provided symptoms and potential differential diagnoses.`;

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

    } else if (action === "voice_analyze") {
      systemPrompt = `You are an expert Medical AI Assistant for Bishop Barham University College Sick Bay.
You will be provided with a transcript of a doctor speaking about a patient.
Your task is to:
1. Extract and refine the symptoms mentioned.
2. Provide a list of top 3-5 possible diagnoses with reasoning.
3. Recommend specific treatments and medications for each.
4. Check for alerts based on patient history.
5. Provide a follow-up date and additional notes.

Always respond in valid JSON:
{
  "refined_symptoms": "...",
  "analysis": {
    "suggested_diagnoses": [{"name": "...", "confidence": "high|medium|low", "reasoning": "...", "medications": [{"name": "...", "description": "...", "dosage": "..."}]}],
    "recommended_tests": ["..."],
    "red_flags": ["..."],
    "triage_level": "emergency|urgent|routine",
    "follow_up_date": "YYYY-MM-DD",
    "additional_notes": "..."
  },
  "treatment": {
    "treatment_plan": [{"treatment": "...", "details": "...", "duration": "..."}],
    "medications": [{"name": "...", "description": "...", "dosage": "...", "frequency": "...", "duration": "...", "notes": "..."}],
    "lifestyle_advice": ["..."],
    "when_to_refer": "...",
    "follow_up_date": "YYYY-MM-DD",
    "additional_notes": "..."
  }
}
Keep recommendations appropriate for a university clinic setting. Use 2026-03-25 as today's date context for the follow-up date.`;

      userPrompt = `Doctor's Transcript: "${symptoms}" (Note: the input transcript might have speech-to-text errors)
Patient History:
${patient_allergies?.length ? `\n- Allergies: ${patient_allergies.join(", ")}` : ""}
${patient_conditions?.length ? `\n- Chronic Conditions: ${patient_conditions.join(", ")}` : ""}
${medical_history ? `\n- Medical History Summary: ${medical_history}` : ""}
${current_medications?.length ? `\n- Current Medications: ${current_medications.join(", ")}` : ""}

Process the transcript and provide a comprehensive clinical analysis.`;

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
