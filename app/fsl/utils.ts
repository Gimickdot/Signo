import * as tf from '@tensorflow/tfjs';

export interface LabelInfo {
  name: string;
  category: string;
  id: number;
}

// Define our labelmap for the 50 selected FSL classes
export const labelMap: Record<number, LabelInfo> = {
  1: { name: "GOOD MORNING", category: "GREETING", id: 0 },
  2: { name: "GOOD AFTERNOON", category: "GREETING", id: 1 },
  3: { name: "GOOD EVENING", category: "GREETING", id: 2 },
  4: { name: "HELLO", category: "GREETING", id: 3 },
  5: { name: "HOW ARE YOU", category: "GREETING", id: 4 },
  6: { name: "IM FINE", category: "GREETING", id: 5 },
  7: { name: "NICE TO MEET YOU", category: "GREETING", id: 6 },
  8: { name: "THANK YOU", category: "GREETING", id: 7 },
  9: { name: "YOURE WELCOME", category: "GREETING", id: 8 },
  10: { name: "SEE YOU TOMORROW", category: "GREETING", id: 9 },
  11: { name: "UNDERSTAND", category: "EVERYDAY", id: 10 },
  12: { name: "DON’T UNDERSTAND", category: "EVERYDAY", id: 11 },
  13: { name: "KNOW", category: "EVERYDAY", id: 12 },
  14: { name: "DON’T KNOW", category: "EVERYDAY", id: 13 },
  15: { name: "NO", category: "EVERYDAY", id: 14 },
  16: { name: "YES", category: "EVERYDAY", id: 15 },
  17: { name: "WRONG", category: "EVERYDAY", id: 16 },
  18: { name: "CORRECT", category: "EVERYDAY", id: 17 },
  19: { name: "SLOW", category: "EVERYDAY", id: 18 },
  20: { name: "FAST", category: "EVERYDAY", id: 19 },
  33: { name: "MONDAY", category: "DAYS", id: 42 },
  34: { name: "TUESDAY", category: "DAYS", id: 43 },
  35: { name: "WEDNESDAY", category: "DAYS", id: 44 },
  36: { name: "THURSDAY", category: "DAYS", id: 45 },
  37: { name: "FRIDAY", category: "DAYS", id: 46 },
  38: { name: "SATURDAY", category: "DAYS", id: 47 },
  39: { name: "SUNDAY", category: "DAYS", id: 48 },
  40: { name: "TODAY", category: "DAYS", id: 49 },
  41: { name: "TOMORROW", category: "DAYS", id: 50 },
  42: { name: "YESTERDAY", category: "DAYS", id: 51 },
  43: { name: "FATHER", category: "FAMILY", id: 52 },
  44: { name: "MOTHER", category: "FAMILY", id: 53 },
  45: { name: "SON", category: "FAMILY", id: 54 },
  46: { name: "DAUGHTER", category: "FAMILY", id: 55 },
  47: { name: "GRANDFATHER", category: "FAMILY", id: 56 },
  48: { name: "GRANDMOTHER", category: "FAMILY", id: 57 },
  49: { name: "UNCLE", category: "FAMILY", id: 58 },
  50: { name: "AUNTIE", category: "FAMILY", id: 59 },
};

// Define our labelmap for the 26 Alphabet classes (A-Z)
export const alphabetMap: Record<number, LabelInfo> = {
  1: { name: "A", category: "ALPHABET", id: 100 },
  2: { name: "B", category: "ALPHABET", id: 101 },
  3: { name: "C", category: "ALPHABET", id: 102 },
  4: { name: "D", category: "ALPHABET", id: 103 },
  5: { name: "E", category: "ALPHABET", id: 104 },
  6: { name: "F", category: "ALPHABET", id: 105 },
  7: { name: "G", category: "ALPHABET", id: 106 },
  8: { name: "H", category: "ALPHABET", id: 107 },
  9: { name: "I", category: "ALPHABET", id: 108 },
  10: { name: "J", category: "ALPHABET", id: 109 },
  11: { name: "K", category: "ALPHABET", id: 110 },
  12: { name: "L", category: "ALPHABET", id: 111 },
  13: { name: "M", category: "ALPHABET", id: 112 },
  14: { name: "N", category: "ALPHABET", id: 113 },
  15: { name: "O", category: "ALPHABET", id: 114 },
  16: { name: "P", category: "ALPHABET", id: 115 },
  17: { name: "Q", category: "ALPHABET", id: 116 },
  18: { name: "R", category: "ALPHABET", id: 117 },
  19: { name: "S", category: "ALPHABET", id: 118 },
  20: { name: "T", category: "ALPHABET", id: 119 },
  21: { name: "U", category: "ALPHABET", id: 120 },
  22: { name: "V", category: "ALPHABET", id: 121 },
  23: { name: "W", category: "ALPHABET", id: 122 },
  24: { name: "X", category: "ALPHABET", id: 123 },
  25: { name: "Y", category: "ALPHABET", id: 124 },
  26: { name: "Z", category: "ALPHABET", id: 125 },
};

export async function makePrediction(
  scores: tf.Tensor,
  threshold: number,
  videoWidth: number,
  videoHeight: number
): Promise<string> {
  const probabilities = await scores.data();
  const maxProbIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
  const maxProb = probabilities[maxProbIndex];
  
  if (maxProb > threshold) {
    const prediction = labelMap[maxProbIndex + 1]?.name || 'Unknown';
    return prediction;
  } else {
    return 'No confident prediction';
  }
}

export async function makeAlphabetPrediction(
  scores: tf.Tensor,
  threshold: number
): Promise<string> {
  const probabilities = await scores.data();
  const maxProbIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
  const maxProb = probabilities[maxProbIndex];
  
  if (maxProb > threshold) {
    const prediction = alphabetMap[maxProbIndex + 1]?.name || 'Unknown';
    return prediction;
  } else {
    return 'No confident prediction';
  }
}
