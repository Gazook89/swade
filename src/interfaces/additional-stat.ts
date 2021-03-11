export interface AdditionalStat {
  dType: string;
  hasMaxValue: boolean;
  label: string;
  useField?: boolean;
  value?: string | number;
  max?: string | number;
  modifier?: string;
}
