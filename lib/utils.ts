import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detects if the text contains Arabic characters (indicating RTL direction)
 */
export function isArabic(text: string): boolean {
  text = text.replace("استمر في الاجتهاد، فالمستقبل يُصنع اليوم.","")
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicPattern.test(text);
}
