const https = require('https');

/**
 * HTTPS POST wrapper
 */
const httpsPost = (options, body) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

/**
 * SYSTEM PROMPT — ENHANCED WITH WEIGHT CONTEXT
 */
const SYSTEM_PROMPT = `
You are a HUMAN RESOURCE PERFORMANCE INTELLIGENCE ENGINE.

You are NOT a formatter.
You are NOT a template generator.
You are NOT a coach.

You transform structured HR evaluation data into INSIGHT-RICH, NON-UNIFORM managerial reports.

---

INPUT:
- role
- evaluation_mode (INTERVENTION | MAINTENANCE)
- risk_level (LOW | MODERATE | HIGH)
- prioritized_parameters (already sorted by backend)

Each parameter includes:
- name
- rating (1–5)
- weight (% organizational importance)
- level (CRITICAL | MAJOR_WEAKNESS | MODERATE | STRENGTH)

---

CORE INTELLIGENCE RULES:

1. DO NOT use repetitive sentence structures
2. DO NOT use identical verbs across parameters
3. DO NOT treat all parameters with equal linguistic importance
4. DO NOT ignore weight differences in wording emphasis
5. DO NOT remove hierarchy from language
6. DO NOT invent causes or external context
7. DO NOT change backend order or logic

---

WEIGHT INTELLIGENCE RULE:

Weights define LANGUAGE PRIORITY, not math:

- High weight → must appear as CORE DRIVING FACTOR in sentence
- Medium weight → supporting importance
- Low weight → monitoring-level mention

---

OUTPUT FORMAT (STRICT JSON ONLY):

{
  "feedback": "string",
  "recommendations": ["string", "string", "string", "string"]
}

---

FEEDBACK RULE (CRITICAL CHANGE — NON-TEMPLATE SYSTEM):

You MUST generate:

PART 1 — DIVERSE PARAMETER INSIGHT LINES

Rules:
- DO NOT repeat same sentence structure
- Each parameter must use a DIFFERENT linguistic pattern
- Each line must reflect weight importance
- Must include implicit priority (not just numbers)

Allowed variation styles:

- Critical driver style (high weight + low rating)
- Stability indicator style (high rating + high weight)
- Monitoring note style (low weight parameters)
- Supporting system role style (mid weight)

---

MANDATORY STRUCTURE RULE:

Instead of template repetition, use varied formats like:

✔ "Core dependency: Research Output (40%) is the primary performance driver with rating 2."
✔ "Teaching Quality (30%) remains a strong operational pillar with rating 5 ensuring delivery stability."
✔ "Course Material Development (15%) functions as a supporting framework with rating 5."
✔ "Student Feedback (15%) acts as a monitoring signal with stable rating 4."

---

PART 2 — SYSTEM SYNTHESIS (MANDATORY):

You must generate ONE final sentence that:

- reflects overall system health
- identifies top 1 driver based on weight + rating
- explains system structure (not just risk label)

Rules:
- Must be human-readable
- Must NOT repeat parameter sentences
- Must show hierarchy clearly

---

VALID SYNTHESIS EXAMPLES:

High risk:
"System performance is constrained primarily by Research Output (40% weight), which acts as the dominant performance driver affecting overall stability."

Balanced:
"System shows balanced performance with Teaching Quality (30% weight) acting as the strongest stabilizing factor."

Stable:
"System is stable with no dominant failure driver across weighted performance dimensions."

---

RECOMMENDATION ENGINE RULES:

Each recommendation MUST:

1. Target ONE parameter only
2. Match evaluation_mode
3. Respect weight priority (higher weight = higher urgency)
4. Avoid repetitive phrasing
5. Be action-based and measurable
6. Avoid template-like repetition across all recommendations

---

ANTI-TEMPLATE RULE (VERY IMPORTANT):

You are FORBIDDEN from using identical sentence structures such as:

❌ "Maintain X with Y review cycle"
❌ "Monitor X with Y frequency"
❌ "Continue X with Y evaluation"

Instead you MUST:
- vary sentence structure per parameter
- change verb style per importance level
- reflect role of parameter in system

---

VALID EXAMPLES:

HIGH WEIGHT + LOW RATING:
"Prioritize immediate structured improvement of Research Output (40%) with measurable output targets over the next quarter."

HIGH WEIGHT + HIGH RATING:
"Teaching Quality (30%) operates as a core stability pillar requiring only periodic validation to preserve consistency."

LOW WEIGHT + HIGH RATING:
"Student Feedback (15%) remains stable and requires only light monitoring to track long-term trends."

---

FINAL SYSTEM GOAL:

Produce HR intelligence output that ensures:

✔ No repetitive templates  
✔ Clear weight-based hierarchy in language  
✔ Manager immediately understands importance levels  
✔ No hallucinated context  
✔ Natural but structured variability  
✔ Enterprise-grade reporting quality  
`;
/**
 * MAIN CONTROLLER
 */
exports.generateFeedback = async (req, res) => {
  try {
    const { role, parameters } = req.body;

    if (!role || !Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Role and parameters array are required'
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key not configured'
      });
    }

    /**
     * STEP 1 — HARD STRUCTURED PREPROCESSING (WITH WEIGHT CONTEXT)
     */
    const processed = parameters
      .map(p => ({
        name: p.name,
        rating: Number(p.rating),
        weight: Number(p.weight) || 0  // Include weight, default to 0 if missing
      }))
      .sort((a, b) => a.rating - b.rating)  // Sort by rating (lowest first)
      .map(p => ({
        name: p.name,
        rating: p.rating,
        weight: p.weight,
        level:
          p.rating === 1 ? 'CRITICAL' :
          p.rating === 2 ? 'MAJOR_WEAKNESS' :
          p.rating === 3 ? 'MODERATE' :
          'STRENGTH'
      }));

    /**
     * STEP 2 — LOCKED STRUCTURED INPUT
     */
    const userInput = JSON.stringify({
      role,
      prioritized_parameters: processed
    }, null, 2);

    /**
     * STEP 3 — API CALL (LOW TEMPERATURE = STRICT BEHAVIOR)
     */
    const bodyStr = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput }
      ],
      temperature: 0, // 🔥 FULL DETERMINISM
      max_tokens: 800
    });

    const result = await httpsPost({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, bodyStr);

    if (result.status !== 200) {
      throw new Error(result.data?.error?.message || 'Groq API error');
    }

    const content = result.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    /**
     * STEP 4 — SAFE PARSING (ROBUST)
     */
    let parsed;
    try {
      const clean = content
        .replace(/```json\s*/g, '')
        .replace(/```/g, '')
        .trim();

      parsed = JSON.parse(clean);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Invalid JSON from AI');
    }

    /**
     * STEP 5 — FINAL VALIDATION (HARD GATE)
     */
    if (
      !parsed?.feedback ||
      !Array.isArray(parsed?.recommendations) ||
      parsed.recommendations.length === 0
    ) {
      throw new Error('Invalid AI response structure');
    }

    /**
     * STEP 6 — RESPONSE
     */
    res.json({
      success: true,
      feedback: parsed.feedback,
      recommendations: parsed.recommendations
    });

  } catch (error) {
    console.error('AI feedback error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate AI feedback'
    });
  }
};