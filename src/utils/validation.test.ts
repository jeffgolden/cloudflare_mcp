// src/utils/validation.test.ts
import { formatTxtRecordContent, validateTxtRecord } from './validation.js';

describe('TXT record helpers', () => {
  test('formatTxtRecordContent adds quotes when missing', () => {
    expect(formatTxtRecordContent('v=spf1 include:_spf.google.com ~all')).toBe('"v=spf1 include:_spf.google.com ~all"');
  });

  test('formatTxtRecordContent removes existing outer quotes before wrapping', () => {
    expect(formatTxtRecordContent('"already quoted"')).toBe('"already quoted"');
  });

  test('validateTxtRecord returns true for correctly quoted content', () => {
    expect(validateTxtRecord('"abc"')).toBe(true);
  });

  test('validateTxtRecord returns true after formatting unquoted content', () => {
    const unquoted = 'foo';
    expect(validateTxtRecord(unquoted)).toBe(true);
  });
});
