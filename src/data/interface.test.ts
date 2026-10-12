import { describe, expect, it } from 'vitest';
import { formatInterfaceDate, formatWeekday, localizeInterface } from './interface';

describe('interface localization', () => {
  it('formats weekdays in Kyrgyz when the interface language is Kyrgyz', () => {
    const monday = new Date(2025, 0, 6);
    expect(formatWeekday(monday, 'ky')).toBe('Дүй');
    expect(formatWeekday(new Date(2025, 0, 12), 'ky')).toBe('Жек');
  });

  it('keeps Russian weekday names when Russian is selected', () => {
    expect(formatWeekday(new Date(2025, 0, 6), 'ru')).toBe('пн');
  });

  it('formats dates and practice descriptions in Kyrgyz', () => {
    expect(formatInterfaceDate(new Date(2025, 9, 12), 'ky')).toBe('12-октябрь 2025');
    expect(localizeInterface('Повторяйте написание и перевод по карточкам.', 'ky'))
      .toBe('Сөздөрдүн жазылышын жана котормосун карточкалар менен кайталаңыз.');
    expect(localizeInterface('К карточкам', 'ky')).toBe('Карталарга өтүү');
    expect(localizeInterface('Подготавливаем просмотрщик PDF…', 'ky'))
      .toBe('PDF көрүүчү даярдалып жатат…');
  });
});
