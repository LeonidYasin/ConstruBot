import { calcRafterLength, calcRafterAngle } from './physics';

describe('calcRafterLength', () => {
  it('корректно считает длину стропил', () => {
    expect(calcRafterLength(6, 4)).toBeCloseTo(5);
    expect(calcRafterLength(8, 6)).toBeCloseTo(7.2111, 3);
  });
});

describe('calcRafterAngle', () => {
  it('корректно считает угол наклона', () => {
    expect(calcRafterAngle(6, 4)).toBeCloseTo(Math.atan(4 / 3));
    expect(calcRafterAngle(8, 6)).toBeCloseTo(Math.atan(6 / 4));
  });
}); 