import { describe, it, expect } from 'vitest';
import { escapeXml, truncateText } from './utils.js';

describe('escapeXml', () => {
  it('should escape all special characters', () => {
    const input = 'PR <title> & "description" with \'quotes\'';
    const expected = 'PR &lt;title&gt; &amp; &quot;description&quot; with &apos;quotes&apos;';
    expect(escapeXml(input)).toBe(expected);
  });

  it('should handle ampersand correctly (not double-escape)', () => {
    const input = 'A & B';
    const expected = 'A &amp; B';
    expect(escapeXml(input)).toBe(expected);
  });

  it('should handle null', () => {
    expect(escapeXml(null)).toBe('');
  });

  it('should handle undefined', () => {
    expect(escapeXml(undefined)).toBe('');
  });

  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should handle text with no special characters', () => {
    const input = 'Normal text';
    expect(escapeXml(input)).toBe('Normal text');
  });
});

describe('truncateText', () => {
  it('should preserve short text', () => {
    const input = 'Short text';
    expect(truncateText(input, 50)).toBe('Short text');
  });

  it('should truncate at word boundary', () => {
    const input = 'This is a long title that needs truncation';
    const result = truncateText(input, 20);
    expect(result).toBe('This is a long...');
    expect(result.length).toBeLessThanOrEqual(20 + 3); // maxLength + '...'
  });

  it('should truncate single long word at maxLength', () => {
    const input = 'Supercalifragilisticexpialidocious';
    const result = truncateText(input, 10);
    expect(result).toBe('Supercalif...');
    expect(result.length).toBe(13); // 10 + '...'
  });

  it('should handle empty input', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('should handle text exactly at maxLength', () => {
    const input = '1234567890';
    expect(truncateText(input, 10)).toBe('1234567890');
  });

  it('should handle text one character over maxLength', () => {
    const input = 'Hello world';
    const result = truncateText(input, 10);
    expect(result).toBe('Hello...');
  });
});
