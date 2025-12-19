
export type CellType = 'code' | 'markdown';

export interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string;
  isExecuting?: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  metrics: {
    accuracy: number;
    loss: number;
    epoch: number;
  };
  timestamp: number;
}

export interface ModelResource {
  id: string;
  name: string;
  version: string;
  description: string;
  provider: string;
  category: string;
}

export interface DatasetResource {
  id: string;
  name: string;
  size: string;
  type: string;
  description: string;
}

export enum AppTab {
  NOTEBOOK = 'notebook',
  MODELS = 'models',
  DATASETS = 'datasets',
  EXPERIMENTS = 'experiments',
  API = 'api'
}
