import { BlockGroup, TaskItem, TaskStage } from '../types';

function parseDuration(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export const BASE_TASKS: TaskItem[] = [
  // Эскизный проект / Исп
  { id: 'b1-0', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '0', name: 'Разработка Рабочего Проекта (Общий старт)', targetBlocks: 'Все блоки', executor: 'от ГИПа', isCompleted: true, statusText: 'Сделано', predecessor: 'от ГИПа', successor: 'для АР', responsible: 'ГИП', durationDays: 1, startDay: 1, endDay: 1 },
  { id: 'b1-1', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '1.', name: 'Общие данные', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 0.5, startDay: 1, endDay: 1 },
  { id: 'b1-2', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '2.', name: 'Ситуационная схема', targetBlocks: 'Все блоки', executor: 'Армана', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 0.5, startDay: 1, endDay: 1 },
  { id: 'b1-3', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '3.', name: 'Генеральный план', targetBlocks: 'Все блоки', executor: 'Армана', isCompleted: false, predecessor: 'от ГП', successor: '', responsible: 'Амир', durationDays: 1, startDay: 2, endDay: 2 },
  { id: 'b1-4', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '4.', name: 'Разбивочный план', targetBlocks: 'Все блоки', executor: 'Армана', isCompleted: false, predecessor: 'от ГП', successor: '', responsible: 'Амир', durationDays: 1, startDay: 2, endDay: 2 },
  { id: 'b1-5', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '5.', name: 'Дендроплан', targetBlocks: 'Все блоки', executor: 'Армана', isCompleted: false, predecessor: 'от ГП', successor: '', responsible: 'Амир', durationDays: 1, startDay: 3, endDay: 3 },
  { id: 'b1-6', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '6.', name: 'Фасады', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: 'Концептуалиста', successor: '', responsible: 'Амир', durationDays: 2, startDay: 3, endDay: 4 },
  { id: 'b1-7', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '7.', name: 'Разрезы', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 1, startDay: 4, endDay: 4 },
  { id: 'b1-8', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '8.', name: 'План подвала', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 1, startDay: 5, endDay: 5 },
  { id: 'b1-9', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '9.', name: 'План первого этажа', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 1, startDay: 5, endDay: 5 },
  { id: 'b1-10', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '10.', name: 'План второго этажа', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 1, startDay: 6, endDay: 6 },
  { id: 'b1-11', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '11.', name: 'Планы типовых этажей', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 1, startDay: 6, endDay: 6 },
  { id: 'b1-12', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '12.', name: 'План кровли', targetBlocks: 'Блоки 1-4', executor: 'Ерсін, Амир', isCompleted: false, predecessor: '', successor: '', responsible: 'Амир', durationDays: 1, startDay: 7, endDay: 7 },
  { id: 'b1-13', stageCode: 'Исп', stageGroup: 'Эскизный проект', orderNumber: '13.', name: 'МАФы', targetBlocks: 'Все блоки', executor: 'Армана', isCompleted: false, predecessor: 'от ГП', successor: '', responsible: 'Армана', durationDays: 1, startDay: 7, endDay: 7 },

  // 25% Стадия
  { id: 'b1-14', stageCode: '25%', stageGroup: '25%', orderNumber: '1.', name: 'Общая пояснительная записка', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 8, endDay: 8 },
  { id: 'b1-15', stageCode: '25%', stageGroup: '25%', orderNumber: '2.', name: 'Лист общих данных', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 0.5, startDay: 8, endDay: 8 },
  { id: 'b1-16', stageCode: '25%', stageGroup: '25%', orderNumber: '3.', name: 'Теплотехнический расчет', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 9, endDay: 9 },
  { id: 'b1-17', stageCode: '25%', stageGroup: '25%', orderNumber: '4.', name: 'Технико-экономические показатели', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 9, endDay: 9 },
  { id: 'b1-18', stageCode: '25%', stageGroup: '25%', orderNumber: '5.', name: 'Расставление полов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 3, startDay: 10, endDay: 12 },
  { id: 'b1-19', stageCode: '25%', stageGroup: '25%', orderNumber: '6.', name: 'Экспликация полов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 12, endDay: 13 },
  { id: 'b1-20', stageCode: '25%', stageGroup: '25%', orderNumber: '7.', name: 'Расставление стен', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 4, startDay: 13, endDay: 16 },
  { id: 'b1-21', stageCode: '25%', stageGroup: '25%', orderNumber: '8.', name: 'Расставление отделки стен', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 3, startDay: 16, endDay: 18 },
  { id: 'b1-22', stageCode: '25%', stageGroup: '25%', orderNumber: '9.', name: 'Типы стен (схемы и ведомость)', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 18, endDay: 18 },
  { id: 'b1-23', stageCode: '25%', stageGroup: '25%', orderNumber: '10.', name: 'Расставление окон и витражей', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 19, endDay: 20 },
  { id: 'b1-24', stageCode: '25%', stageGroup: '25%', orderNumber: '11.', name: 'Спецификация окон и витражей', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 20, endDay: 20 },
  { id: 'b1-25', stageCode: '25%', stageGroup: '25%', orderNumber: '12.', name: 'Схемы окон и витражей', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 21, endDay: 21 },
  { id: 'b1-26', stageCode: '25%', stageGroup: '25%', orderNumber: '13.', name: 'Расставление двери', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 21, endDay: 22 },
  { id: 'b1-27', stageCode: '25%', stageGroup: '25%', orderNumber: '14.', name: 'Спецификация дверей', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 22, endDay: 22 },
  { id: 'b1-28', stageCode: '25%', stageGroup: '25%', orderNumber: '15.', name: 'Схемы дверей', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 23, endDay: 23 },

  // 50% Стадия
  { id: 'b1-29', stageCode: '50%', stageGroup: '50%', orderNumber: '16.', name: 'Оформление отделочного плана', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 24, endDay: 24 },
  { id: 'b1-30', stageCode: '50%', stageGroup: '50%', orderNumber: '17.', name: 'Выполнение кровли', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 24, endDay: 25 },
  { id: 'b1-31', stageCode: '50%', stageGroup: '50%', orderNumber: '18.', name: 'Пирог, спецификация, схема кровли', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 25, endDay: 25 },
  { id: 'b1-32', stageCode: '50%', stageGroup: '50%', orderNumber: '19.', name: 'Планы лестниц (фрагменты, отметки)', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 26, endDay: 26 },
  { id: 'b1-33', stageCode: '50%', stageGroup: '50%', orderNumber: '20.', name: 'Отделка лестниц (ведомость)', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 26, endDay: 26 },
  { id: 'b1-34', stageCode: '50%', stageGroup: '50%', orderNumber: '21.', name: 'Ограждения лестниц (схема и спецификация)', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 27, endDay: 27 },
  { id: 'b1-35', stageCode: '50%', stageGroup: '50%', orderNumber: '22.', name: 'Расставление потолков', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 27, endDay: 28 },
  { id: 'b1-36', stageCode: '50%', stageGroup: '50%', orderNumber: '23.', name: 'Спецификация потолков', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 28, endDay: 28 },
  { id: 'b1-37', stageCode: '50%', stageGroup: '50%', orderNumber: '24.', name: 'Выполнение фасада', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 4, startDay: 29, endDay: 32 },
  { id: 'b1-38', stageCode: '50%', stageGroup: '50%', orderNumber: '25.', name: 'Оформление и ведомость фасадов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 32, endDay: 33 },
  { id: 'b1-39', stageCode: '50%', stageGroup: '50%', orderNumber: '26.', name: 'Узлы фасада', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 33, endDay: 33 },
  { id: 'b1-40', stageCode: '50%', stageGroup: '50%', orderNumber: '27.', name: 'Выполнение разрезов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 34, endDay: 35 },
  { id: 'b1-41', stageCode: '50%', stageGroup: '50%', orderNumber: '28.', name: 'Выполнение вентшахт', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'ОВ', successor: 'АР', responsible: 'Алихан', durationDays: 5, startDay: 34, endDay: 38, mepDiscipline: 'OV', notes: 'Требуется задание от ОВ (отопление и вентиляция)' },
  { id: 'b1-42', stageCode: '50%', stageGroup: '50%', orderNumber: '29.', name: 'Обшивка труб', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'ОВ/ВК', successor: 'АР', responsible: 'Алихан', durationDays: 4, startDay: 37, endDay: 40, mepDiscipline: 'OV_VK', dependsOnTaskIds: ['b1-41'], notes: 'Требуется совместное задание от ОВ и ВК' },
  { id: 'b1-43', stageCode: '50%', stageGroup: '50%', orderNumber: '30.', name: 'Кладочные планы', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 4, startDay: 39, endDay: 42 },
  { id: 'b1-44', stageCode: '50%', stageGroup: '50%', orderNumber: '31.', name: 'План перемычек и отверстий', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 42, endDay: 43 },
  { id: 'b1-45', stageCode: '50%', stageGroup: '50%', orderNumber: '32.', name: 'Спецификация перемычек', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 43, endDay: 44 },

  // 75% Стадия
  { id: 'b1-46', stageCode: '75%', stageGroup: '75%', orderNumber: '33.', name: 'Узлы деформационных швов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 0.5, startDay: 45, endDay: 45 },
  { id: 'b1-47', stageCode: '75%', stageGroup: '75%', orderNumber: '34.', name: 'Корзины для кондиционеров', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 45, endDay: 46 },
  { id: 'b1-48', stageCode: '75%', stageGroup: '75%', orderNumber: '35.', name: 'Расставление ограждений', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 0.5, startDay: 46, endDay: 46 },
  { id: 'b1-49', stageCode: '75%', stageGroup: '75%', orderNumber: '36.', name: 'Спецификация ограждений', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 0.5, startDay: 47, endDay: 47 },
  { id: 'b1-50', stageCode: '75%', stageGroup: '75%', orderNumber: '37.', name: 'Расставление стремянок', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 47, endDay: 48 },
  { id: 'b1-51', stageCode: '75%', stageGroup: '75%', orderNumber: '38.', name: 'Спецификация стремянок', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 2, startDay: 48, endDay: 49 },
  { id: 'b1-52', stageCode: '75%', stageGroup: '75%', orderNumber: '39.', name: 'Расставление козырьков', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1.5, startDay: 49, endDay: 50 },
  { id: 'b1-53', stageCode: '75%', stageGroup: '75%', orderNumber: '40.', name: 'Спецификация козырьков', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1.5, startDay: 50, endDay: 51 },
  { id: 'b1-54', stageCode: '75%', stageGroup: '75%', orderNumber: '41.', name: 'Расставление колонн по КЖ 1', targetBlocks: 'Блок 1', executor: 'Алихан', isCompleted: false, predecessor: 'КЖ', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 51, endDay: 51, mepDiscipline: 'KZ' },
  { id: 'b1-55', stageCode: '75%', stageGroup: '75%', orderNumber: '42.', name: 'Расставление ливневых воронок', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'АР', successor: 'ВК', responsible: 'Алихан', durationDays: 2, startDay: 51, endDay: 52, mepDiscipline: 'VK', notes: 'Выдача задания для ВК по уклонам и точкам сброса' },
  { id: 'b1-56', stageCode: '75%', stageGroup: '75%', orderNumber: '43.', name: 'Фрагменты расставления стен из газоблока', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 0.5, startDay: 52, endDay: 52 },
  { id: 'b1-57', stageCode: '75%', stageGroup: '75%', orderNumber: '44.', name: 'Фрагменты расставления стен из кирпича', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 0.5, startDay: 53, endDay: 53 },
  { id: 'b1-58', stageCode: '75%', stageGroup: '75%', orderNumber: '45.', name: 'Ведомость кладочных материалов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1.5, startDay: 53, endDay: 54 },
  { id: 'b1-59', stageCode: '75%', stageGroup: '75%', orderNumber: '46.', name: 'Ведомость утеплителя', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1.5, startDay: 54, endDay: 55 },

  // 100% Стадия
  { id: 'b1-60', stageCode: '100%', stageGroup: '100%', orderNumber: '47.', name: 'Расставление отверстий ЭОМ', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'ЭОМ', successor: 'АР Финал', responsible: 'Алихан', durationDays: 2.5, startDay: 53, endDay: 55, mepDiscipline: 'EOM', notes: 'Задание на гильзы и отверстия от электриков' },
  { id: 'b1-61', stageCode: '100%', stageGroup: '100%', orderNumber: '48.', name: 'Расставление отверстий СС', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'СС', successor: 'АР Финал', responsible: 'Алихан', durationDays: 2.5, startDay: 53, endDay: 55, mepDiscipline: 'SS', notes: 'Задание на отверстия слаботочных сетей и связи' },
  { id: 'b1-62', stageCode: '100%', stageGroup: '100%', orderNumber: '49.', name: 'Расставление отверстий ОВ', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'ОВ', successor: 'АР Финал', responsible: 'Алихан', durationDays: 2, startDay: 54, endDay: 55, mepDiscipline: 'OV', dependsOnTaskIds: ['b1-41'], notes: 'Критическое задание от ОВ: гильзы в перекрытиях и шахтах' },
  { id: 'b1-63', stageCode: '100%', stageGroup: '100%', orderNumber: '50.', name: 'Расставление отверстий ВК', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'ВК', successor: 'АР Финал', responsible: 'Алихан', durationDays: 2, startDay: 54, endDay: 55, mepDiscipline: 'VK', dependsOnTaskIds: ['b1-42', 'b1-55'], notes: 'Критическое задание от ВК: проходы водопровода и канализации' },
  { id: 'b1-64', stageCode: '100%', stageGroup: '100%', orderNumber: '51.', name: 'Опросник лифтов', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: 'Лифтовик', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 55, endDay: 55 },
  { id: 'b1-65', stageCode: '100%', stageGroup: '100%', orderNumber: '52.', name: 'Планы и разрезы лифтовой шахты', targetBlocks: 'Блоки 1-4', executor: 'Алихан', isCompleted: false, predecessor: '', successor: '', responsible: 'Алихан', durationDays: 1, startDay: 55, endDay: 55 },

  // ФИНАЛЬНЫЙ РЕЗУЛЬТАТ (Веха / Milestone с зависимостью от ОВ, ВК, ЭОМ, СС)
  { id: 'b1-final', stageCode: '100%', stageGroup: '100%', orderNumber: '53.', name: 'Оформление и распечатка альбома, отправка на проверку (Финальная сдача)', targetBlocks: 'Все блоки', executor: 'Алихан', isCompleted: false, predecessor: 'ОВ, ВК, ЭОМ, СС', successor: 'Экспертиза', responsible: 'Алихан / ГИП', durationDays: 1, startDay: 56, endDay: 56, isMilestone: true, mepDiscipline: 'OV_VK', dependsOnTaskIds: ['b1-60', 'b1-61', 'b1-62', 'b1-63'], notes: 'Финальный выпуск проекта. БЛОКИРУЕТСЯ до выдачи и расстановки отверстий ОВ и ВК!' },
];

function createBlockTasksFromTemplate(lead: string, prefix: string): TaskItem[] {
  return BASE_TASKS.map((t, idx) => {
    const isEskiz = t.stageGroup === 'Эскизный проект';
    return {
      ...t,
      id: `${prefix}-${idx}`,
      executor: isEskiz ? t.executor : lead,
      responsible: isEskiz ? t.responsible : lead,
      isCompleted: false,
      statusText: 'В плане',
    };
  });
}

function createAyaBlockWithCompletedTasks(prefix: string): TaskItem[] {
  const tasks = createBlockTasksFromTemplate('Айя', prefix);
  return tasks.map(t => {
    if (
      t.name.includes('Теплотехнический расчет') ||
      t.name.includes('Расставление полов') ||
      t.name.includes('Экспликация полов') ||
      t.name.includes('Расставление стен') ||
      t.name.includes('Расставление отделки стен') ||
      t.name.includes('Типы стен')
    ) {
      return {
        ...t,
        isCompleted: true,
        statusText: 'Сделано',
      };
    }
    return t;
  });
}

function createBlockWithMultipleColTasks(lead: string, prefix: string): TaskItem[] {
  const base = createBlockTasksFromTemplate(lead, prefix);
  return base.map(t => {
    if (t.name.includes('Расставление колонн по КЖ 1')) {
      return {
        ...t,
        name: 'Расставление колонн по КЖ 1-4',
        durationDays: 4,
        notes: 'Включает блоки 1, 2, 3, 4'
      };
    }
    return t;
  });
}

export const INITIAL_BLOCK_GROUPS: BlockGroup[] = [
  {
    id: 'block_1_12_27',
    title: '1, 12, 27 блок',
    subtitle: 'Основной рабочий проект (АР)',
    leadArchitect: 'Алихан / Амир',
    tasks: BASE_TASKS,
  },
  {
    id: 'block_2_9_13_26_18',
    title: '2, 9, 13, 26, 18',
    subtitle: 'План разработки (Ответственный: Нурдаулет)',
    leadArchitect: 'Нурдаулет',
    tasks: createBlockTasksFromTemplate('Нурдаулет', 'b2')
  },
  {
    id: 'block_3_8_14_25',
    title: '3, 8, 14, 25',
    subtitle: 'В работе у Айя (содержит закрытые этапы)',
    leadArchitect: 'Айя',
    tasks: createAyaBlockWithCompletedTasks('b3')
  },
  {
    id: 'block_4_7_15_16_23_24',
    title: '4, 7, 15, 16, 23, 24',
    subtitle: 'Детализированный проект по 4 блокам КЖ',
    leadArchitect: 'Алихан',
    tasks: createBlockWithMultipleColTasks('Алихан', 'b4')
  },
  {
    id: 'block_5_6_17_22',
    title: '5, 6, 17, 22',
    subtitle: 'Рабочий проект (Ответственный: Нурдаулет)',
    leadArchitect: 'Нурдаулет',
    tasks: createBlockTasksFromTemplate('Нурдаулет', 'b5')
  },
  {
    id: 'block_1_10',
    title: '1, 10',
    subtitle: 'Параллельная группа блоков',
    leadArchitect: 'Айя',
    tasks: createBlockTasksFromTemplate('Айя', 'b6')
  },
  {
    id: 'block_19_20_1_2_1_3',
    title: '19, 20, 1.2, 1.3',
    subtitle: 'Секции 19, 20 и вставки 1.2, 1.3',
    leadArchitect: 'Айя',
    tasks: createBlockTasksFromTemplate('Айя', 'b7')
  },
  {
    id: 'block_1_1',
    title: '1.1',
    subtitle: 'Секция 1.1',
    leadArchitect: 'Алихан',
    tasks: createBlockTasksFromTemplate('Алихан', 'b8')
  },
  {
    id: 'block_1_4',
    title: '1.4',
    subtitle: 'Секция 1.4',
    leadArchitect: 'Айя',
    tasks: createBlockTasksFromTemplate('Айя', 'b9')
  },
  {
    id: 'block_19_1',
    title: '19.1',
    subtitle: 'Секция 19.1',
    leadArchitect: 'Нурдаулет',
    tasks: createBlockTasksFromTemplate('Нурдаулет', 'b10')
  },
  {
    id: 'block_20_1',
    title: '20.1',
    subtitle: 'Секция 20.1',
    leadArchitect: 'Нурдаулет',
    tasks: createBlockTasksFromTemplate('Нурдаулет', 'b11')
  }
];

export const EXECUTOR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Алихан': { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  'Нурдаулет': { bg: 'bg-violet-500/10 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' },
  'Айя': { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
  'Ерсін, Амир': { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  'Армана': { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700' },
  'от ГИПа': { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
};
