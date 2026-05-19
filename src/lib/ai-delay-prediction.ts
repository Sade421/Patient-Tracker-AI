/**
 * Client-side delay risk prediction, translating the Python AI engine logic.
 * Uses a simplified logistic-like heuristic based on the same features:
 * triage_priority, visit_status, admission_hour, wait_time_minutes
 */

interface PredictionInput {
  triagePriorityScore: number; // 1 (red) to 4 (black)
  visitStatus: string; // "waiting" | "in_progress" | "completed"
  admissionHour: number; // 0-23
  waitTimeMinutes: number;
}

interface PredictionResult {
  delayProbability: number;
  riskLevel: "HIGH" | "LOW";
}

export function predictDocDelay(input: PredictionInput): PredictionResult {
  const { triagePriorityScore, visitStatus, admissionHour, waitTimeMinutes } = input;

  // Weighted score (mimicking model behavior)
  // Higher priority score = lower urgency = less delay risk from triage alone
  // But combined with long wait = higher risk
  const triageFactor = (5 - triagePriorityScore) / 4; // 1.0 for red, 0.25 for black
  const statusFactor = visitStatus === "in_progress" ? 0.3 : visitStatus === "waiting" ? 0.6 : 0.0;
  
  // Rush hours (7-9 AM, 5-8 PM) increase risk
  const isRushHour = (admissionHour >= 7 && admissionHour <= 9) || (admissionHour >= 17 && admissionHour <= 20);
  const hourFactor = isRushHour ? 0.2 : 0.05;

  // Wait time is the strongest predictor
  const waitFactor = Math.min(waitTimeMinutes / 180, 1.0); // saturates at 3 hours

  // Combine with weights
  const rawScore = triageFactor * 0.25 + statusFactor * 0.2 + hourFactor * 0.15 + waitFactor * 0.4;

  // Sigmoid-like squashing
  const probability = 1 / (1 + Math.exp(-8 * (rawScore - 0.45)));

  return {
    delayProbability: Math.round(probability * 100) / 100,
    riskLevel: probability > 0.7 ? "HIGH" : "LOW",
  };
}
