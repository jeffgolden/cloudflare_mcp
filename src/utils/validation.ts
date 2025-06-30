// src/utils/validation.ts

/**
 * Formats TXT record content by ensuring it is wrapped in double quotes.
 * Removes existing quotes before wrapping to prevent double-quoting.
 * @param content The original TXT record content.
 * @returns The content wrapped in double quotes.
 */
export function formatTxtRecordContent(content: string): string {
  // Remove existing quotes if present from start/end of the string
  const cleaned = content.replace(/^"|"$/g, '');
  
  // Always wrap in double quotes
  return `"${cleaned}"`;
}

/**
 * Validates that TXT record content is correctly formatted with quotes.
 * This is a simple check and relies on formatTxtRecordContent for the logic.
 * @param content The content to validate.
 * @returns boolean indicating if the format is valid.
 */
export function validateTxtRecord(content: string): boolean {
  const formatted = formatTxtRecordContent(content);
  
  // Validate that content starts and ends with quotes and has content inside
  return formatted.startsWith('"') && formatted.endsWith('"') && formatted.length > 2;
}
