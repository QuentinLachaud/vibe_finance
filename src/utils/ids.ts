let counter = 0;
export function generateId(): string {
  return `expense-${Date.now()}-${++counter}`;
}
