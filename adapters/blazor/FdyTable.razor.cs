using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.JSInterop;

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
    /// Controlled client-side page index (0-based). Set it, with <see cref="PageSize"/>, without
    /// <see cref="Page"/>, to own the page while the table keeps doing filter/sort/paginate. That is
    /// what lets an EXTERNAL pager drive the table: a responsive screen that hides the datatable below
    /// the <c>md</c> breakpoint and renders a card list from <see cref="Process"/> can render one pager
    /// for both breakpoints and bind it here. Leave null for the internal index (unchanged default).
    /// </summary>
    /// <summary>Withhold the table's own footer (pager + range) so the screen can render one.
    /// Server mode had no way to do this: the app owns the page there anyway, and was still handed a
    /// second control. Client mode's counterpart is <see cref="PageIndex"/>. Default true.</summary>
    [Parameter] public bool Pager { get; set; } = true;

    /// <summary>
    /// Offer a rows-per-page control in the footer, beside the range and the pager. Leave null for
    /// none (unchanged default). Every back office has one, and a table that renders two thirds of
    /// its own footer forces the app to rebuild all three to add the last (#008).
    /// Server mode reports the pick through <see cref="PageChanged"/>, same callback as a page
    /// click, with a new size. Client mode applies it internally and also raises
    /// <see cref="PageSizeChanged"/>, so the control works with nothing wired.
    /// </summary>
    [Parameter] public IReadOnlyList<int>? PageSizes { get; set; }

    /// <summary>Raised in client mode when the reader picks a new rows-per-page. The table has
    /// already applied it, this is for a caller that wants to persist the choice.</summary>
    [Parameter] public EventCallback<int> PageSizeChanged { get; set; }

    [Parameter] public int? PageIndex { get; set; }

    /// <summary>Raised in client mode with <see cref="PageIndex"/> set: the table asks for a new
    /// 0-based index (pager click, reset to 0 after sort/filter, or a clamp after filtering).</summary>
    [Parameter] public EventCallback<int> PageIndexChanged { get; set; }

    /// <summary>Raised whenever the processed page of rows (after filter/sort/paginate) or the total
    /// changes, in BOTH modes, so the same processed set can drive a card list, a summary or an
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

    /// <summary>Render the checkbox column and the bulk bar.</summary>
    [Parameter] public bool Selectable { get; set; }

    /// <summary>
    /// Controlled selection, as <see cref="RowKey"/> values. Wire <c>@bind-SelectedKeys</c> to own
    /// it; omit for internal (the column still works with nothing wired).
    /// </summary>
    [Parameter] public IReadOnlyList<object>? SelectedKeys { get; set; }
    [Parameter] public EventCallback<IReadOnlyList<object>> SelectedKeysChanged { get; set; }

    /// <summary>Bulk-bar count, <c>{n}</c> substituted.</summary>
    [Parameter] public string SelectedText { get; set; } = "{n} selected";
    [Parameter] public string ClearSelectionText { get; set; } = "Clear";
    [Parameter] public string SelectAllLabel { get; set; } = "Select all rows on this page";
    [Parameter] public string SelectRowLabel { get; set; } = "Select row";
    [Parameter] public string BulkLabel { get; set; } = "Bulk actions";

    /// <summary>Bulk-bar actions (Blazor equivalent of Vue's <c>bulk-actions</c> slot).</summary>
    [Parameter] public RenderFragment? BulkContent { get; set; }

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

    /* Client-mode rows-per-page. PageSize is a plain parameter with no callback, so a footer control
     * that only reported would do nothing in the app that wired nothing, the table applies the pick
     * itself and reports it. An explicit change to the parameter wins back (see OnParametersSet). */
    private int? _internalPageSize;
    private int _prevPageSize;

    private int PageSizeEff => ServerPaged ? Page!.Size : (_internalPageSize ?? PageSize);
    private int CurrentPage1 => (ServerPaged ? Page!.Index : ClientPageIndex) + 1;
    private int TotalCount => _totalCount;
    private int TotalPages => PageSizeEff > 0 ? Math.Max(1, (int)Math.Ceiling((double)TotalCount / PageSizeEff)) : 1;
    /// What the footer needs, in both modes: the range, the pager and the size control are all
    /// derived from these three numbers, so the table hands them over rather than restating them.
    private FdyPageState FooterPage => new(CurrentPage1 - 1, PageSizeEff, TotalCount);

    protected override void OnParametersSet()
    {
        if (_prevPageSize != PageSize)
        {
            _prevPageSize = PageSize;
            _internalPageSize = null;
        }
        Recompute();
    }

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
        await SyncSelectAllIndeterminateAsync();
    }

    // Recompute the visible rows from the current effective sort/filter/page. Called on every
    // parameter change and after any internal-state mutation (sort/filter/page click).
    private void Recompute()
    {
        List<TRow> filteredSorted = ServerPaged
            ? Rows.ToList()
            : TableModel.SortRows(TableModel.FilterRows(Rows, Columns, EffectiveFilters), Columns, EffectiveSort);

        _totalCount = ServerPaged ? Page!.Total : filteredSorted.Count;

        if (!ServerPaged && PageSizeEff > 0)
        {
            // Keep the page in range when a filter shrank the row set.
            int tp = Math.Max(1, (int)Math.Ceiling((double)_totalCount / PageSizeEff));
            if (ClientPageIndex > tp - 1)
            {
                if (PageIndexControlled) _pendingClamp = Math.Max(0, tp - 1);
                else _internalPageIndex = Math.Max(0, tp - 1);
            }
            _displayRows = TableModel.Paginate(filteredSorted, Math.Min(ClientPageIndex, tp - 1), PageSizeEff);
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

    // One callback carries both intents, so which one it was is read off Size.
    private async Task OnFooterPage(FdyPageState next)
    {
        if (next.Size != PageSizeEff)
        {
            if (ServerPaged)
            {
                await PageChanged.InvokeAsync(next);
            }
            else
            {
                _internalPageSize = next.Size;
                await PageSizeChanged.InvokeAsync(next.Size);
                await SetClientPageAsync(next.Index);
            }
            return;
        }
        await GoTo(next.Index + 1);
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
    // controls (the common drill-in-row pattern), matching the Vue guard's practical effect.
    private async Task OnRowKeydown(KeyboardEventArgs e, TRow row)
    {
        if (!RowActivatable) return;
        if (e.Key is not ("Enter" or " ")) return;
        await RowActivate.InvokeAsync(row);
    }

    // Selection is keyed by RowKey, exactly as ExpandedKeys is, and for the same reason: a key
    // survives the re-fetch that replaces every row object, an object identity does not.
    private List<object> _internalSelectedKeys = new();
    private bool SelectionControlled => SelectedKeysChanged.HasDelegate;
    private IReadOnlyList<object> EffectiveSelectedKeys =>
        SelectionControlled ? (SelectedKeys ?? Array.Empty<object>()) : _internalSelectedKeys;
    private int SelectedCount => EffectiveSelectedKeys.Count;

    // The select-all box acts on the CURRENT PAGE, not on every filtered row: a header checkbox that
    // silently selects rows the reader cannot see is how bulk deletes go wrong. Keys picked on other
    // pages are preserved rather than dropped, so paging away and back does not lose them.
    private List<object> PageKeys => _displayRows.Select(RowKey).ToList();
    private bool AllPageSelected
    {
        get
        {
            List<object> keys = PageKeys;
            return keys.Count > 0 && keys.All(EffectiveSelectedKeys.Contains);
        }
    }
    private bool SomePageSelected => !AllPageSelected && PageKeys.Any(EffectiveSelectedKeys.Contains);

    private async Task SetSelection(List<object> keys)
    {
        if (!SelectionControlled) _internalSelectedKeys = keys;
        if (SelectedKeysChanged.HasDelegate) await SelectedKeysChanged.InvokeAsync(keys);
    }

    private bool IsSelected(TRow row) => EffectiveSelectedKeys.Contains(RowKey(row));

    private async Task ToggleRow(TRow row, bool selected)
    {
        object key = RowKey(row);
        List<object> next = EffectiveSelectedKeys.Where(k => !Equals(k, key)).ToList();
        if (selected) next.Add(key);
        await SetSelection(next);
    }

    private async Task ToggleAllOnPage(bool selected)
    {
        HashSet<object> onPage = PageKeys.ToHashSet();
        List<object> offPage = EffectiveSelectedKeys.Where(k => !onPage.Contains(k)).ToList();
        if (selected) offPage.AddRange(PageKeys);
        await SetSelection(offPage);
    }

    private Task ClearSelection() => SetSelection(new List<object>());

    [Inject] private IJSRuntime JS { get; set; } = default!;
    private ElementReference _selectAllRef;
    private bool? _pushedIndeterminate;

    /// <summary>
    /// <c>indeterminate</c> is a DOM property with no HTML attribute, so Blazor's renderer cannot
    /// express it — without this the tri-state select-all box would render as a plain unchecked one
    /// whenever only some rows on the page are selected. Pushed only when it actually changed, and
    /// only while <see cref="Selectable"/>, so a table without a checkbox column makes no JS call at
    /// all. The table's subtree already depends on the JS bridge (FdyTableFilter), so this adds no
    /// new dependency, and running in OnAfterRender keeps it out of the prerender pass where there
    /// is no element to touch yet.
    /// </summary>
    private async Task SyncSelectAllIndeterminateAsync()
    {
        if (!Selectable) return;
        bool mixed = SomePageSelected;
        if (_pushedIndeterminate == mixed) return;
        _pushedIndeterminate = mixed;
        try
        {
            await JS.InvokeVoidAsync("FreedayBlazor.setIndeterminate", _selectAllRef, mixed);
        }
        catch (JSDisconnectedException)
        {
            // circuit/runtime already gone
        }
    }

    private string SelectedLabel() => SelectedText.Replace("{n}", SelectedCount.ToString());

    private string? SelectedAttr(TRow row) => Selectable ? (IsSelected(row) ? "true" : "false") : null;

    // The checkbox column widens every full-width row (loading, empty, row detail) by one. Deriving
    // it once is what keeps a later column change from leaving one of the three behind.
    private int ColSpan => Columns.Count + (Selectable ? 1 : 0);

    private bool IsExpanded(TRow row) => ExpandedKeys?.Contains(RowKey(row)) == true;
    private string? ExpandedAttr(TRow row) => RowDetail is null ? null : (IsExpanded(row) ? "true" : "false");
}
