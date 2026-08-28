using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyCfl<TRow>
{
    /// <summary>The picked row (or null). Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public TRow? Value { get; set; }
    [Parameter] public EventCallback<TRow?> ValueChanged { get; set; }

    /// <summary>Async data source: <c>(query, page) =&gt; a page of rows</c>. The caller owns paging
    /// and server-side search; page 0 is the first page.</summary>
    [Parameter, EditorRequired] public Func<string, int, Task<CflPage<TRow>>> LoadPage { get; set; } = default!;

    /// <summary>Result table columns.</summary>
    [Parameter, EditorRequired] public IReadOnlyList<CflColumn<TRow>> Columns { get; set; } = Array.Empty<CflColumn<TRow>>();

    /// <summary>Projects the picked row to the text shown in the read-only field.</summary>
    [Parameter, EditorRequired] public Func<TRow, string> Display { get; set; } = default!;

    /// <summary>A stable key per row (for diffing).</summary>
    [Parameter, EditorRequired] public Func<TRow, string> RowKey { get; set; } = default!;

    [Parameter] public string Title { get; set; } = "Choose data";
    [Parameter] public string? Placeholder { get; set; }
    [Parameter] public string SearchPlaceholder { get; set; } = "Search…";
    [Parameter] public string LoadingText { get; set; } = "Loading…";
    [Parameter] public string EmptyText { get; set; } = "No results.";
    [Parameter] public string ErrorText { get; set; } = "Failed to load.";
    [Parameter] public string RetryText { get; set; } = "Try again";
    [Parameter] public string MoreText { get; set; } = "Load more";
    [Parameter] public string CloseLabel { get; set; } = "Close";

    /// <summary>aria-label for the button that opens the picker.</summary>
    [Parameter] public string OpenLabel { get; set; } = "Open search";

    /// <summary>Tick rows and commit them together, instead of committing the row that was clicked.
    /// The kit's own enhancer offers this (<c>data-fdy-cfl-multiple</c>); a screen that gathers six
    /// expense claims onto one document wants one dialog, not six. Binds <see cref="Values"/>.</summary>
    [Parameter] public bool Multiple { get; set; }

    /// <summary>The committed rows when <see cref="Multiple"/> is set. Vue and React widen their
    /// single model to an array; C# takes a second pair instead, so neither is nullable-of-union.</summary>
    [Parameter] public IReadOnlyList<TRow>? Values { get; set; }

    [Parameter] public EventCallback<IReadOnlyList<TRow>?> ValuesChanged { get; set; }

    /// <summary>Footer label while picking; <c>{n}</c> is replaced by the tick count.</summary>
    [Parameter] public string SelectedText { get; set; } = "{n} selected";

    /// <summary>The multi-select commit button.</summary>
    [Parameter] public string ConfirmText { get; set; } = "Confirm";

    /// <summary>Footer hint in single mode.</summary>
    [Parameter] public string HintText { get; set; } = "Click a row to choose it";

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: shows the value but the search dialog can't be opened.</summary>
    [Parameter] public bool Readonly { get; set; }
    [Parameter] public bool Invalid { get; set; }
    /// <summary>Render a clear button when a row is picked, so an OPTIONAL foreign key can be unset.
    /// <c>Value</c> is already <c>TRow?</c>; without this the component can never produce null.</summary>
    [Parameter] public bool Clearable { get; set; }
    /// <summary>aria-label for the clear button (when <see cref="Clearable"/>).</summary>
    [Parameter] public string ClearLabel { get; set; } = "Clear selection";
    [Parameter] public string? AriaLabelledby { get; set; }

    /// <summary>Debounce (ms) between a keystroke and the search request.</summary>
    [Parameter] public int SearchDebounceMs { get; set; } = 250;

    /// <summary>Render the dialog and NO field, for a caller whose trigger is already its own — a chip,
    /// a table cell, a menu item — opened through <c>@ref</c>: <c>await picker.OpenAsync()</c>. The raw
    /// path has had exactly this since the enhancer's <c>[data-fdy-cfl-open]</c>. <c>Placeholder</c>,
    /// <c>Clearable</c> and the field's aria parameters have nothing to name here and are ignored;
    /// <c>Disabled</c> and <c>Readonly</c> still refuse to open.</summary>
    [Parameter] public bool DialogOnly { get; set; }

    private readonly string _titleId = $"fdy-cfl-{Guid.NewGuid():N}-title";
    private int _dialogToken;
    private bool _open;
    private string _query = string.Empty;
    private readonly List<TRow> _rows = new();
    private int _page;
    private bool _hasMore;
    private bool _loading;
    private string? _error;
    private int _reqSeq;      // out-of-order response guard
    private int _debounceSeq; // supersedes stale debounced searches

    private string DisplayValue => Value is null ? string.Empty : Display(Value);
    private string FieldGroupClass => Invalid ? "fdy-input-group fdy-input-group--error" : "fdy-input-group";
    private bool IsInitialLoading => _loading && _rows.Count == 0;
    private bool IsBlockingError => _error is not null && _rows.Count == 0;
    private bool IsEmpty => !_loading && _error is null && _rows.Count == 0;

    // The dialog content is Blazor-rendered (so no ShouldRender override); only its show/close +
    // Esc/backdrop dismissal go through interop.
    protected override async ValueTask HydrateAsync()
        => _dialogToken = await JS.InvokeAsync<int>("FreedayBlazor.dialogInit", Root, Self, nameof(OnDismiss), true);

    /// <summary>Open the picker. Public because with <see cref="DialogOnly"/> there is no field to
    /// open it, and because a caller with its own trigger is the case that made #054: it guards
    /// exactly as the built trigger does, so this cannot bypass Disabled/Readonly.</summary>
    public async Task OpenAsync()
    {
        if (Disabled || Readonly || _open) return;
        _open = true;
        _query = string.Empty;
        /* Re-seeded per open, so Cancel really is a cancel: the ticks start as whatever the caller holds. */
        _picked.Clear();
        if (Multiple && Values is not null) _picked.AddRange(Values);
        await JS.InvokeVoidAsync("FreedayBlazor.dialogShow", Root);
        await LoadAsync(reset: true);
    }

    /// <summary>Close the picker without committing, the same path Esc and the footer button take.</summary>
    public async Task CloseAsync()
    {
        if (!_open) return;
        _open = false;
        await JS.InvokeVoidAsync("FreedayBlazor.dialogClose", Root);
    }

    /// <summary>Invoked by the bridge on Esc / backdrop dismiss.</summary>
    [JSInvokable]
    public Task OnDismiss() => CloseAsync();

    private async Task OnQueryChangedAsync()
    {
        int seq = ++_debounceSeq;
        if (SearchDebounceMs > 0)
        {
            await Task.Delay(SearchDebounceMs);
            if (seq != _debounceSeq) return; // a newer keystroke superseded this one
        }
        await LoadAsync(reset: true);
    }

    private async Task LoadAsync(bool reset)
    {
        _loading = true;
        _error = null;
        StateHasChanged();
        int seq = ++_reqSeq;
        try
        {
            CflPage<TRow> result = await LoadPage(_query, reset ? 0 : _page);
            if (seq != _reqSeq) return; // a newer request superseded this response
            if (reset) _rows.Clear();
            _rows.AddRange(result.Rows);
            _hasMore = result.HasMore;
            _page = reset ? 1 : _page + 1;
        }
        catch (Exception ex)
        {
            if (seq == _reqSeq) _error = string.IsNullOrEmpty(ex.Message) ? ErrorText : ex.Message;
        }
        finally
        {
            if (seq == _reqSeq)
            {
                _loading = false;
                StateHasChanged();
            }
        }
    }

    private Task LoadMoreAsync() => _hasMore && !_loading ? LoadAsync(reset: false) : Task.CompletedTask;

    private Task RetryAsync() => LoadAsync(reset: true);

    /// <summary>Unset the value. Not "choosing nothing": the dialog is not involved, so this neither
    /// opens nor closes it.</summary>
    private async Task ClearAsync()
    {
        _picked.Clear();
        if (Multiple)
        {
            Values = null;
            await ValuesChanged.InvokeAsync(null);
            return;
        }
        Value = default;
        await ValueChanged.InvokeAsync(default);
    }

    /* The ticks live here, not in Values, because a multi dialog is only committed at Confirm:
       closing it must leave the caller's value exactly as it was. Seeded from Values on open. */
    private readonly List<TRow> _picked = new();

    private string SelectedLabel => SelectedText.Replace("{n}", _picked.Count.ToString());

    private bool IsPicked(TRow row)
    {
        string key = RowKey(row);
        return _picked.Exists(r => RowKey(r) == key);
    }

    private void TogglePick(TRow row)
    {
        string key = RowKey(row);
        int at = _picked.FindIndex(r => RowKey(r) == key);
        if (at == -1) _picked.Add(row);
        else _picked.RemoveAt(at);
    }

    /* A click means "tick this" in multi and "this is my answer" in single, the whole difference. */
    private async Task RowClickAsync(TRow row)
    {
        if (Multiple) TogglePick(row);
        else await ChooseAsync(row);
    }

    private async Task ConfirmAsync()
    {
        IReadOnlyList<TRow> picks = _picked.ToArray();
        Values = picks;
        await ValuesChanged.InvokeAsync(picks);
        await CloseAsync();
    }

    private async Task ChooseAsync(TRow row)
    {
        Value = row;
        await ValueChanged.InvokeAsync(row);
        await CloseAsync();
    }

    protected override async ValueTask CleanupAsync()
    {
        if (_dialogToken != 0)
        {
            await JS.InvokeVoidAsync("FreedayBlazor.dialogDispose", _dialogToken);
        }
    }
}
