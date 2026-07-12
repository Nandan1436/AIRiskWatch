export interface ClassificationBreakdownItem {
  name: string;
  incident_count: number;
}

export interface ClassificationBreakdown {
  causal_entity: ClassificationBreakdownItem[];
  intent: ClassificationBreakdownItem[];
  timing: ClassificationBreakdownItem[];
}
