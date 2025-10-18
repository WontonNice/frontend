// Shared types that mirror your Markdown schema
export type Bin = { id: string; label: string };
export type DragOption = { id: string; label: string };
export type DragAnswer = Record<string, string | undefined>; // optionId -> binId
export type ClozeAnswer = Record<string, string | undefined>;

export type TableColumn = { key: string; header: string };
export type TableRow = { id: string; header: string };
export type TableOption = { id: string; label: string };
export type TableAnswer = Record<string, string | undefined>; // rowId -> optionId
