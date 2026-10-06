// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// JSDOM does not implement window.scrollTo or scrollIntoView
if (typeof window !== "undefined") {
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}
