"use server";

import { generateText, generateObject } from "ai";
import { MindMapNode, QuizQuestion, GeneratedQuiz } from "@/lib/types/awn";
import { z } from "zod";
import {
  hasEnoughCredits,
  deductCredits,
  refundCredits,
} from "@/app/actions/db/credits";
import { getFileById } from "@/app/actions/db/files";
import { createSummary } from "@/app/actions/db/summaries";
import { createQuiz } from "@/app/actions/db/quizzes";

const GEMINI_MODEL = "google/gemini-3-flash";

// Quiz schema for structured output
const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z
        .string()
        .describe("Question text in the document's primary language"),
      options: z
        .array(z.string())
        .length(3)
        .describe("Exactly 3 options in the document's primary language"),
      correctAnswer: z
        .number()
        .int()
        .min(0)
        .max(2)
        .describe("Index of the correct answer (0, 1, or 2)"),
      justification: z
        .string()
        .describe("Explanation in the document's primary language"),
      example: z
        .string()
        .describe("Example in the document's primary language"),
    })
  ),
});

export async function sendChatMessage(
  history: { role: string; text: string }[],
  text: string,
  fileBase64?: string
) {
  const messages: any[] = history.map((h) => ({
    role: h.role,
    content: [{ type: "text", text: h.text }],
  }));

  messages.push({ role: "user", content: [{ type: "text", text }] });

  if (fileBase64) {
    messages.push({ role: "user", content: [{ type: "file", data: fileBase64, mediaType: "application/pdf" }] });
  }

  const response = await generateText({
    model: "google/gemini-3-flash",
    temperature: 0.4,
    messages,
  });

  return response.text;
}

const mindMapSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      parentId: z.string().nullable(),
      children: z.array(z.string())
    })
  )
});

export async function generateMindMapFromPDF(
  fileURL: string,
  unitPreference: string = "",
  fileName: string = "خريطة ذهنية جديدة",
  fileId?: string
) {
  try {
    const mindMap = await generateObject({
      model: "google/gemini-3-flash",
      schema: mindMapSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Create a mind map from this PDF: ${fileURL}` }
          ],
        },
      ],
      temperature: 0.4,
    });

    return { data: mindMap, error: null };
  } catch (error) {
    return { data: null, error: "خطأ أثناء إنشاء الخريطة الذهنية" };
  }
}



export async function generateQuizFromPDF(
  fileURL: string,
  unitPreference: string,
  fileName: string = "اختبار جديد",
  fileId?: string
): Promise<{
  data: { questions: QuizQuestion[]; id: string } | null;
  error: string | null;
}> {
  // Check if user has enough credits
  const {
    hasCredits,
    balance,
    cost,
    error: creditError,
  } = await hasEnoughCredits("quiz");

  if (creditError) {
    return { data: null, error: creditError };
  }

  if (!hasCredits) {
    return {
      data: null,
      error: `رصيدك غير كافٍ. الرصيد الحالي: ${balance}، التكلفة: ${cost}`,
    };
  }

  // Deduct credits before starting
  const { transaction, error: deductError } = await deductCredits("quiz");

  if (deductError || !transaction) {
    return { data: null, error: deductError || "فشل في خصم الرصيد" };
  }

  try {
    const prompt = `
      Analyze the attached PDF document carefully.
      Create a multiple-choice quiz with exactly 10 questions.
      
      LANGUAGE REQUIREMENT: 
      - Detect the primary language of the document.
      - The output MUST be in the EXACT SAME LANGUAGE as the document (e.g., if it's French, use French; if it's Arabic, use Arabic).

      User preference for content: "${unitPreference}". 
      If the user specified a specific Unit or Chapter, strictly focus on that section.
      If they said "All" or left it empty, cover the entire document evenly.

      For each question, provide:
      1. The question text.
      2. 3 distinct options.
      3. The index of the correct answer (0, 1, or 2).
      4. A justification/explanation suitable for a student.
      5. A concrete, real-world example to help understanding.

      Respond in valid JSON matching the schema.
    `;

    const { object } = await generateObject({
      model: GEMINI_MODEL,
      schema: quizSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "file",
              data: fileURL,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
      temperature: 0.4,
    });

    const quizResult = object as GeneratedQuiz;
    if (!quizResult.questions || quizResult.questions.length === 0) {
      throw new Error("فشل في إنشاء الأسئلة من الذكاء الاصطناعي");
    }

    // Save quiz directly on the server
    const { data: savedQuiz, error: saveError } = await createQuiz(
      fileName,
      unitPreference || "كامل الملف",
      quizResult.questions,
      fileId
    );

    if (saveError || !savedQuiz) {
      console.error("Auto-save quiz failed on server:", saveError);
      // Fallback: return questions even if save failed, so user can still play (though not saved)
      return {
        data: { questions: quizResult.questions, id: "" },
        error: "تم إنشاء الاختبار، ولكن فشل الحفظ التلقائي: " + saveError,
      };
    }

    return {
      data: { questions: quizResult.questions, id: savedQuiz.id },
      error: null,
    };
  } catch (error) {
    // Refund credits on failure
    if (transaction?.id) {
      await refundCredits(transaction.id);
      console.log("Credits refunded due to AI failure");
    }

    console.error("Quiz Generation Error:", error);
    return {
      data: null,
      error: "حدث خطأ أثناء إنشاء الاختبار. يرجى المحاولة مرة أخرى.",
    };
  }
}

export async function generateSummaryFromPDF(
  fileURL: string,
  unitPreference: string = "",
  fileName: string = "ملخص بدون عنوان",
  fileId?: string
): Promise<{
  data: { id: string; text: string } | null;
  error: string | null;
}> {
  // Check if user has enough credits
  const {
    hasCredits,
    balance,
    cost,
    error: creditError,
  } = await hasEnoughCredits("summary");

  if (creditError) {
    return { data: null, error: creditError };
  }

  if (!hasCredits) {
    return {
      data: null,
      error: `رصيدك غير كافٍ. الرصيد الحالي: ${balance}، التكلفة: ${cost}`,
    };
  }

  // Deduct credits before starting
  const { transaction, error: deductError } = await deductCredits("summary");

  if (deductError || !transaction) {
    return { data: null, error: deductError || "فشل في خصم الرصيد" };
  }

  try {
    console.log(fileURL);

    const prompt = `You are "Awn" (عَون), an academic assistant.

TARGET SCOPE: "${unitPreference || "Whole Document"}".

TASK: Generate a strictly structured study guide.

LANGUAGE REQUIREMENT:
- Detect the primary language of the document.
- Generate the summary, headings, and all content in the EXACT SAME LANGUAGE as the document.
- Use the EXACT TERMINOLOGY found in the slides. Do not paraphrase key terms.

METHODOLOGY:
You must split the summary into exactly two distinct parts.

===============================================================
PART 1: THEORETICAL SUMMARY
Heading: Use a translated version of "Theoretical Summary" in the document's language 
(e.g., "### 📚 التلخيص النظري" or "### 📚 Résumé Théorique").

- Extract key definitions, concepts, and theories.
- Keep it general and descriptive.

===============================================================
PART 2: PRACTICAL LAWS & FORMULAS
Heading: Use a translated version of "Practical Laws & Formulas" in the document's language 
(e.g., "### 📐 القوانين العملية ومصطلحاتها" or "### 📐 Lois et Formules Pratiques").

⚠️ STRICT RULES FOR PART 2 (ZERO TOLERANCE):
1. ABSOLUTELY NO NUMBERS. Do NOT provide numerical examples. Do NOT solve problems.
2. ONLY ABSTRACT FORMULAS. (e.g. write "$$F = m \\times a$$", DO NOT write "$$F = 5 \\times 10$$").
3. VERBATIM COPY: Copy the formula EXACTLY as it appears in the slide.
4. SYMBOL LEGEND: You MUST list the meaning of every symbol in the formula EXACTLY as found in the slide.

⚠️ ARABIC RENDERING SAFETY (CRITICAL, DO NOT IGNORE):
- When writing formulas inside $$, NEVER write Arabic words.
- Use symbols or English identifiers only inside $$.
- Write Arabic explanations and symbol definitions OUTSIDE the math block.

Format for Part 2:
* **Law:** (Translate "Law" to the document's language) $$[Formula]$$
  - $$[Symbol]$$: [Definition from slide]

If there are NO math formulas in the text, DO NOT generate Part 2.
===============================================================

MATH FORMATTING (CRITICAL):
- You MUST use double dollar signs ($$) for ALL mathematical expressions, both inline and block.
- NEVER use single dollar signs ($) for math; reserve them for currency only.

Footer:
End with: "استمر في الاجتهاد، فالمستقبل يُصنع اليوم."

STRICT CONSTRAINTS:
- Temperature: 0.0 (No creativity allowed).`;
    const { text } = await generateText({
      model: GEMINI_MODEL,
      temperature: 0.0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "file",
              data: fileURL,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    if (!text) {
      throw new Error("لم يتم توليد نص من الخادم");
    }

    // Save summary directly on the server
    const { data: savedSummary, error: saveError } = await createSummary(
      fileName,
      unitPreference,
      text,
      "",
      fileId
    );

    if (saveError || !savedSummary) {
      console.error("Auto-save failed on server:", saveError);
      // We still return the text so the client can show it, but we note the error
      return {
        data: { id: "", text: text },
        error: "تم توليد التلخيص بنجاح، ولكن فشل الحفظ التلقائي: " + saveError,
      };
    }

    return {
      data: { id: savedSummary.id, text: text },
      error: null,
    };
  } catch (error) {
    // Refund credits on failure
    if (transaction?.id) {
      await refundCredits(transaction.id);
      console.log("Credits refunded due to AI failure");
    }

    console.error("Summary Generation Error:", error);
    return {
      data: null,
      error: "حدث خطأ أثناء التلخيص. يرجى المحاولة مرة أخرى.",
    };
  }
}
