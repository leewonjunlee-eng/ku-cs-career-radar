import type { Lab } from './types';

const searchableText = (lab: Lab) =>
  [lab.name, ...lab.professors, ...lab.departments, ...lab.topics].join(' ').toLocaleLowerCase('ko-KR');

export function filterLabs(labs: readonly Lab[], keyword: string, department: string): Lab[] {
  const query = keyword.trim().toLocaleLowerCase('ko-KR');
  return labs.filter((lab) =>
    (!department || lab.departments.includes(department)) &&
    (!query || searchableText(lab).includes(query)),
  );
}
