export type SelectedPlayer = 1 | 2 | 3 | 4;

export const parseSelectedPlayer = (value: unknown): SelectedPlayer | null => {
  if (value === 1 || value === "1") return 1;
  if (value === 2 || value === "2") return 2;
  if (value === 3 || value === "3") return 3;
  if (value === 4 || value === "4") return 4;
  return null;
};
