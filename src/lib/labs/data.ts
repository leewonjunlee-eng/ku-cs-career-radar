import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LabDirectory } from './types';

export const emptyLabDirectory: LabDirectory = {
  checkedAt: '',
  scope: '고려대학교 서울캠퍼스',
  sources: [],
  labs: [],
};

/** Reads the separately maintained lab directory without making its absence a deploy blocker. */
export async function getLabDirectory(): Promise<LabDirectory> {
  const filePath = path.join(process.cwd(), 'content', 'labs.json');
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as LabDirectory;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyLabDirectory;
    throw error;
  }
}
