// Конфиг шагов сборки для инструкции (Tour)
import { StepType } from '@reactour/tour';

const assemblySteps: StepType[] = [
  {
    selector: '.layer-base',
    content: 'Соберите основание: уложите и закрепите продольные и поперечные балки основания.',
    position: 'top',
  },
  {
    selector: '.layer-floor',
    content: 'Уложите доски пола с выбранным шагом, закрепите их к основанию.',
    position: 'top',
  },
  {
    selector: '.layer-rafters',
    content: 'Установите и закрепите все пары стропил с выбранным шагом.',
    position: 'top',
  },
  {
    selector: '.layer-ridge',
    content: 'Установите коньковую доску по вершине стропил.',
    position: 'top',
  },
  {
    selector: '.layer-sheathing',
    content: 'Выполните обшивку крыши и фронтонов (опционально).',
    position: 'top',
  },
];

export default assemblySteps; 