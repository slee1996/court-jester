const sum = function sum(a, b) {
  return a + b;
}
; 
    test('sum should work as expected', () => { 
      expect(sum(1, 1)).toBe(2);
    });