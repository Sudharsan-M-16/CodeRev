import { fsrs, generatorParameters, Rating, State, Card } from 'ts-fsrs';

// FSRS Configuration
const params = generatorParameters({
  maximum_interval: 36500, // 100 years max
  request_retention: 0.9,  // 90% retention rate target
});
const f = fsrs(params);

/**
 * Utility to convert between our old 4-button outcome and FSRS Rating
 * FSRS Ratings: Again (1), Hard (2), Good (3), Easy (4)
 */
export function outcomeToFSRSRating(outcome: "NAILED" | "MOSTLY" | "STRUGGLED" | "BLOCKED"): Rating {
  switch (outcome) {
    case "NAILED": return Rating.Easy;
    case "MOSTLY": return Rating.Good;
    case "STRUGGLED": return Rating.Hard;
    case "BLOCKED": return Rating.Again;
    default: return Rating.Good;
  }
}

/**
 * Calculates the next FSRS scheduling state based on current state and user's rating.
 */
export function getNextFSRSState(
  currentCard: Partial<Card>,
  outcome: "NAILED" | "MOSTLY" | "STRUGGLED" | "BLOCKED",
  reviewDate: Date = new Date()
) {
  // If the card doesn't exist or doesn't have FSRS initialized, create a default New card
  const card: Card = {
    due: currentCard.due ?? new Date(),
    stability: currentCard.stability ?? 0,
    difficulty: currentCard.difficulty ?? 0,
    elapsed_days: currentCard.elapsed_days ?? 0,
    scheduled_days: currentCard.scheduled_days ?? 0,
    reps: currentCard.reps ?? 0,
    lapses: currentCard.lapses ?? 0,
    state: currentCard.state ?? State.New,
    last_review: currentCard.last_review,
    learning_steps: currentCard.learning_steps ?? 0,
  };

  const rating = outcomeToFSRSRating(outcome);
  
  // Calculate next states for all 4 possible ratings
  const schedulingCards = f.repeat(card, reviewDate);
  
  // Return the specific state for the chosen rating
  const nextRecord = (schedulingCards as any)[rating].card;

  return {
    nextDueAt: nextRecord.due,
    fsrsStability: nextRecord.stability,
    fsrsDifficulty: nextRecord.difficulty,
    fsrsReps: nextRecord.reps,
    fsrsLapses: nextRecord.lapses,
    fsrsState: nextRecord.state,
    intervalDays: nextRecord.scheduled_days,
  };
}
