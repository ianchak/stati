import { describe, it, expect } from 'vitest';
import { slugify } from '../../../src/core/utils/slugify.utils.js';

describe('slugify.utils.ts', () => {
  describe('slugify', () => {
    it('should convert basic text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should handle special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify("What's New?")).toBe('what-s-new');
      expect(slugify('API: Configuration')).toBe('api-configuration');
    });

    it('should handle leading and trailing whitespace', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
      expect(slugify('\t\nHello\n\t')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle strings with only special characters', () => {
      expect(slugify('!@#$%')).toBe('');
    });

    it('should convert to lowercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world');
      expect(slugify('HeLLo WoRLD')).toBe('hello-world');
    });

    it('should handle numbers', () => {
      expect(slugify('Chapter 1')).toBe('chapter-1');
      expect(slugify('2024 Updates')).toBe('2024-updates');
    });

    it('should handle dashes in input', () => {
      expect(slugify('pre-existing')).toBe('pre-existing');
      expect(slugify('pre--existing')).toBe('pre-existing');
    });

    it('should handle underscores', () => {
      // Underscores are word characters and are preserved
      expect(slugify('hello_world')).toBe('hello_world');
    });

    it('should handle mixed special characters', () => {
      expect(slugify('Hello & Goodbye')).toBe('hello-and-goodbye');
      expect(slugify('Test: Example - Demo')).toBe('test-example-demo');
    });

    it('should not have leading or trailing dashes', () => {
      expect(slugify('-hello-')).toBe('hello');
      expect(slugify('---hello---')).toBe('hello');
      expect(slugify('- hello -')).toBe('hello');
    });

    it('should transliterate common accented characters', () => {
      expect(slugify('héllo wörld')).toBe('hello-world');
      expect(slugify('café')).toBe('cafe');
      expect(slugify('naïve')).toBe('naive');
      expect(slugify('résumé')).toBe('resume');
      expect(slugify('Ångström')).toBe('angstrom');
      expect(slugify('Zürich')).toBe('zurich');
    });

    it('should transliterate extended Latin characters', () => {
      expect(slugify('Łódź')).toBe('lodz');
      expect(slugify('piñata')).toBe('pinata');
      expect(slugify('São Paulo')).toBe('sao-paulo');
      expect(slugify('crème brûlée')).toBe('creme-brulee');
      expect(slugify('Ærø')).toBe('aero');
      expect(slugify('Œuvre')).toBe('oeuvre');
    });

    it('should handle German characters', () => {
      expect(slugify('Größe')).toBe('grosse');
      expect(slugify('über')).toBe('uber');
      expect(slugify('Straße')).toBe('strasse');
    });

    it('should handle Scandinavian characters', () => {
      expect(slugify('Ærø')).toBe('aero');
      expect(slugify('Øresund')).toBe('oresund');
      expect(slugify('Åland')).toBe('aland');
    });

    it('should handle Eastern European characters', () => {
      expect(slugify('Dvořák')).toBe('dvorak');
      expect(slugify('Škoda')).toBe('skoda');
      expect(slugify('Łukasz')).toBe('lukasz');
      expect(slugify('Gdańsk')).toBe('gdansk');
    });

    it('should handle Hungarian characters', () => {
      expect(slugify('Győr')).toBe('gyor');
      expect(slugify('fűszer')).toBe('fuszer');
      expect(slugify('Hűtőszekrény')).toBe('hutoszekreny');
    });

    it('should convert ampersand to "and"', () => {
      expect(slugify('Cats & Dogs')).toBe('cats-and-dogs');
      expect(slugify('Rock & Roll')).toBe('rock-and-roll');
      expect(slugify('Tom&Jerry')).toBe('tom-and-jerry');
      expect(slugify('A & B & C')).toBe('a-and-b-and-c');
    });

    it('should handle emojis by removing them', () => {
      expect(slugify('Hello 👋 World')).toBe('hello-world');
      expect(slugify('🎉 Party Time 🎊')).toBe('party-time');
      expect(slugify('Coffee ☕')).toBe('coffee');
      expect(slugify('🚀🚀🚀')).toBe('');
    });

    it('should prevent consecutive dashes from emojis', () => {
      // Emojis are replaced with spaces (not dashes) to prevent consecutive dashes
      expect(slugify('Hello👋👋World')).toBe('hello-world');
      expect(slugify('Test🎉🎊Done')).toBe('test-done');
      expect(slugify('A🔥B🔥C')).toBe('a-b-c');
    });

    it('should prevent consecutive dashes from CJK characters', () => {
      // CJK characters become spaces to avoid consecutive dashes
      expect(slugify('Hello世界World')).toBe('hello-world');
      expect(slugify('Test日本語Done')).toBe('test-done');
      expect(slugify('Korean한국어Text')).toBe('korean-text');
    });

    it('should handle mixed emojis and regular text without extra dashes', () => {
      expect(slugify('🎉Hello🎊World🚀')).toBe('hello-world');
      expect(slugify('A👋B👋C👋D')).toBe('a-b-c-d');
      expect(slugify('Start🔥Middle🔥End')).toBe('start-middle-end');
    });

    it('should handle null and undefined defensively', () => {
      // @ts-expect-error - testing runtime behavior with null
      expect(slugify(null)).toBe('');
      // @ts-expect-error - testing runtime behavior with undefined
      expect(slugify(undefined)).toBe('');
    });

    it('should coerce non-string values to strings', () => {
      // @ts-expect-error - testing runtime behavior with number
      expect(slugify(123)).toBe('123');
      // @ts-expect-error - testing runtime behavior with number
      expect(slugify(0)).toBe('0');
      // @ts-expect-error - testing runtime behavior with boolean
      expect(slugify(true)).toBe('true');
      // @ts-expect-error - testing runtime behavior with boolean
      expect(slugify(false)).toBe('false');
    });

    it('should handle code-like strings', () => {
      expect(slugify('`code` blocks')).toBe('code-blocks');
      expect(slugify('array[0]')).toBe('array-0');
      expect(slugify('func()')).toBe('func');
      expect(slugify('obj.method()')).toBe('obj-method');
      expect(slugify('<Component />')).toBe('component');
      expect(slugify('a > b')).toBe('a-b');
    });

    it('should handle strings with only whitespace', () => {
      expect(slugify('   ')).toBe('');
      expect(slugify('\t\t\t')).toBe('');
      expect(slugify('\n\n\n')).toBe('');
      expect(slugify(' \t \n ')).toBe('');
    });

    it('should handle very long strings', () => {
      const longText = 'a'.repeat(1000);
      expect(slugify(longText)).toBe(longText);
      expect(slugify(longText).length).toBe(1000);
    });

    it('should handle strings with mixed scripts', () => {
      // CJK characters become dashes (no transliteration)
      expect(slugify('Hello 世界')).toBe('hello');
      expect(slugify('こんにちは World')).toBe('world');
      // Cyrillic - no transliteration, becomes dashes
      expect(slugify('Hello Мир')).toBe('hello');
    });

    it('should handle real-world heading examples', () => {
      expect(slugify('Getting Started')).toBe('getting-started');
      expect(slugify('Installation & Setup')).toBe('installation-and-setup');
      expect(slugify('API Reference (v2.0)')).toBe('api-reference-v2-0');
      expect(slugify('Quick Start Guide')).toBe('quick-start-guide');
    });

    it('should handle complex real-world cases', () => {
      expect(slugify("What's New in v2.0?")).toBe('what-s-new-in-v2-0');
      expect(slugify('FAQ & Troubleshooting')).toBe('faq-and-troubleshooting');
      expect(slugify('C++ Programming')).toBe('c-programming');
      expect(slugify('Node.js Tutorial')).toBe('node-js-tutorial');
      expect(slugify('iOS & Android')).toBe('ios-and-android');
    });
  });
});
