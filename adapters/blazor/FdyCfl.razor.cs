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

    private async Task OpenAsync()
    {
        if (Disabled || Readonly || _open) return;
        _open = true;
        _query = string.Empty;
        await JS.InvokeVoidAsync("FreedayBlazor.dialogShow", Root);
        await LoadAsync(reset: true);
    }

    private async Task CloseAsync()
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
        Value = default;
        await ValueChanged.InvokeAsync(default);
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
