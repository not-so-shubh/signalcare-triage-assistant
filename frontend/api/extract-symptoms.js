const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

function safeString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => safeString(item)).filter(Boolean))];
}

function safeBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function safeNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(10, Math.max(0, Math.trunc(numeric)));
}

function pickSymptomGroup(value) {
  const normalized = safeString(value)?.toLowerCase();
  if (["chest", "breathing", "headache", "abdominal", "fever", "other"].includes(normalized)) return normalized;
  return null;
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini response did not contain JSON.");
    return JSON.parse(match[0]);
  }
}

function normalizeGeminiExtraction(raw, input) {
  const presentingComplaint = raw.presentingComplaint ?? {};
  const associatedSymptoms = raw.associatedSymptoms ?? {};
  const riskFactors = raw.riskFactors ?? {};
  const activeSymptomGroup = pickSymptomGroup(raw.activeSymptomGroup);

  // Gemini output is deliberately narrowed to draft extraction fields only.
  // Urgency, red flags, emergency overrides, and provider safety copy are recomputed in the frontend.
  return {
    presentingComplaint: {
      primarySymptom: safeString(presentingComplaint.primarySymptom),
      onset: safeString(presentingComplaint.onset),
      duration: safeString(presentingComplaint.duration),
      severity0To10: safeNumber(presentingComplaint.severity0To10),
      location: safeString(presentingComplaint.location),
      character: safeString(presentingComplaint.character),
      progression: safeString(presentingComplaint.progression),
      triggers: safeStringArray(presentingComplaint.triggers),
      relievingFactors: safeStringArray(presentingComplaint.relievingFactors)
    },
    associatedSymptoms: {
      fever: safeBoolean(associatedSymptoms.fever),
      shortnessOfBreath: safeBoolean(associatedSymptoms.shortnessOfBreath),
      chestPain: safeBoolean(associatedSymptoms.chestPain),
      neurologicalSymptoms: safeStringArray(associatedSymptoms.neurologicalSymptoms),
      vomiting: safeBoolean(associatedSymptoms.vomiting),
      rash: safeBoolean(associatedSymptoms.rash),
      bleeding: safeBoolean(associatedSymptoms.bleeding),
      painRadiation: safeStringArray(associatedSymptoms.painRadiation),
      lossOfConsciousness: safeBoolean(associatedSymptoms.lossOfConsciousness),
      sweating: safeBoolean(associatedSymptoms.sweating),
      nausea: safeBoolean(associatedSymptoms.nausea),
      dizziness: safeBoolean(associatedSymptoms.dizziness),
      confusion: safeBoolean(associatedSymptoms.confusion)
    },
    riskFactors: {
      cardiacHistory: safeBoolean(riskFactors.cardiacHistory),
      strokeHistory: safeBoolean(riskFactors.strokeHistory),
      diabetes: safeBoolean(riskFactors.diabetes),
      immunosuppressed: safeBoolean(riskFactors.immunosuppressed),
      recentSurgery: safeBoolean(riskFactors.recentSurgery),
      recentTrauma: safeBoolean(riskFactors.recentTrauma),
      ageOver65: safeBoolean(riskFactors.ageOver65),
      infantOrChild: safeBoolean(riskFactors.infantOrChild)
    },
    activeSymptomGroup,
    freeTextNotes: safeString(raw.freeTextNotes) ?? "",
    deniedSymptoms: safeStringArray(raw.deniedSymptoms),
    emergencyClarification: safeStringArray(raw.emergencyClarification),
    aiExtraction: {
      sourceText: input,
      extractedAt: new Date().toISOString(),
      reviewed: false,
      confidenceNotes: [
        `Google Gemini (${GEMINI_MODEL}) structured this intake as draft data.`,
        "Deterministic SignalCare guardrails rerun after extraction and own urgency decisions."
      ]
    }
  };
}

function buildPrompt(input) {
  return [
    "You are SignalCare's symptom extraction layer. Extract patient language into draft structured triage fields.",
    "Do not diagnose. Do not decide urgency. Do not decide red flags. Do not recommend care level.",
    "Preserve explicit denials such as no weakness or no vision changes in deniedSymptoms instead of positive symptoms.",
    "Return only JSON with this shape:",
    JSON.stringify({
      activeSymptomGroup: "chest|breathing|headache|abdominal|fever|other|null",
      presentingComplaint: {
        primarySymptom: "string|null",
        onset: "string|null",
        duration: "string|null",
        severity0To10: "number|null",
        location: "string|null",
        character: "string|null",
        progression: "string|null",
        triggers: [],
        relievingFactors: []
      },
      associatedSymptoms: {
        fever: "boolean|null",
        shortnessOfBreath: "boolean|null",
        chestPain: "boolean|null",
        neurologicalSymptoms: [],
        vomiting: "boolean|null",
        rash: "boolean|null",
        bleeding: "boolean|null",
        painRadiation: [],
        lossOfConsciousness: "boolean|null",
        sweating: "boolean|null",
        nausea: "boolean|null",
        dizziness: "boolean|null",
        confusion: "boolean|null"
      },
      riskFactors: {
        cardiacHistory: "boolean|null",
        strokeHistory: "boolean|null",
        diabetes: "boolean|null",
        immunosuppressed: "boolean|null",
        recentSurgery: "boolean|null",
        recentTrauma: "boolean|null",
        ageOver65: "boolean|null",
        infantOrChild: "boolean|null"
      },
      deniedSymptoms: [],
      emergencyClarification: [],
      freeTextNotes: "string"
    }),
    `Patient text: ${input}`
  ].join("\n\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = typeof req.body?.input === "string" ? req.body.input.trim() : "";
  if (!input) return res.status(400).json({ error: "Missing input" });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      fallback: true,
      provider: "google-gemini",
      message: "GEMINI_API_KEY is not configured. Use the local deterministic extractor fallback."
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const message = await response.text();
      return res.status(502).json({ error: "Gemini extraction failed", detail: message.slice(0, 500) });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = extractJson(text);
    return res.status(200).json({
      provider: "google-gemini",
      model: GEMINI_MODEL,
      extraction: normalizeGeminiExtraction(parsed, input)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Gemini extraction error",
      detail: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
