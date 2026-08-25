using System.Collections.Concurrent;
using System.Globalization;
using System.Reflection;
using System.Text.RegularExpressions;

namespace Freeday.Blazor;

/// <summary>
/// The sort / filter / paginate logic for <see cref="FdyTable{TRow}"/>, the C# counterpart of the
/// framework-agnostic adapters/core/table-model.js shared by the Vue and React adapters. Kept as a
/// separate pure-function class (no rendering, no state) so it mirrors that reference faithfully and
/// stays unit-testable. Every method is pure: inputs are never mutated (rows are copied before sort).
/// </summary>
public static class TableModel
{
    private static readonly ConcurrentDictionary<(Type, string), PropertyInfo?> PropCache = new();
    private static readonly Regex NonNumeric = new(@"[^\d.-]", RegexOptions.Compiled);

    /// <summary>Numeric value, tolerant of formatted strings ("Rp 1.000"); non-numeric -> 0.</summary>
    private static double ToNumber(object? v)
    {
        if (v is null) return 0;
        if (v is double d) return double.IsFinite(d) ? d : 0;
        if (v is IConvertible && v is not string)
        {
            try { return Convert.ToDouble(v, CultureInfo.InvariantCulture); } catch { /* fall through */ }
        }
        string cleaned = NonNumeric.Replace(v.ToString() ?? string.Empty, string.Empty);
        return double.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out double n) ? n : 0;
    }

    /// <summary>Epoch ms; unparseable -> 0.</summary>
    private static double ToTime(object? v)
    {
        if (v is null) return 0;
        if (v is DateTime dt) return new DateTimeOffset(dt.ToUniversalTime()).ToUnixTimeMilliseconds();
        if (v is DateTimeOffset dto) return dto.ToUnixTimeMilliseconds();
        return DateTimeOffset.TryParse(v.ToString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTimeOffset parsed)
            ? parsed.ToUnixTimeMilliseconds()
            : 0;
    }

    /// <summary>ISO calendar day (yyyy-MM-dd), lexicographically comparable.</summary>
    private static string DateOnly(object? v)
    {
        if (v is DateTime dt) return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        if (v is DateTimeOffset dto) return dto.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        string s = v?.ToString() ?? string.Empty;
        return s.Length >= 10 ? s[..10] : s;
    }

    /// <summary>Raw cell value for a column: the accessor if present, else the property named Key.</summary>
    public static object? CellValue<TRow>(TRow row, FdyTableColumn<TRow> column)
    {
        if (column.Value is not null) return column.Value(row);
        PropertyInfo? prop = PropCache.GetOrAdd((typeof(TRow), column.Key),
            static k => k.Item1.GetProperty(k.Item2, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase));
        return prop?.GetValue(row);
    }

    /// <summary>Cell value as trimmed display text (null -> "").</summary>
    public static string CellText<TRow>(TRow row, FdyTableColumn<TRow> column)
    {
        object? v = CellValue(row, column);
        return v is null ? string.Empty : (Convert.ToString(v, CultureInfo.CurrentCulture) ?? string.Empty).Trim();
    }

    /// <summary>Effective comparator type: explicit SortType, else derived from the filter type.</summary>
    public static FdyColumnType ColumnSortType<TRow>(FdyTableColumn<TRow> column)
    {
        if (column.SortType is { } t) return t;
        return column.Filter switch
        {
            FdyColumnFilterType.Number => FdyColumnType.Number,
            FdyColumnFilterType.Date => FdyColumnType.Date,
            _ => FdyColumnType.Text,
        };
    }

    /// <summary>Ascending comparison of two raw cell values under a comparator type.</summary>
    public static int CompareBy(FdyColumnType type, object? a, object? b) => type switch
    {
        FdyColumnType.Number => ToNumber(a).CompareTo(ToNumber(b)),
        FdyColumnType.Date => ToTime(a).CompareTo(ToTime(b)),
        _ => string.Compare(a?.ToString() ?? string.Empty, b?.ToString() ?? string.Empty,
            StringComparison.CurrentCultureIgnoreCase),
    };

    /// <summary>True when a filter would actually narrow the rows (worth applying / showing as active).</summary>
    public static bool IsFilterActive(FdyColumnFilter? filter) => filter switch
    {
        FdyColumnFilter.Text t => t.Value.Trim().Length > 0,
        FdyColumnFilter.Enum e => e.Values.Count > 0,
        FdyColumnFilter.Number n => n.Min is not null || n.Max is not null,
        FdyColumnFilter.Date d => d.From is not null || d.To is not null,
        _ => false,
    };

    private static bool RowPassesFilter<TRow>(TRow row, FdyTableColumn<TRow> column, FdyColumnFilter filter)
    {
        switch (filter)
        {
            case FdyColumnFilter.Text t:
            {
                string needle = t.Value.Trim().ToLowerInvariant();
                return needle.Length == 0 || CellText(row, column).ToLowerInvariant().Contains(needle);
            }
            case FdyColumnFilter.Enum e:
                return e.Values.Count == 0 || e.Values.Contains(CellText(row, column));
            case FdyColumnFilter.Number n:
            {
                double v = ToNumber(CellValue(row, column));
                if (n.Min is { } min && v < min) return false;
                if (n.Max is { } max && v > max) return false;
                return true;
            }
            case FdyColumnFilter.Date d:
            {
                string day = DateOnly(CellValue(row, column));
                if (d.From is { } from && string.CompareOrdinal(day, from) < 0) return false;
                if (d.To is { } to && string.CompareOrdinal(day, to) > 0) return false;
                return true;
            }
            default:
                return true;
        }
    }

    /// <summary>Rows passing every active column filter (logical AND). Input is never mutated.</summary>
    public static List<TRow> FilterRows<TRow>(
        IReadOnlyList<TRow> rows,
        IReadOnlyList<FdyTableColumn<TRow>> columns,
        IReadOnlyDictionary<string, FdyColumnFilter> filters)
    {
        List<(FdyTableColumn<TRow> Col, FdyColumnFilter Filter)> active = new();
        foreach (FdyTableColumn<TRow> col in columns)
        {
            if (filters.TryGetValue(col.Key, out FdyColumnFilter? f) && IsFilterActive(f))
            {
                active.Add((col, f));
            }
        }
        if (active.Count == 0) return rows.ToList();
        return rows.Where(row => active.All(e => RowPassesFilter(row, e.Col, e.Filter))).ToList();
    }

    /// <summary>Rows sorted by the given sort state. Stable via OrderBy; input is never mutated.</summary>
    public static List<TRow> SortRows<TRow>(
        IReadOnlyList<TRow> rows,
        IReadOnlyList<FdyTableColumn<TRow>> columns,
        FdySortState? sort)
    {
        if (sort is null) return rows.ToList();
        FdyTableColumn<TRow>? column = columns.FirstOrDefault(c => c.Key == sort.Key);
        if (column is null) return rows.ToList();
        FdyColumnType type = ColumnSortType(column);
        int factor = sort.Dir == FdySortDir.Desc ? -1 : 1;
        return rows
            .OrderBy(r => r, Comparer<TRow>.Create((a, b) => CompareBy(type, CellValue(a, column), CellValue(b, column)) * factor))
            .ToList();
    }

    /// <summary>Page slice (0-based page index). A non-positive size returns all rows.</summary>
    public static List<TRow> Paginate<TRow>(IReadOnlyList<TRow> rows, int pageIndex, int pageSize)
    {
        if (pageSize <= 0) return rows.ToList();
        return rows.Skip(pageIndex * pageSize).Take(pageSize).ToList();
    }

    /// <summary>Distinct non-empty cell texts for a column, naturally sorted, the enum-filter source.</summary>
    public static List<string> DistinctValues<TRow>(IReadOnlyList<TRow> rows, FdyTableColumn<TRow> column)
    {
        HashSet<string> seen = new();
        List<string> outList = new();
        foreach (TRow row in rows)
        {
            string v = CellText(row, column);
            if (v.Length > 0 && seen.Add(v)) outList.Add(v);
        }
        outList.Sort((a, b) => string.Compare(a, b, StringComparison.CurrentCultureIgnoreCase));
        return outList;
    }

    /// <summary>Page-number window: first and last page always shown, current ±1, null for the
    /// "ellipsis" gaps between. <paramref name="current"/> and returned page numbers are 1-based.</summary>
    /// <summary>
    /// The page to land on when the page SIZE changes: whichever page still holds the first row the
    /// reader was already looking at. Jumping to page 1 loses their place; keeping the same index can
    /// land past the end (page 5 of 5 at twenty rows is page 2 of 2 at fifty).
    /// </summary>
    public static int PageIndexForSize(int pageIndex, int oldSize, int newSize)
    {
        if (newSize <= 0) return 0;
        int firstRow = Math.Max(0, pageIndex) * Math.Max(0, oldSize);
        return firstRow / newSize;
    }

    public static List<int?> PageWindow(int current, int totalPages)
    {
        List<int?> outList = new();
        for (int p = 1; p <= totalPages; p++)
        {
            if (p == 1 || p == totalPages || (p >= current - 1 && p <= current + 1)) outList.Add(p);
            else if (outList.Count == 0 || outList[^1] is not null) outList.Add(null);
        }
        return outList;
    }
}
