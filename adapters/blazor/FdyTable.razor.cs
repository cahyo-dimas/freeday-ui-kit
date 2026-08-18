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

    /// <summary>
    /// Controlled client-side page index (0-based). Set it — with <see cref="PageSize"/>, without
    /// <see cref="Page"/> — to own the page while the table keeps doing filter/sort/paginate. That is
    /// what lets an EXTERNAL pager drive the table: a responsive screen that hides the datatable below
    /// the <c>md</c> breakpoint and renders a card list from <see cref="Process"/> can render one pager
    /// for both breakpoints and bind it here. Leave null for the internal index (unchanged default).
    /// </summary>
    /// <summary>Withhold the table's own footer (pager + range) so the screen can render one.
    /// Server mode had no way to do this: the app owns the page there anyway, and was still handed a
    /// second control. Client mode's counterpart is <see cref="PageIndex"/>. Default true.</summary>
    [Parameter] public bool Pager { get; set; } = true;

    [Parameter] public int? PageIndex { get; set; }

    /// <summary>Raised in client mode with <see cref="PageIndex"/> set: the table asks for a new
    /// 0-based index (pager click, reset to 0 after sort/filter, or a clamp after filtering).</summary>
    [Parameter] public EventCallback<int> PageIndexChanged { get; set; }

    /// <summary>Raised whenever the processed page of rows (after filter/sort/paginate) or the total
    /// changes, in BOTH modes — so the same processed set can drive a card list, a summary or an
    /// export without re-deriving the pipeline. Mirrors <c>process</c> in the Vue/React adapters.</summary>
    [Parameter] public EventCallback<FdyTableProcess<TRow>> Process { get; set; }

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
    // Recompute() is synchronous (it runs from OnParametersSet), but notifying the parent is async.
    // Both notifications are therefore queued here and flushed in OnAfterRenderAsync.
    private int? _pendingClamp;
    private bool _processDirty;

    private static readonly IReadOnlyDictionary<string, FdyColumnFilter> EmptyFilters = new Dictionary<string, FdyColumnFilter>();

    private bool ServerPaged => Page is not null;

    // Client-side page index: the parameter when the parent owns it, the field otherwise. Every read
    // goes through ClientPageIndex and every write through SetClientPageAsync.
    private bool PageIndexControlled => PageIndex is not null;
    private int ClientPageIndex => PageIndexControlled ? Math.Max(0, PageIndex!.Value) : _internalPageIndex;
    private bool SortControlled => ServerPaged || SortChanged.HasDelegate;
    private bool FiltersControlled => ServerPaged || FiltersChanged.HasDelegate;

    private FdySortState? EffectiveSort => SortControlled ? Sort : _internalSort;
    private IReadOnlyDictionary<string, FdyColumnFilter> EffectiveFilters =>
        FiltersControlled ? (Filters ?? EmptyFilters) : _internalFilters;

    private int PageSizeEff => ServerPaged ? Page!.Size : PageSize;
    private int CurrentPage1 => (ServerPaged ? Page!.Index : ClientPageIndex) + 1;
    private int TotalCount => _totalCount;
    private int TotalPages => PageSizeEff > 0 ? Math.Max(1, (int)Math.Ceiling((double)TotalCount / PageSizeEff)) : 1;
    private bool HasPager => Pager && PageSizeEff > 0 && TotalPages > 1;
    private List<int?> Pages => TableModel.PageWindow(CurrentPage1, TotalPages);
    private int RangeFrom => TotalCount == 0 ? 0 : (CurrentPage1 - 1) * PageSizeEff + 1;
    private int RangeTo => TotalCount == 0 ? 0 : RangeFrom - 1 + _displayRows.Count;

    protected override void OnParametersSet() => Recompute();

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (_pendingClamp is int clamp)
        {
            _pendingClamp = null;
            await PageIndexChanged.InvokeAsync(clamp);
        }
        if (_processDirty)
        {
            _processDirty = false;
            if (Process.HasDelegate) await Process.InvokeAsync(new FdyTableProcess<TRow>(_displayRows, _totalCount));
        }
    }

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
            if (ClientPageIndex > tp - 1)
            {
                if (PageIndexControlled) _pendingClamp = Math.Max(0, tp - 1);
                else _internalPageIndex = Math.Max(0, tp - 1);
            }
            _displayRows = TableModel.Paginate(filteredSorted, Math.Min(ClientPageIndex, tp - 1), PageSize);
        }
        else
        {
            _displayRows = filteredSorted;
        }

        _processDirty = true;
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
            await SetClientPageAsync(0);
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
            await SetClientPageAsync(0);
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
            await SetClientPageAsync(index0);
        }
    }

    // One write path for the client index: ask the parent when controlled, mutate the field when not.
    private async Task SetClientPageAsync(int index0)
    {
        if (PageIndexControlled)
        {
            if (index0 != PageIndex) await PageIndexChanged.InvokeAsync(index0);
            else Recompute();
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
