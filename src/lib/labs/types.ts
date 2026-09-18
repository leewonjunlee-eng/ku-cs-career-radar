export type LabSource = {
  id: string;
  label: string;
  url: string;
};

export type Lab = {
  id: string;
  name: string;
  professors: string[];
  departments: string[];
  topics: string[];
  website: string | null;
  sourceIds: string[];
};

export type LabDirectory = {
  checkedAt: string;
  scope: string;
  sources: LabSource[];
  labs: Lab[];
};
