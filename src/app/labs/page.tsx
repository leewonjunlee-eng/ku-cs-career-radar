import type { Metadata } from 'next';
import { LabDirectory } from '@/components/lab-directory';
import { getLabDirectory } from '@/lib/labs/data';

export const metadata: Metadata = {
  title: '연구실 정보 | KU CS Career Radar',
  description: '고려대학교 서울캠퍼스 컴퓨터 관련 연구실 디렉터리',
};

export default async function LabsPage() {
  const directory = await getLabDirectory();
  return <LabDirectory directory={directory} />;
}
