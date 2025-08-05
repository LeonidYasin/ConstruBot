// physics.ts

/**
 * Расчёт длины стропил для А-фрейма
 * @param width ширина основания (м)
 * @param height высота (м)
 * @returns длина стропил (м)
 */
export function calcRafterLength(width: number, height: number): number {
  return Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height, 2));
}

/**
 * Расчёт угла наклона стропил (в радианах)
 * @param width ширина основания (м)
 * @param height высота (м)
 * @returns угол наклона (рад)
 */
export function calcRafterAngle(width: number, height: number): number {
  return Math.atan(height / (width / 2));
}

// Толщина элементов
const BASE_HEIGHT = 0.05;
const FLOOR_HEIGHT = 0.05;
const RAFTER_HEIGHT = 0.1;

/**
 * Генерация координат досок пола
 */
export function generateFloorBoards(width: number, length: number, step: number, exploded = false): { position: [number, number, number], size: [number, number, number] }[] {
  const count = Math.floor(length / step) + 1;
  const boards = [];
  // В assembled пол лежит на основании, в exploded — выше
  const y = exploded ? BASE_HEIGHT + FLOOR_HEIGHT + 0.07 : BASE_HEIGHT;
  for (let i = 0; i < count; i++) {
    const z = -length / 2 + i * step;
    boards.push({
      position: [0, y, z] as [number, number, number],
      size: [width, FLOOR_HEIGHT, 0.1] as [number, number, number],
    });
  }
  return boards;
}

/**
 * Генерация координат стропил (каждая пара)
 */
export function generateRafters(width: number, height: number, length: number, step: number, exploded = false): { left: { position: [number, number, number], rotation: [number, number, number], size: [number, number, number] }, right: { position: [number, number, number], rotation: [number, number, number], size: [number, number, number] } }[] {
  const count = Math.floor(length / step) + 1;
  const rafters = [];
  const rafterLength = calcRafterLength(width, height);
  const angle = calcRafterAngle(width, height);
  // В assembled низ стропил опирается на пол, в exploded — выше
  const yBase = BASE_HEIGHT + FLOOR_HEIGHT;
  const yOffset = exploded ? yBase + 0.15 : yBase;
  for (let i = 0; i < count; i++) {
    const z = -length / 2 + i * step;
    rafters.push({
      left: {
        position: [-width / 2, height / 2 + yOffset, z] as [number, number, number],
        rotation: [0, 0, angle] as [number, number, number],
        size: [rafterLength, RAFTER_HEIGHT, 0.1] as [number, number, number],
      },
      right: {
        position: [width / 2, height / 2 + yOffset, z] as [number, number, number],
        rotation: [0, 0, -angle] as [number, number, number],
        size: [rafterLength, RAFTER_HEIGHT, 0.1] as [number, number, number],
      },
    });
  }
  return rafters;
}

/**
 * Генерация основания (2 продольные + 2 поперечные балки)
 */
export function generateBase(width: number, length: number, exploded = false): { position: [number, number, number], size: [number, number, number] }[] {
  // В assembled основание на y=0, в exploded — чуть ниже
  const y = exploded ? -0.08 : 0;
  return [
    // Продольные
    { position: [0, y, -length / 2] as [number, number, number], size: [width, BASE_HEIGHT, 0.1] as [number, number, number] },
    { position: [0, y, length / 2] as [number, number, number], size: [width, BASE_HEIGHT, 0.1] as [number, number, number] },
    // Поперечные
    { position: [-width / 2, y, 0] as [number, number, number], size: [0.1, BASE_HEIGHT, length] as [number, number, number] },
    { position: [width / 2, y, 0] as [number, number, number], size: [0.1, BASE_HEIGHT, length] as [number, number, number] },
  ];
}

/**
 * Генерация конька (одна доска по вершине)
 */
export function generateRidge(length: number, height: number, exploded = false): { position: [number, number, number], size: [number, number, number] }[] {
  // В assembled конёк на вершине стропил, в exploded — выше
  const y = exploded ? height + BASE_HEIGHT + FLOOR_HEIGHT + 0.25 : height + BASE_HEIGHT + FLOOR_HEIGHT;
  return [
    {
      position: [0, y, 0] as [number, number, number],
      size: [0.1, 0.1, length] as [number, number, number],
    },
  ];
}

// Обшивка — опционально, можно добавить позже 