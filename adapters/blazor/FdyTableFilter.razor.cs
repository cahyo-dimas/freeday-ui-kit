using System.Globalization;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyTableFilter : ComponentBase, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    [Parameter, EditorRequired] public string Label { get; set; } = string.Empty;
    [Parameter, EditorRequired] public FdyColumnFilterType Type { get; set; }

    /// <summary>The current filter for this column (null = none).</summary>
    [Parameter] public FdyColumnFilter? Filter { get; set; }

    /// <summary>Distinct values for an enum filter (computed by the parent over the full row set).</summary>
    [Parameter] public IReadOnlyList<string> Options { get; set; } = Array.Empty<string>();

    /// <summary>The next filter for this column, or null to clear it.</summary>
    [Parameter] public EventCallback<FdyColumnFilter?> OnChange { get; set; }

    private ElementReference _root;
    private bool _open;
    private DotNetObjectReference<FdyTableFilter>? _self;
    private int _outsideToken;

    private bool Active => TableModel.IsFilterActive(Filter);

    // Typed reads of the current filter for the inputs (fall back to the empty shape per type).
    private string TextValue => (Filter as FdyColumnFilter.Text)?.Value ?? string.Empty;
    private IReadOnlyList<string> EnumValues => (Filter as FdyColumnFilter.Enum)?.Values ?? Array.Empty<string>();
    private string NumMin => (Filter as FdyColumnFilter.Number)?.Min?.ToString(CultureInfo.InvariantCulture) ?? string.Empty;
    private string NumMax => (Filter as FdyColumnFilter.Number)?.Max?.ToString(CultureInfo.InvariantCulture) ?? string.Empty;
    private string DateFrom => (Filter as FdyColumnFilter.Date)?.From ?? string.Empty;
    private string DateTo => (Filter as FdyColumnFilter.Date)?.To ?? string.Empty;

    private async Task Apply(FdyColumnFilter next)
        => await OnChange.InvokeAsync(TableModel.IsFilterActive(next) ? next : null);

    private static double? ParseNum(string? v)
    {
        string t = (v ?? string.Empty).Trim();
        if (t.Length == 0) return null;
        return double.TryParse(t, NumberStyles.Any, CultureInfo.InvariantCulture, out double n) ? n : null;
    }

    private Task OnTextInput(ChangeEventArgs e) => Apply(new FdyColumnFilter.Text(e.Value?.ToString() ?? string.Empty));

    private Task OnEnumToggle(string value, bool check)
    {
        List<string> set = EnumValues.Where(v => v != value).ToList();
        if (check) set.Add(value);
        return Apply(new FdyColumnFilter.Enum(set));
    }

    private Task OnNumber(bool isMin, string? raw)
    {
        double? v = ParseNum(raw);
        return Apply(new FdyColumnFilter.Number(
            isMin ? v : ParseNum(NumMin),
            isMin ? ParseNum(NumMax) : v));
    }

    private Task OnDate(bool isFrom, string? raw)
    {
        string? val = string.IsNullOrEmpty(raw) ? null : raw;
        return Apply(new FdyColumnFilter.Date(
            isFrom ? val : (string.IsNullOrEmpty(DateFrom) ? null : DateFrom),
            isFrom ? (string.IsNullOrEmpty(DateTo) ? null : DateTo) : val));
    }

    private async Task Toggle()
    {
        if (_open) { await Close(); return; }
        _open = true;
        _self ??= DotNetObjectReference.Create(this);
        _outsideToken = await JS.InvokeAsync<int>("FreedayBlazor.onOutside", _root, _self, nameof(CloseFromJs));
    }

    private async Task Close()
    {
        if (!_open) return;
        _open = false;
        if (_outsideToken != 0)
        {
            try { await JS.InvokeVoidAsync("FreedayBlazor.off", _outsideToken); }
            catch (JSDisconnectedException) { /* runtime gone */ }
            _outsideToken = 0;
        }
    }

    /// <summary>Invoked by the bridge on an outside pointerdown or Escape.</summary>
    [JSInvokable]
    public async Task CloseFromJs()
    {
        await Close();
        StateHasChanged();
    }

    private async Task Reset()
    {
        await OnChange.InvokeAsync(null);
        await Close();
    }

    public async ValueTask DisposeAsync()
    {
        if (_outsideToken != 0)
        {
            try { await JS.InvokeVoidAsync("FreedayBlazor.off", _outsideToken); }
            catch (JSDisconnectedException) { /* runtime gone */ }
        }
        _self?.Dispose();
        GC.SuppressFinalize(this);
    }
}
