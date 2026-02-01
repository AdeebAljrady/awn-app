"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { FileData } from "@/lib/types/awn";
import { Button } from "@/components/ui/button";

interface QuizProps {
  file: FileData;
  onExit: () => void;
}

export default function Quiz({ file, onExit }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Mock questions - in real app, these would be generated from file content
  const questions = [
    {
      question: "ما هو الموضوع الرئيسي للملف؟",
      options: ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      correct: 0,
    },
  ];

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    if (index === questions[currentQuestion].correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto text-center p-10">
        <div className="bg-white rounded-3xl shadow-xl p-12 border border-beige-200">
          <h2 className="text-3xl font-bold text-beige-900 mb-4">نتيجة الاختبار</h2>
          <p className="text-2xl text-gold-600 mb-8">
            {score} / {questions.length}
          </p>
          <Button onClick={onExit} className="bg-gold-600 hover:bg-gold-700">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-beige-600">
              سؤال {currentQuestion + 1} من {questions.length}
            </span>
            <Button variant="outline" onClick={onExit}>
              خروج
            </Button>
          </div>
          <div className="w-full bg-beige-100 rounded-full h-2">
            <div
              className="bg-gold-600 h-2 rounded-full transition-all"
              style={{
                width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-beige-900 mb-8 text-right">
          {question.question}
        </h2>

        <div className="space-y-4 mb-8">
          {question.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleAnswer(index)}
              className={`w-full text-right p-4 h-auto rounded-xl border-2 whitespace-normal ${
                selectedAnswer === index
                  ? "border-gold-500 bg-gold-50"
                  : "border-beige-200 hover:border-gold-300"
              }`}
            >
              {option}
            </Button>
          ))}
        </div>

        {selectedAnswer !== null && (
          <div className="flex justify-end">
            <Button onClick={handleNext} className="bg-gold-600 hover:bg-gold-700">
              التالي
              <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

