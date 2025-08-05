import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { calcRafterLength, calcRafterAngle, generateFloorBoards, generateRafters, generateBase, generateRidge } from './physics';
import { TourProvider, useTour } from '@reactour/tour';
import assemblySteps from './assemblySteps';

// Толщина доски (условно)
const BOARD_THICKNESS = 0.1;

// Компоненты для визуализации слоёв
function BaseLayer({ width, length, exploded }: { width: number; length: number; exploded: boolean }) {
  const base = generateBase(width, length, exploded);
  return (
    <group>
      {base.map((b, i) => (
        <mesh key={i} position={b.position} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#deb887" />
        </mesh>
      ))}
    </group>
  );
}

function FloorLayer({ width, length, step, exploded }: { width: number; length: number; step: number; exploded: boolean }) {
  const boards = generateFloorBoards(width, length, step, exploded);
  return (
    <group>
      {boards.map((b, i) => (
        <mesh key={i} position={b.position} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#ffe4b5" />
        </mesh>
      ))}
    </group>
  );
}

function RaftersLayer({ width, height, length, step, exploded }: { width: number; height: number; length: number; step: number; exploded: boolean }) {
  const rafters = generateRafters(width, height, length, step, exploded);
  return (
    <group>
      {rafters.map((r, i) => (
        <>
          <mesh key={`l${i}`} position={r.left.position} rotation={r.left.rotation} castShadow receiveShadow>
            <boxGeometry args={r.left.size} />
            <meshStandardMaterial color="#bfa16b" />
          </mesh>
          <mesh key={`r${i}`} position={r.right.position} rotation={r.right.rotation} castShadow receiveShadow>
            <boxGeometry args={r.right.size} />
            <meshStandardMaterial color="#bfa16b" />
          </mesh>
        </>
      ))}
    </group>
  );
}

function RidgeLayer({ length, height, exploded }: { length: number; height: number; exploded: boolean }) {
  const ridge = generateRidge(length, height, exploded);
  return (
    <group>
      {ridge.map((b, i) => (
        <mesh key={i} position={b.position} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#c9b37f" />
        </mesh>
      ))}
    </group>
  );
}

// Spinner-компонент
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 40 }}>
      <div style={{
        width: 28,
        height: 28,
        border: '4px solid #4caf50',
        borderTop: '4px solid transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const CONNECTION_TYPES = [
  { value: 'bracket', label: 'Уголки' },
  { value: 'half-lap', label: 'В полдерева' },
  { value: 'plate', label: 'Пластины' },
];

function AppContent() {
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(4);
  const [length, setLength] = useState(6);
  const [rafterStep, setRafterStep] = useState(0.6);
  const [floorStep, setFloorStep] = useState(0.3);
  const [inputWidth, setInputWidth] = useState(width);
  const [inputHeight, setInputHeight] = useState(height);
  const [inputLength, setInputLength] = useState(length);
  const [inputRafterStep, setInputRafterStep] = useState(rafterStep);
  const [inputFloorStep, setInputFloorStep] = useState(floorStep);
  const [layers, setLayers] = useState<LayersState>({ base: true, floor: true, rafters: true, ridge: true, sheathing: false });
  const [materials, setMaterials] = useState<null | { boards_count: number; screws_count: number; roof_area: number }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const orbitRef = useRef<any>(null);
  const [lastParams, setLastParams] = useState<{ width: number; height: number } | null>(null);
  const { setIsOpen, currentStep, isOpen } = useTour();
  const [assemblyMode, setAssemblyMode] = useState<'assembled' | 'exploded'>('assembled');
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES[0].value);

  // Если тур не запущен — показываем полностью собранный дом (step=3)
  // Если тур запущен — показываем только до текущего шага
  const modelStep = isOpen ? Math.min(currentStep + 1, 3) : 3;

  // Определяем, какие слои показывать
  const allLayerKeys = ['base', 'floor', 'rafters', 'ridge', 'sheathing'] as const;
  type LayerKey = typeof allLayerKeys[number];
  type LayersState = Record<LayerKey, boolean>;
  let visibleLayers: LayerKey[] = [];
  if (isOpen) {
    // В туре показываем только слой текущего шага
    visibleLayers = [allLayerKeys[Math.min(currentStep, allLayerKeys.length - 1)]];
  } else {
    // В обычном режиме — все включённые
    visibleLayers = allLayerKeys.filter((key: LayerKey) => layers[key]);
  }

  // Валидация
  const validate = (w: any, h: any) => {
    const widthNum = Number(w);
    const heightNum = Number(h);
    if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) return 'Значения должны быть больше 0';
    if (widthNum > 12 || heightNum > 12) return 'Максимум 12 метров';
    return null;
  };

  React.useEffect(() => {
    setValidationError(validate(inputWidth, inputHeight));
  }, [inputWidth, inputHeight]);

  const handleCalculate = async () => {
    if (validationError) return;
    // Кэширование: если параметры не изменились, не делаем запрос
    if (lastParams && lastParams.width === inputWidth && lastParams.height === inputHeight) return;
    setWidth(Number(inputWidth));
    setHeight(Number(inputHeight));
    setLoading(true);
    setError(null);
    setMaterials(null);
    setLastParams({ width: inputWidth, height: inputHeight });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 сек таймаут
      const resp = await fetch(`http://localhost:8000/calculate?width=${inputWidth}&height=${inputHeight}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error('Ошибка запроса');
      const data = await resp.json();
      if (!data || typeof data.boards_count !== 'number' || typeof data.screws_count !== 'number') {
        throw new Error('Некорректный ответ сервера');
      }
      setMaterials(data);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Сервер не отвечает. Попробуйте позже.');
      } else {
        setError(e.message || 'Ошибка');
      }
    } finally {
      setLoading(false);
    }
  };

  // Вращение камеры
  const handleSpinCamera = () => {
    if (orbitRef.current) {
      let angle = 0;
      const animate = () => {
        angle += 0.05;
        orbitRef.current.setAzimuthalAngle(angle);
        if (angle < 2 * Math.PI) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, background: '#fff', color: '#222', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', zIndex: 1, boxShadow: '0 2px 8px #0001' }}>
        {/* Секция: параметры дома */}
        <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, minWidth: 220 }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Параметры дома</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="step-1">Ширина (м):
              <input type="number" min={1} max={12} step={0.1} value={inputWidth} onChange={e => setInputWidth(Number(e.target.value))} style={{ marginLeft: 8, width: 60 }} />
            </label>
            <label className="step-1">Высота (м):
              <input type="number" min={1} max={12} step={0.1} value={inputHeight} onChange={e => setInputHeight(Number(e.target.value))} style={{ marginLeft: 8, width: 60 }} />
            </label>
            <label>Длина (м):
              <input type="number" min={1} max={12} step={0.1} value={inputLength} onChange={e => setInputLength(Number(e.target.value))} style={{ marginLeft: 8, width: 60 }} />
            </label>
          </div>
        </fieldset>
        {/* Секция: шаги и соединения */}
        <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, minWidth: 180 }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Монтаж</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label>Шаг стропил (м):
              <input type="number" min={0.2} max={2} step={0.05} value={inputRafterStep} onChange={e => setInputRafterStep(Number(e.target.value))} style={{ marginLeft: 8, width: 60 }} />
            </label>
            <label>Шаг пола (м):
              <input type="number" min={0.1} max={1} step={0.05} value={inputFloorStep} onChange={e => setInputFloorStep(Number(e.target.value))} style={{ marginLeft: 8, width: 60 }} />
            </label>
            <label>Тип соединения:
              <select value={connectionType} onChange={e => setConnectionType(e.target.value)} style={{ marginLeft: 8 }}>
                {CONNECTION_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <input type="checkbox" checked={assemblyMode === 'exploded'} onChange={e => setAssemblyMode(e.target.checked ? 'exploded' : 'assembled')} />
              Режим подготовки к сборке (разобранный)
            </label>
          </div>
        </fieldset>
        {/* Секция: слои */}
        <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, minWidth: 180 }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Слои</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allLayerKeys.map((key: LayerKey) => (
              <label key={key} className={`layer-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={layers[key]} onChange={e => setLayers(l => ({ ...l, [key]: e.target.checked }))} disabled={isOpen} />
                {key === 'base' && 'Основание'}
                {key === 'floor' && 'Пол'}
                {key === 'rafters' && 'Стропила'}
                {key === 'ridge' && 'Конёк'}
                {key === 'sheathing' && 'Обшивка'}
              </label>
            ))}
          </div>
        </fieldset>
        {/* Секция: действия */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160, marginTop: 4 }}>
          <button onClick={handleCalculate} className="step-2" style={{ padding: '4px 16px', fontWeight: 'bold', background: validationError ? '#888' : '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: validationError ? 'not-allowed' : 'pointer' }} disabled={!!validationError || loading}>
            Рассчитать
          </button>
          <button onClick={handleSpinCamera} className="step-3" style={{ padding: '4px 16px', fontWeight: 'bold', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4 }}>
            Вращать камеру
          </button>
          <button onClick={() => setIsOpen(true)} className="step-4" style={{ padding: '4px 16px', fontWeight: 'bold', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4 }}>
            Пошаговая инструкция
          </button>
        </div>
        {validationError && <span style={{ color: '#ff5252', marginLeft: 12 }}>{validationError}</span>}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div className="step-5" style={{ height: '100%' }}>
          <Canvas camera={{ position: [0, height, width * 2] }} shadows style={{ background: '#f5f5f5' }}>
            {/* Светлая "земля" */}
            <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#f0e9e0" />
            </mesh>
            {/* Свет */}
            <ambientLight intensity={1.1} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
            <directionalLight position={[-10, 8, -5]} intensity={0.7} />
            {visibleLayers.includes('base') && <BaseLayer width={width} length={length} exploded={assemblyMode === 'exploded'} />}
            {visibleLayers.includes('floor') && <FloorLayer width={width} length={length} step={floorStep} exploded={assemblyMode === 'exploded'} />}
            {visibleLayers.includes('rafters') && <RaftersLayer width={width} height={height} length={length} step={rafterStep} exploded={assemblyMode === 'exploded'} />}
            {visibleLayers.includes('ridge') && <RidgeLayer length={length} height={height} exploded={assemblyMode === 'exploded'} />}
            {/* Обшивка — опционально */}
            <OrbitControls enablePan={false} ref={orbitRef} />
          </Canvas>
        </div>
        <div style={{ position: 'absolute', left: 24, bottom: 24, background: 'rgba(255,255,255,0.97)', color: '#222', padding: 20, borderRadius: 8, minWidth: 220, boxShadow: '0 2px 8px #0001' }}>
          {loading && <Spinner />}
          {error && <p style={{ color: '#ff5252' }}>Ошибка: {error}</p>}
          {materials && (
            <div>
              <h3>Материалы:</h3>
              <p>Доски: {materials.boards_count} шт.</p>
              <p>Саморезы: {materials.screws_count} шт.</p>
              <p>Площадь крыши: {materials.roof_area} м²</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <TourProvider steps={assemblySteps}>
      <AppContent />
    </TourProvider>
  );
}

export default App;
