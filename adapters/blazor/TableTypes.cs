using Microsoft.AspNetCore.Components;

namespace Freeday.Blazor;

/// <summary>Sort direction for a column.</summary>
public enum FdySortDir { Asc, Desc }

/// <summary>A column's comparator type — how its values are ordered when sorting.</summary>
public enum FdyColumnType { Text, Number, Date }

/// <summary>Cell alignment. Maps to <c>text-align</c> on the header and body cells.</summary>
public enum FdyColumnAlign { Left, Right, Center }

/// <summary>The kind of column filter to offer (a funnel popover in the header).</summary>
public enum FdyColumnFilterType { Text, Enum, Number, Date }

/// <summary>Which column is sorted and in what direction.</summary>
public sealed record FdySortState(string Key, FdySortDir Dir);

/// <summary>Server-driven pagination state (0-based page index). Its presence on
/// <see cref="FdyTable{TRow}.Page"/> switches the table into server mode.</summary>
public sealed record FdyPageState(int Index, int Size, int Total);

/// <summary>The processed page of rows (after filter/sort/paginate) plus the total row count, as
/// raised by <see cref="FdyTable{TRow}.Process"/>. Lets a consumer render the same processed set
/// somewhere else — a card list below the <c>md</c> breakpoint, a summary, an export — without
/// re-deriving the pipeline. Mirrors the <c>process</c> event in the Vue/React adapters.</summary>
public sealed record FdyTableProcess<TRow>(IReadOnlyList<TRow> Rows, int Total);

/// <summary>The active filter for a single column (a closed set of shapes, one per filter type).</summary>
public abstract record FdyColumnFilter
{
    public sealed record Text(string Value) : FdyColumnFilter;
    public sealed record Enum(IReadOnlyList<string> Values) : FdyColumnFilter;
    public sealed record Number(double? Min, double? Max) : FdyColumnFilter;
    public sealed record Date(string? From, string? To) : FdyColumnFilter;
}

/// <summary>One column definition. <typeparamref name="TRow"/> is the row type.</summary>
/// <typeparam name="TRow">The row model.</typeparam>
public sealed class FdyTableColumn<TRow>
{
    /// <summary>Row property key; the sort/filter identity and, when <see cref="Value"/> is unset,
    /// the default cell accessor (resolved by reflection against a property of this name).</summary>
    public required string Key { get; init; }

    /// <summary>Header label.</summary>
    public required string Label { get; init; }

    /// <summary>Render the label for assistive tech only — the header cell looks empty.
    /// For a column of row CONTROLS (an edit button, a row menu), where a visible heading is noise
    /// above a column of icons but the column still has to be named: a <c>th</c> with no text is
    /// announced as nothing, and a reader tabbing the header row cannot tell what it is. The label
    /// still names the column's filter popover and its sort button, so it must stay meaningful.</summary>
    public bool LabelHidden { get; init; }

    /// <summary>Show a sort toggle in the header.</summary>
    public bool Sortable { get; init; }

    /// <summary>Offer a column filter of this type (null = no filter).</summary>
    public FdyColumnFilterType? Filter { get; init; }

    /// <summary>Cell alignment (null = left).</summary>
    public FdyColumnAlign? Align { get; init; }

    /// <summary>Render cells in the monospace data font (<c>.fdy-mono</c>).</summary>
    public bool Mono { get; init; }

    /// <summary>Override the comparator type; defaults to one derived from <see cref="Filter"/>, else Text.</summary>
    public FdyColumnType? SortType { get; init; }

    /// <summary>Typed value accessor for sort/filter/default cell text; defaults to the property named
    /// <see cref="Key"/> (reflection). Prefer setting this for strongly-typed, allocation-free access.</summary>
    public Func<TRow, object?>? Value { get; init; }

    /// <summary>Explicit options for an enum filter; defaults to the distinct values in the current
    /// rows. Provide this in server-paged mode, where the rows on screen are only one page.</summary>
    public IReadOnlyList<string>? Options { get; init; }

    /// <summary>Custom cell template; defaults to the accessor's text.</summary>
    public RenderFragment<TRow>? Cell { get; init; }
}
