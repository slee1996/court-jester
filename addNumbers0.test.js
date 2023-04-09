const addNumbers = function addNumbers(num1, num2) {
  return num1 + num2;
}
; 
    test('addNumbers should work as expected', () => { 
      expect(addNumbers(1, 1)).toBe(2);
    });