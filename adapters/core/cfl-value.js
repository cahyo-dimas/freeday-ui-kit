// Freeday, choose-from-list value narrowing (pure, zero dependencies).
//
// `FdyCfl` in Vue and React declares one model type, `Row | Row[] | null`, covering three prop
// combinations at once: the array is reachable only under `multiple`, the null only under
// `clearable`. A single-select screen therefore has to narrow a union that its own props make
// impossible, and the widening arrived across two releases that were additive from the kit's side
// (1.29.0 `clearable`, 1.42.0 `multiple`) and a broken build from the consumer's. Apps were each
// inventing the guard differently: a cast that hides the day `clearable` is added, a silent
// ignore, or a throw. The kit is what knows the invariant, so the guard is written once, here.
//
// Blazor needs none of this: multi-select there is a separate `Values` / `ValuesChanged` pair,
// because a nullable union is not a C# binding shape.

/**
 * Narrow an `FdyCfl` value to the row a single-select can actually produce.
 *
 * @template Row
 * @param {Row | Row[] | null} value the value the component emitted
 * @returns {Row | null} the picked row, or null when nothing is picked
 * @throws {TypeError} when handed an array, which only a `multiple` CFL emits
 */
export function singleRow(value) {
  if (Array.isArray(value)) {
    throw new TypeError(
      `singleRow() got an array of ${value.length} row(s). Only an FdyCfl with \`multiple\` emits ` +
        'one, and a set of rows is not a single selection: read the array directly on that field, ' +
        'or drop `multiple`.',
    );
  }
  return value == null ? null : value;
}
