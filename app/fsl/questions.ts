export interface GameQuestion {
  id: number;
  category: string;
  situation: string;
  options: {
    A: { signName: string; signId: number };
    B: { signName: string; signId: number };
    C: { signName: string; signId: number };
  };
  correctAnswer: 'A' | 'B' | 'C';
  image?: string;
  requiredExpression?: 'happy' | 'sad' | 'neutral' | 'angry';
}

export const gameQuestions: GameQuestion[] = [
  {
    "id": 54,
    "category": "EVERYDAY",
    "situation": "Your sister guesses your favorite color correctly. What is that?",
    "options": {
      "A": {
        "signName": "THANK YOU",
        "signId": 7
      },
      "B": {
        "signName": "CORRECT",
        "signId": 17
      },
      "C": {
        "signName": "AUNTIE",
        "signId": 59
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q1.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 3,
    "category": "GREETING",
    "situation": "The sun is coming up and you eat breakfast. What do you say?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "C": {
        "signName": "GOOD MORNING",
        "signId": 0
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q2.jpg"
  },
  {
    "id": 27,
    "category": "GREETING",
    "situation": "You share your crayon and friend says thanks. What do you say?",
    "options": {
      "A": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "B": {
        "signName": "WRONG",
        "signId": 16
      },
      "C": {
        "signName": "GRANDFATHER",
        "signId": 56
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q3.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 2,
    "category": "GREETING",
    "situation": "You go to school early and see your teacher. What do you say?",
    "options": {
      "A": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "B": {
        "signName": "SLOW",
        "signId": 18
      },
      "C": {
        "signName": "GOOD MORNING",
        "signId": 0
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q4.jpg"
  },
  {
    "id": 29,
    "category": "GREETING",
    "situation": "You wave goodbye to your friend after playing. What do you say?",
    "options": {
      "A": {
        "signName": "IM FINE",
        "signId": 5
      },
      "B": {
        "signName": "GRANDMOTHER",
        "signId": 57
      },
      "C": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q5.jpg"
  },
  {
    "id": 6,
    "category": "GREETING",
    "situation": "It is 2 o'clock and you see the principal. What do you say?",
    "options": {
      "A": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "B": {
        "signName": "TOMORROW",
        "signId": 50
      },
      "C": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q6.jpg"
  },
  {
    "id": 37,
    "category": "EVERYDAY",
    "situation": "Teacher asks who has the right answer, and you have it. What do you say?",
    "options": {
      "A": {
        "signName": "KNOW",
        "signId": 12
      },
      "B": {
        "signName": "UNCLE",
        "signId": 58
      },
      "C": {
        "signName": "GRANDFATHER",
        "signId": 56
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q7.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 9,
    "category": "GREETING",
    "situation": "You watch stars in the sky and see your neighbor. What do you say?",
    "options": {
      "A": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "B": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "C": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q8.jpg"
  },
  {
    "id": 34,
    "category": "EVERYDAY",
    "situation": "The game is too hard and you are confused. What do you say?",
    "options": {
      "A": {
        "signName": "FATHER",
        "signId": 52
      },
      "B": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "C": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q9.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 14,
    "category": "GREETING",
    "situation": "You see your grandma and want to know she is okay. What do you ask?",
    "options": {
      "A": {
        "signName": "HOW ARE YOU",
        "signId": 4
      },
      "B": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      },
      "C": {
        "signName": "AUNTIE",
        "signId": 59
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q10.jpg"
  },
  {
    "id": 43,
    "category": "EVERYDAY",
    "situation": "Your friend asks if you want to eat a bug. What do you say?",
    "options": {
      "A": {
        "signName": "NO",
        "signId": 14
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "MONDAY",
        "signId": 42
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q11.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 4,
    "category": "GREETING",
    "situation": "You see your friend after lunch. What do you say?",
    "options": {
      "A": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "B": {
        "signName": "TODAY",
        "signId": 49
      },
      "C": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q12.jpg"
  },
  {
    "id": 21,
    "category": "GREETING",
    "situation": "You meet your new piano teacher. What do you say?",
    "options": {
      "A": {
        "signName": "NICE TO MEET YOU",
        "signId": 6
      },
      "B": {
        "signName": "HELLO",
        "signId": 3
      },
      "C": {
        "signName": "FRIDAY",
        "signId": 46
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q13.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 22,
    "category": "GREETING",
    "situation": "Your friend gives you a toy. What do you say?",
    "options": {
      "A": {
        "signName": "KNOW",
        "signId": 12
      },
      "B": {
        "signName": "WRONG",
        "signId": 16
      },
      "C": {
        "signName": "THANK YOU",
        "signId": 7
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q14.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 53,
    "category": "EVERYDAY",
    "situation": "Teacher says 2 plus 2 is 4. What is that?",
    "options": {
      "A": {
        "signName": "CORRECT",
        "signId": 17
      },
      "B": {
        "signName": "DAUGHTER",
        "signId": 55
      },
      "C": {
        "signName": "SUNDAY",
        "signId": 48
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q15.jpg"
  },
  {
    "id": 85,
    "category": "DAYS",
    "situation": "What day was it before you went to sleep last night?",
    "options": {
      "A": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "B": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "C": {
        "signName": "YESTERDAY",
        "signId": 51
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q16.jpg"
  },
  {
    "id": 78,
    "category": "DAYS",
    "situation": "What is the last day of the weekend?",
    "options": {
      "A": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "B": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "C": {
        "signName": "MONDAY",
        "signId": 42
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q17.jpg"
  },
  {
    "id": 61,
    "category": "DAYS",
    "situation": "What is the first day of school every week?",
    "options": {
      "A": {
        "signName": "MONDAY",
        "signId": 42
      },
      "B": {
        "signName": "YES",
        "signId": 15
      },
      "C": {
        "signName": "SON",
        "signId": 54
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q18.jpg"
  },
  {
    "id": 87,
    "category": "FAMILY",
    "situation": "What do you call the man who is your parent?",
    "options": {
      "A": {
        "signName": "WEDNESDAY",
        "signId": 44
      },
      "B": {
        "signName": "NO",
        "signId": 14
      },
      "C": {
        "signName": "FATHER",
        "signId": 52
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q19.jpg"
  },
  {
    "id": 96,
    "category": "FAMILY",
    "situation": "What do you call your mom's mom?",
    "options": {
      "A": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "B": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "C": {
        "signName": "GRANDMOTHER",
        "signId": 57
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q20.jpg"
  },
  {
    "id": 82,
    "category": "DAYS",
    "situation": "What do you call the next day that is coming?",
    "options": {
      "A": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "B": {
        "signName": "SON",
        "signId": 54
      },
      "C": {
        "signName": "TOMORROW",
        "signId": 50
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q21.png"
  },
  {
    "id": 88,
    "category": "FAMILY",
    "situation": "Who is the mom in your family?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "C": {
        "signName": "MOTHER",
        "signId": 53
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q22.png"
  },
  {
    "id": 83,
    "category": "DAYS",
    "situation": "If you sleep and wake up, what day is it?",
    "options": {
      "A": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "TOMORROW",
        "signId": 50
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q23.png"
  },
  {
    "id": 16,
    "category": "GREETING",
    "situation": "Teacher asks how you are feeling, and you feel good. What do you say?",
    "options": {
      "A": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "B": {
        "signName": "DAUGHTER",
        "signId": 55
      },
      "C": {
        "signName": "IM FINE",
        "signId": 5
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q24.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 48,
    "category": "EVERYDAY",
    "situation": "Do you want to read a fun book? What do you say?",
    "options": {
      "A": {
        "signName": "YESTERDAY",
        "signId": 51
      },
      "B": {
        "signName": "YES",
        "signId": 15
      },
      "C": {
        "signName": "NO",
        "signId": 14
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q25.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 30,
    "category": "GREETING",
    "situation": "You leave the park to go sleep soon. What do you say?",
    "options": {
      "A": {
        "signName": "HOW ARE YOU",
        "signId": 4
      },
      "B": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "C": {
        "signName": "GOOD MORNING",
        "signId": 0
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q26.jpg"
  },
  {
    "id": 31,
    "category": "EVERYDAY",
    "situation": "Teacher shows you how to play a game, and you know how to do it. What do you say?",
    "options": {
      "A": {
        "signName": "FAST",
        "signId": 19
      },
      "B": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "C": {
        "signName": "UNDERSTAND",
        "signId": 10
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q27.jpg"
  },
  {
    "id": 42,
    "category": "EVERYDAY",
    "situation": "Friend asks you a riddle, but you cannot guess. What do you say?",
    "options": {
      "A": {
        "signName": "DON’T KNOW",
        "signId": 13
      },
      "B": {
        "signName": "DAUGHTER",
        "signId": 55
      },
      "C": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q28.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 32,
    "category": "EVERYDAY",
    "situation": "Your dad tells you the rules, and you get it. What do you say?",
    "options": {
      "A": {
        "signName": "UNDERSTAND",
        "signId": 10
      },
      "B": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "C": {
        "signName": "SUNDAY",
        "signId": 48
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q29.jpg"
  },
  {
    "id": 97,
    "category": "FAMILY",
    "situation": "Who is your grandma?",
    "options": {
      "A": {
        "signName": "HELLO",
        "signId": 3
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "GRANDMOTHER",
        "signId": 57
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q30.jpg"
  },
  {
    "id": 51,
    "category": "EVERYDAY",
    "situation": "Your brother puts his shoes on his hands. What is that?",
    "options": {
      "A": {
        "signName": "WRONG",
        "signId": 16
      },
      "B": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "C": {
        "signName": "WEDNESDAY",
        "signId": 44
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q31.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 28,
    "category": "GREETING",
    "situation": "School is over and you are going home. What do you say?",
    "options": {
      "A": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "B": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "C": {
        "signName": "TOMORROW",
        "signId": 50
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q32.jpg"
  },
  {
    "id": 20,
    "category": "GREETING",
    "situation": "Your teacher introduces a new friend. What do you say?",
    "options": {
      "A": {
        "signName": "NICE TO MEET YOU",
        "signId": 6
      },
      "B": {
        "signName": "TOMORROW",
        "signId": 50
      },
      "C": {
        "signName": "HOW ARE YOU",
        "signId": 4
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q33.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 67,
    "category": "DAYS",
    "situation": "What is the middle day of the school week?",
    "options": {
      "A": {
        "signName": "WEDNESDAY",
        "signId": 44
      },
      "B": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      },
      "C": {
        "signName": "MOTHER",
        "signId": 53
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q34.jpg"
  },
  {
    "id": 76,
    "category": "DAYS",
    "situation": "What is the first day of the weekend when there is no school?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "WRONG",
        "signId": 16
      },
      "C": {
        "signName": "DAUGHTER",
        "signId": 55
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q35.jpg"
  },
  {
    "id": 92,
    "category": "FAMILY",
    "situation": "What does a mom call her girl child?",
    "options": {
      "A": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      },
      "B": {
        "signName": "UNCLE",
        "signId": 58
      },
      "C": {
        "signName": "DAUGHTER",
        "signId": 55
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q36.jpg"
  },
  {
    "id": 52,
    "category": "EVERYDAY",
    "situation": "Your friend says the sky is blue. What is that?",
    "options": {
      "A": {
        "signName": "CORRECT",
        "signId": 17
      },
      "B": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "C": {
        "signName": "FAST",
        "signId": 19
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q37.jpg"
  },
  {
    "id": 73,
    "category": "DAYS",
    "situation": "What is the last day of school before the weekend?",
    "options": {
      "A": {
        "signName": "TOMORROW",
        "signId": 50
      },
      "B": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "C": {
        "signName": "FRIDAY",
        "signId": 46
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q38.jpg"
  },
  {
    "id": 71,
    "category": "DAYS",
    "situation": "The day right before Friday is what?",
    "options": {
      "A": {
        "signName": "THURSDAY",
        "signId": 45
      },
      "B": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "C": {
        "signName": "THANK YOU",
        "signId": 7
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q39.jpg"
  },
  {
    "id": 64,
    "category": "DAYS",
    "situation": "What day comes right after Monday?",
    "options": {
      "A": {
        "signName": "DAUGHTER",
        "signId": 55
      },
      "B": {
        "signName": "NO",
        "signId": 14
      },
      "C": {
        "signName": "TUESDAY",
        "signId": 43
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q40.jpg"
  },
  {
    "id": 75,
    "category": "DAYS",
    "situation": "The day we have fun Friday is what?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "YES",
        "signId": 15
      },
      "C": {
        "signName": "FRIDAY",
        "signId": 46
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q41.jpg"
  },
  {
    "id": 41,
    "category": "EVERYDAY",
    "situation": "Your mom asks where the toy is, but you did not see it. What do you say?",
    "options": {
      "A": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "B": {
        "signName": "THANK YOU",
        "signId": 7
      },
      "C": {
        "signName": "DON’T KNOW",
        "signId": 13
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q42.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 55,
    "category": "EVERYDAY",
    "situation": "A turtle walks very, very ___. What is the word?",
    "options": {
      "A": {
        "signName": "SLOW",
        "signId": 18
      },
      "B": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "C": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q43.jpg"
  },
  {
    "id": 65,
    "category": "DAYS",
    "situation": "The second day of school is called what?",
    "options": {
      "A": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      },
      "B": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "C": {
        "signName": "GRANDFATHER",
        "signId": 56
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q44.jpg"
  },
  {
    "id": 77,
    "category": "DAYS",
    "situation": "What day comes right after Friday?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "UNCLE",
        "signId": 58
      },
      "C": {
        "signName": "FAST",
        "signId": 19
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q45.jpg"
  },
  {
    "id": 10,
    "category": "GREETING",
    "situation": "You meet a new friend at play time. What do you say?",
    "options": {
      "A": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "B": {
        "signName": "IM FINE",
        "signId": 5
      },
      "C": {
        "signName": "HELLO",
        "signId": 3
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q46.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 18,
    "category": "GREETING",
    "situation": "You got a band-aid and mommy asks how you feel. What do you say?",
    "options": {
      "A": {
        "signName": "IM FINE",
        "signId": 5
      },
      "B": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "C": {
        "signName": "YES",
        "signId": 15
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q47.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 33,
    "category": "EVERYDAY",
    "situation": "Mom explains the math homework, and it makes sense. What do you say?",
    "options": {
      "A": {
        "signName": "UNDERSTAND",
        "signId": 10
      },
      "B": {
        "signName": "TOMORROW",
        "signId": 50
      },
      "C": {
        "signName": "KNOW",
        "signId": 12
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q48.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 91,
    "category": "FAMILY",
    "situation": "If you are a boy, you are your parents' ___.",
    "options": {
      "A": {
        "signName": "SON",
        "signId": 54
      },
      "B": {
        "signName": "NO",
        "signId": 14
      },
      "C": {
        "signName": "MONDAY",
        "signId": 42
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q49.jpg"
  },
  {
    "id": 66,
    "category": "DAYS",
    "situation": "The day before Wednesday is what?",
    "options": {
      "A": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "B": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "C": {
        "signName": "THANK YOU",
        "signId": 7
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q50.jpg"
  },
  {
    "id": 63,
    "category": "DAYS",
    "situation": "The day we start the new school week is what?",
    "options": {
      "A": {
        "signName": "MONDAY",
        "signId": 42
      },
      "B": {
        "signName": "SLOW",
        "signId": 18
      },
      "C": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q51.jpg"
  },
  {
    "id": 39,
    "category": "EVERYDAY",
    "situation": "Dad asks if you remember the dog's name, and you do. What do you say?",
    "options": {
      "A": {
        "signName": "MOTHER",
        "signId": 53
      },
      "B": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "C": {
        "signName": "KNOW",
        "signId": 12
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q52.jpg"
  },
  {
    "id": 13,
    "category": "GREETING",
    "situation": "You want to ask your friend if they are happy today. What do you say?",
    "options": {
      "A": {
        "signName": "HOW ARE YOU",
        "signId": 4
      },
      "B": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "C": {
        "signName": "WRONG",
        "signId": 16
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q53.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 79,
    "category": "DAYS",
    "situation": "What day comes right before Monday?",
    "options": {
      "A": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "B": {
        "signName": "CORRECT",
        "signId": 17
      },
      "C": {
        "signName": "KNOW",
        "signId": 12
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q54.jpg"
  },
  {
    "id": 70,
    "category": "DAYS",
    "situation": "What day comes right after Wednesday?",
    "options": {
      "A": {
        "signName": "WRONG",
        "signId": 16
      },
      "B": {
        "signName": "IM FINE",
        "signId": 5
      },
      "C": {
        "signName": "THURSDAY",
        "signId": 45
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q55.jpg"
  },
  {
    "id": 90,
    "category": "FAMILY",
    "situation": "What does a mom call her boy child?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "C": {
        "signName": "SON",
        "signId": 54
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q56.jpg"
  },
  {
    "id": 59,
    "category": "EVERYDAY",
    "situation": "A rocket goes up very ___. What is the word?",
    "options": {
      "A": {
        "signName": "WEDNESDAY",
        "signId": 44
      },
      "B": {
        "signName": "WRONG",
        "signId": 16
      },
      "C": {
        "signName": "FAST",
        "signId": 19
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q57.jpg"
  },
  {
    "id": 8,
    "category": "GREETING",
    "situation": "It is dark outside and you see your dad. What do you say?",
    "options": {
      "A": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "B": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "C": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q58.jpg"
  },
  {
    "id": 15,
    "category": "GREETING",
    "situation": "Your friend was sick but now is back. What do you ask?",
    "options": {
      "A": {
        "signName": "DON’T KNOW",
        "signId": 13
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "HOW ARE YOU",
        "signId": 4
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q59.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 60,
    "category": "EVERYDAY",
    "situation": "A race car drives very ___. What is the word?",
    "options": {
      "A": {
        "signName": "FAST",
        "signId": 19
      },
      "B": {
        "signName": "MONDAY",
        "signId": 42
      },
      "C": {
        "signName": "MOTHER",
        "signId": 53
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q60.jpg"
  },
  {
    "id": 7,
    "category": "GREETING",
    "situation": "The sun goes down and you eat dinner. What do you say?",
    "options": {
      "A": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "B": {
        "signName": "HOW ARE YOU",
        "signId": 4
      },
      "C": {
        "signName": "HELLO",
        "signId": 3
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q61.jpg"
  },
  {
    "id": 5,
    "category": "GREETING",
    "situation": "You walk into class after eating. What do you say?",
    "options": {
      "A": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      },
      "B": {
        "signName": "YES",
        "signId": 15
      },
      "C": {
        "signName": "THURSDAY",
        "signId": 45
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q62.jpg"
  },
  {
    "id": 38,
    "category": "EVERYDAY",
    "situation": "Your friend asks if you know the song, and you do. What do you say?",
    "options": {
      "A": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "B": {
        "signName": "KNOW",
        "signId": 12
      },
      "C": {
        "signName": "SLOW",
        "signId": 18
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q63.jpg"
  },
  {
    "id": 50,
    "category": "EVERYDAY",
    "situation": "Someone calls you by a bad name. What do you say?",
    "options": {
      "A": {
        "signName": "WRONG",
        "signId": 16
      },
      "B": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "C": {
        "signName": "THURSDAY",
        "signId": 45
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q64.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 98,
    "category": "FAMILY",
    "situation": "What do you call the brother of your mom or dad?",
    "options": {
      "A": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "B": {
        "signName": "UNCLE",
        "signId": 58
      },
      "C": {
        "signName": "FAST",
        "signId": 19
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q65.jpg"
  },
  {
    "id": 24,
    "category": "GREETING",
    "situation": "Someone opens the door for you. What do you say?",
    "options": {
      "A": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "B": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "C": {
        "signName": "THANK YOU",
        "signId": 7
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q66.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 36,
    "category": "EVERYDAY",
    "situation": "You don't know how to do the puzzle. What do you say?",
    "options": {
      "A": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      },
      "B": {
        "signName": "YES",
        "signId": 15
      },
      "C": {
        "signName": "THANK YOU",
        "signId": 7
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q67.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 69,
    "category": "DAYS",
    "situation": "The day before Thursday is what?",
    "options": {
      "A": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      },
      "B": {
        "signName": "WEDNESDAY",
        "signId": 44
      },
      "C": {
        "signName": "FATHER",
        "signId": 52
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q68.jpg"
  },
  {
    "id": 35,
    "category": "EVERYDAY",
    "situation": "Teacher speaks too fast and you need help. What do you say?",
    "options": {
      "A": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      },
      "B": {
        "signName": "FATHER",
        "signId": 52
      },
      "C": {
        "signName": "MOTHER",
        "signId": 53
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q69.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 11,
    "category": "GREETING",
    "situation": "You wave at your teacher. What do you say?",
    "options": {
      "A": {
        "signName": "SATURDAY",
        "signId": 47
      },
      "B": {
        "signName": "FAST",
        "signId": 19
      },
      "C": {
        "signName": "HELLO",
        "signId": 3
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q70.jpg"
  },
  {
    "id": 1,
    "category": "GREETING",
    "situation": "You wake up and see your mom. What do you say?",
    "options": {
      "A": {
        "signName": "GRANDMOTHER",
        "signId": 57
      },
      "B": {
        "signName": "TUESDAY",
        "signId": 43
      },
      "C": {
        "signName": "GOOD MORNING",
        "signId": 0
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q71.jpg"
  },
  {
    "id": 101,
    "category": "FAMILY",
    "situation": "Who is your uncle's wife?",
    "options": {
      "A": {
        "signName": "FAST",
        "signId": 19
      },
      "B": {
        "signName": "THANK YOU",
        "signId": 7
      },
      "C": {
        "signName": "AUNTIE",
        "signId": 59
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q72.jpg"
  },
  {
    "id": 25,
    "category": "GREETING",
    "situation": "Your friend says 'Thank you' to you. What do you say back?",
    "options": {
      "A": {
        "signName": "SLOW",
        "signId": 18
      },
      "B": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "C": {
        "signName": "MONDAY",
        "signId": 42
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q73.jpg"
  },
  {
    "id": 12,
    "category": "GREETING",
    "situation": "Someone walks into your classroom. What do you say?",
    "options": {
      "A": {
        "signName": "FATHER",
        "signId": 52
      },
      "B": {
        "signName": "UNDERSTAND",
        "signId": 10
      },
      "C": {
        "signName": "HELLO",
        "signId": 3
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q74.jpg"
  },
  {
    "id": 81,
    "category": "DAYS",
    "situation": "What word means 'this very day'?",
    "options": {
      "A": {
        "signName": "TODAY",
        "signId": 49
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "GOOD MORNING",
        "signId": 0
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q75.jpg"
  },
  {
    "id": 44,
    "category": "EVERYDAY",
    "situation": "Do you want to go out in the rain without an umbrella? What do you say?",
    "options": {
      "A": {
        "signName": "NO",
        "signId": 14
      },
      "B": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "C": {
        "signName": "MONDAY",
        "signId": 42
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q76.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 56,
    "category": "EVERYDAY",
    "situation": "A snail moves very ___. What is the word?",
    "options": {
      "A": {
        "signName": "SLOW",
        "signId": 18
      },
      "B": {
        "signName": "CORRECT",
        "signId": 17
      },
      "C": {
        "signName": "YESTERDAY",
        "signId": 51
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q77.jpg"
  },
  {
    "id": 72,
    "category": "DAYS",
    "situation": "The fourth day of the school week is what?",
    "options": {
      "A": {
        "signName": "THURSDAY",
        "signId": 45
      },
      "B": {
        "signName": "MOTHER",
        "signId": 53
      },
      "C": {
        "signName": "AUNTIE",
        "signId": 59
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q78.jpg"
  },
  {
    "id": 17,
    "category": "GREETING",
    "situation": "Your friend asks how you are doing today. What do you say?",
    "options": {
      "A": {
        "signName": "IM FINE",
        "signId": 5
      },
      "B": {
        "signName": "AUNTIE",
        "signId": 59
      },
      "C": {
        "signName": "SATURDAY",
        "signId": 47
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q79.jpg"
  },
  {
    "id": 26,
    "category": "GREETING",
    "situation": "You help your teacher, and she says 'Thank you'. What do you say?",
    "options": {
      "A": {
        "signName": "HELLO",
        "signId": 3
      },
      "B": {
        "signName": "YOURE WELCOME",
        "signId": 8
      },
      "C": {
        "signName": "GOOD EVENING",
        "signId": 2
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q80.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 68,
    "category": "DAYS",
    "situation": "What day comes right after Tuesday?",
    "options": {
      "A": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "B": {
        "signName": "GRANDMOTHER",
        "signId": 57
      },
      "C": {
        "signName": "WEDNESDAY",
        "signId": 44
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q81.jpg"
  },
  {
    "id": 40,
    "category": "EVERYDAY",
    "situation": "Teacher asks a hard question and you do not have the answer. What do you say?",
    "options": {
      "A": {
        "signName": "DON’T KNOW",
        "signId": 13
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "HOW ARE YOU",
        "signId": 4
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q82.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 94,
    "category": "FAMILY",
    "situation": "What do you call your dad's dad?",
    "options": {
      "A": {
        "signName": "FAST",
        "signId": 19
      },
      "B": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "C": {
        "signName": "CORRECT",
        "signId": 17
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q83.jpg"
  },
  {
    "id": 19,
    "category": "GREETING",
    "situation": "You meet a new classmate for the first time. What do you say?",
    "options": {
      "A": {
        "signName": "NICE TO MEET YOU",
        "signId": 6
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "FAST",
        "signId": 19
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q84.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 23,
    "category": "GREETING",
    "situation": "Your mom gives you a snack. What do you say?",
    "options": {
      "A": {
        "signName": "THURSDAY",
        "signId": 45
      },
      "B": {
        "signName": "THANK YOU",
        "signId": 7
      },
      "C": {
        "signName": "WRONG",
        "signId": 16
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q85.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 45,
    "category": "EVERYDAY",
    "situation": "Do you want to step in the yucky mud? What do you say?",
    "options": {
      "A": {
        "signName": "NO",
        "signId": 14
      },
      "B": {
        "signName": "CORRECT",
        "signId": 17
      },
      "C": {
        "signName": "KNOW",
        "signId": 12
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q86.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 100,
    "category": "FAMILY",
    "situation": "What do you call the sister of your mom or dad?",
    "options": {
      "A": {
        "signName": "AUNTIE",
        "signId": 59
      },
      "B": {
        "signName": "YES",
        "signId": 15
      },
      "C": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q87.jpg"
  },
  {
    "id": 46,
    "category": "EVERYDAY",
    "situation": "Your mom asks if you want ice cream. What do you say?",
    "options": {
      "A": {
        "signName": "YES",
        "signId": 15
      },
      "B": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      },
      "C": {
        "signName": "GOOD EVENING",
        "signId": 2
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q88.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 95,
    "category": "FAMILY",
    "situation": "Who is your grandpa?",
    "options": {
      "A": {
        "signName": "GRANDFATHER",
        "signId": 56
      },
      "B": {
        "signName": "SUNDAY",
        "signId": 48
      },
      "C": {
        "signName": "IM FINE",
        "signId": 5
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q89.jpg"
  },
  {
    "id": 86,
    "category": "FAMILY",
    "situation": "Who is the dad in your family?",
    "options": {
      "A": {
        "signName": "CORRECT",
        "signId": 17
      },
      "B": {
        "signName": "FATHER",
        "signId": 52
      },
      "C": {
        "signName": "AUNTIE",
        "signId": 59
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q90.jpg"
  },
  {
    "id": 84,
    "category": "DAYS",
    "situation": "What do you call the day that just passed?",
    "options": {
      "A": {
        "signName": "YESTERDAY",
        "signId": 51
      },
      "B": {
        "signName": "CORRECT",
        "signId": 17
      },
      "C": {
        "signName": "WEDNESDAY",
        "signId": 44
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q91.jpg"
  },
  {
    "id": 62,
    "category": "DAYS",
    "situation": "The day after Sunday is called what?",
    "options": {
      "A": {
        "signName": "MONDAY",
        "signId": 42
      },
      "B": {
        "signName": "THANK YOU",
        "signId": 7
      },
      "C": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q92.jpg"
  },
  {
    "id": 57,
    "category": "EVERYDAY",
    "situation": "A tired sloth climbs the tree ___. What is the word?",
    "options": {
      "A": {
        "signName": "SLOW",
        "signId": 18
      },
      "B": {
        "signName": "UNCLE",
        "signId": 58
      },
      "C": {
        "signName": "SEE YOU TOMORROW",
        "signId": 9
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q93.jpg"
  },
  {
    "id": 49,
    "category": "EVERYDAY",
    "situation": "Your friend says 1 plus 1 is 5. What is that?",
    "options": {
      "A": {
        "signName": "DAUGHTER",
        "signId": 55
      },
      "B": {
        "signName": "THANK YOU",
        "signId": 7
      },
      "C": {
        "signName": "WRONG",
        "signId": 16
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q94.jpg",
    "requiredExpression": "sad"
  },
  {
    "id": 89,
    "category": "FAMILY",
    "situation": "What do you call the lady who is your parent?",
    "options": {
      "A": {
        "signName": "HOW ARE YOU",
        "signId": 4
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "MOTHER",
        "signId": 53
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q95.jpg"
  },
  {
    "id": 58,
    "category": "EVERYDAY",
    "situation": "A cheetah runs very, very ___. What is the word?",
    "options": {
      "A": {
        "signName": "FAST",
        "signId": 19
      },
      "B": {
        "signName": "SLOW",
        "signId": 18
      },
      "C": {
        "signName": "FATHER",
        "signId": 52
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q96.jpg"
  },
  {
    "id": 99,
    "category": "FAMILY",
    "situation": "Who is your aunt's husband?",
    "options": {
      "A": {
        "signName": "GOOD MORNING",
        "signId": 0
      },
      "B": {
        "signName": "UNCLE",
        "signId": 58
      },
      "C": {
        "signName": "CORRECT",
        "signId": 17
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q97.jpg"
  },
  {
    "id": 47,
    "category": "EVERYDAY",
    "situation": "Do you want to play outside with friends? What do you say?",
    "options": {
      "A": {
        "signName": "YES",
        "signId": 15
      },
      "B": {
        "signName": "GOOD EVENING",
        "signId": 2
      },
      "C": {
        "signName": "GOOD AFTERNOON",
        "signId": 1
      }
    },
    "correctAnswer": "A",
    "image": "/QuesPic/Q98.jpg",
    "requiredExpression": "happy"
  },
  {
    "id": 80,
    "category": "DAYS",
    "situation": "What do you call the day we are in right now?",
    "options": {
      "A": {
        "signName": "DON’T UNDERSTAND",
        "signId": 11
      },
      "B": {
        "signName": "CORRECT",
        "signId": 17
      },
      "C": {
        "signName": "TODAY",
        "signId": 49
      }
    },
    "correctAnswer": "C",
    "image": "/QuesPic/Q99.jpg"
  },
  {
    "id": 74,
    "category": "DAYS",
    "situation": "What day comes right after Thursday?",
    "options": {
      "A": {
        "signName": "DAUGHTER",
        "signId": 55
      },
      "B": {
        "signName": "FRIDAY",
        "signId": 46
      },
      "C": {
        "signName": "HOW ARE YOU",
        "signId": 4
      }
    },
    "correctAnswer": "B",
    "image": "/QuesPic/Q100.jpg"
  }
];
