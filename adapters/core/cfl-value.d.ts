// Types for the choose-from-list value helper (adapters/core/cfl-value.js).

/**
 * Narrow an `FdyCfl` value to the row a single-select can actually produce.
 *
 * `Row[]` is reachable only under `multiple` and `null` only under `clearable`, but the emitted
 * type cannot say which of those props a given field sets, so every single-select handler has to
 * prove it. Throws on an array rather than taking its first row: quietly picking one is how a
 * `multiple` added later goes unnoticed.
 */
export declare function singleRow<Row>(value: Row | Row[] | null): Row | null;
