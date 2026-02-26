export interface UFWRule {
  number: number;
  to: string;
  action: string;
  from: string;
  comment: string;
}

export interface UFWStatus {
  active: boolean;
  rules: UFWRule[];
}
