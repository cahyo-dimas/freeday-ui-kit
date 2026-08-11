using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;

namespace Freeday.Blazor;

public partial class FdyTable<TRow>
{
    /// <summary>Column definitions (order = display order).</summary>
    [Parameter, EditorRequired] public IReadOnlyList<FdyTableColumn<TRow>> Columns { get; set; } = Array.Empty<FdyTableColumn<TRow>>();

    /// <summary>The rows to display. The single source of truth, read on every render.</summary>
    [Parameter, EditorRequired] public IReadOnlyList<TRow> Rows { get; set; } = Array.Empty<TRow>();

    /// <summary>A stable key per row (for keying + expansion identity).</summary>
    [Parameter, EditorRequired] public Func<TRow, object> RowKey { get; set; } = default!;

    /// <summary>Controlled sort. Wire <c>@bind-Sort</c> (or SortChanged) to own sorting; omit for internal.</summary>
    [Parameter] public FdySortState? Sort { get; set; }
    [Parameter] public EventCallback<FdySortState?> SortChanged { get; set; }

    /// <summary>Controlled filter map keyed by column key. Wire FiltersChanged to own filtering; omit for internal.</summary>
    [Parameter] public IReadOnlyDictionary<string, FdyColumnFilter>? Filters { get; set; }
    [Parameter] public EventCallback<IReadOnlyDictionary<string, FdyColumnFilter>> FiltersChanged { get; set; }

    /// <summary>Server pagination state (0-based). Presence switches the table into server mode.</summary>
    [Parameter] public FdyPageState? Page { get; set; }
    [Parameter] public EventCallback<FdyPageState> PageChanged { get; set; }

    /// <summary>Client-side page size when <see cref="Page"/> is absent; 0 = render all rows (no pager).</summary>
    [Parameter] public int PageSize { get; set; }

    [Parameter] public bool Loading { get; set; }
    [Parameter] public string LoadingText { get; set; } = "Loading…";
    [Parameter] public string EmptyText { get; set; } = "No data";
    [Parameter] public RenderFragment? EmptyContent { get; set; }
    [Parameter] public string? AriaLabel { get; set; }

    /// <summary>Opt in to row activation: rows become focusable and raise <see cref="RowActivate"/>.</summary>
    [Parameter] public bool RowActivatable { get; set; }
    [Parameter] public EventCallback<TRow> RowActivate { get; set; }

    /// <summary>Per-row class hook, e.g. to mark a selected row.</summary>
    [Parameter] public Func<TRow, string?>? RowClass { get; set; }

    /// <summary>Controlled: row keys whose <see cref="RowDetail"/> is shown beneath them.</summary>
    [Parameter] public IReadOnlyList<object>? ExpandedKeys { get; set; }
    [Parameter] public RenderFragment<TRow>? RowDetail { get; set; }

    /// <summary>Optional toolbar (search box, actions) above the table.</summary>
    [Parameter] public RenderFragment? Toolbar { get; set; }

    private FdySortState? _internalSort;
    private Dictionary<string, FdyColumnFilter> _internalFilters = new();
    private int _internalPageIndex;

    private List<TRow> _displayRows = new();
    private int _totalCount;

    private static readonly IReadOnlyDictionary<string, FdyColumnFilter> EmptyFilters = new Dictionary<string, FdyColumnFilter>();

    private bool ServerPaged => Page is not null;
    private bool SortControlled => ServerPaged || SortChanged.HasDelegate;
    private bool FiltersControlled => ServerPaged || FiltersChanged.HasDelegate;

    private FdySortState? EffectiveSort => SortControlled ? Sort : _internalSort;
    private IReadOnlyDictionary<string, FdyColumnFilter> EffectiveFilters =>
        FiltersControlled ? (Filters ?? EmptyFilters) : _internalFilters;

    private int PageSizeEff => ServerPaged ? Page!.Size : PageSize;
    private int CurrentPage1 => (ServerPaged ? Page!.Index : _internalPageIndex) + 1;
    private int TotalCount => _totalCount;
    private int TotalPages => PageSizeEff > 0 ? Math.Max(1, (int)Math.Ceiling((double)TotalCount / PageSizeEff)) : 1;
    private bool HasPager => PageSizeEff > 0 && TotalPages > 1;
    private List<int?> Pages => TableModel.PageWindow(CurrentPage1, TotalPages);
    private int RangeFrom => TotalCount == 0 ? 0 : (CurrentPage1 - 1) * PageSizeEff + 1;
    private int RangeTo => TotalCount == 0 ? 0 : RangeFrom - 1 + _displayRows.Count;

    protected override void OnParametersSet() => Recompute();

    // Recompute the visible rows from the current effective sort/filter/page. Called on every
    // parameter change and after any internal-state mutation (sort/filter/page click).
    private void Recompute()
    {
        List<TRow> filteredSorted = ServerPaged
            ? Rows.ToList()
            : TableModel.SortRows(TableModel.FilterRows(Rows, Columns, EffectiveFilters), Columns, EffectiveSort);

        _totalCount = ServerPaged ? Page!.Total : filteredSorted.Count;

        if (!ServerPaged && PageSize > 0)
        {
            // Keep the page in range when a filter shrank the row set.
            int tp = Math.Max(1, (int)Math.Ceiling((double)_totalCount / PageSize));
            if (_internalPageIndex > tp - 1) _internalPageIndex = Math.Max(0, tp - 1);
            _displayRows = TableModel.Paginate(filteredSorted, _internalPageIndex, PageSize);
        }
        else
        {
            _displayRows = filteredSorted;
        }
    }

    private FdyColumnFilter? GetFilter(string key) => EffectiveFilters.TryGetValue(key, out FdyColumnFilter? f) ? f : null;

    private IReadOnlyList<string> EnumOptions(FdyTableColumn<TRow> col) =>
        col.Options ?? TableModel.DistinctValues(Rows, col);

    private string? AriaSortOf(FdyTableColumn<TRow> col)
    {
        FdySortState? s = EffectiveSort;
        if (s is null || s.Key != col.Key) return null;
        return s.Dir == FdySortDir.Asc ? "ascending" : "descending";
    }

    private async Task OnSortClick(FdyTableColumn<TRow> col)
    {
        if (!col.Sortable) return;
        FdySortState? cur = EffectiveSort;
        FdySortState next = cur is not null && cur.Key == col.Key
            ? new FdySortState(col.Key, cur.Dir == FdySortDir.Asc ? FdySortDir.Desc : FdySortDir.Asc)
            : new FdySortState(col.Key, FdySortDir.Asc);
        if (SortControlled)
        {
            await SortChanged.InvokeAsync(next);
        }
        else
        {
            _internalSort = next;
            _internalPageIndex = 0;
            Recompute();
        }
    }

    private async Task OnFilterChange(FdyTableColumn<TRow> col, FdyColumnFilter? filter)
    {
        Dictionary<string, FdyColumnFilter> next = new(EffectiveFilters);
        if (filter is null) next.Remove(col.Key);
        else next[col.Key] = filter;
        if (FiltersControlled)
        {
            await FiltersChanged.InvokeAsync(next);
        }
        else
        {
            _internalFilters = next;
            _internalPageIndex = 0;
            Recompute();
        }
    }

    private async Task GoTo(int page1)
    {
        int clamped = Math.Min(Math.Max(1, page1), TotalPages);
        int index0 = clamped - 1;
        if (ServerPaged)
        {
            await PageChanged.InvokeAsync(new FdyPageState(index0, Page!.Size, Page.Total));
        }
        else
        {
            _internalPageIndex = index0;
            Recompute();
        }
    }

    private string? CellClass(FdyTableColumn<TRow> col) => col.Mono ? "fdy-mono" : null;

    private static string? AlignStyle(FdyTableColumn<TRow> col) => col.Align switch
    {
        FdyColumnAlign.Right => "text-align:right",
        FdyColumnAlign.Center => "text-align:center",
        FdyColumnAlign.Left => "text-align:left",
        _ => null,
    };

    private string RowClasses(TRow row)
    {
        string? custom = RowClass?.Invoke(row);
        string activatable = RowActivatable ? "fdy-table__row--activatable" : string.Empty;
        return string.Join(" ", new[] { custom, activatable }.Where(s => !string.IsNullOrEmpty(s))!);
    }

    private async Task OnRowClick(TRow row)
    {
        if (RowActivatable) await RowActivate.InvokeAsync(row);
    }

    // Enter/Space activate a focused row. Blazor's KeyboardEventArgs can't tell whether the row
    // itself vs an inner control is the target, so activatable rows should not embed focusable
    // controls (the common drill-in-row pattern) — matching the Vue guard's practical effect.
    private async Task OnRowKeydown(KeyboardEventArgs e, TRow row)
    {
        if (!RowActivatable) return;
        if (e.Key is not ("Enter" or " ")) return;
        await RowActivate.InvokeAsync(row);
    }

    private bool IsExpanded(TRow row) => ExpandedKeys?.Contains(RowKey(row)) == true;
    private string? ExpandedAttr(TRow row) => RowDetail is null ? null : (IsExpanded(row) ? "true" : "false");
}
