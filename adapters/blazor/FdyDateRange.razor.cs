using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyDateRange
{
    /// <summary>Range start (ISO <c>yyyy-MM-dd</c> or ""). Two-way bindable via <c>@bind-From</c>.</summary>
    [Parameter] public string? From { get; set; }
    [Parameter] public EventCallback<string?> FromChanged { get; set; }

    /// <summary>Range end (ISO <c>yyyy-MM-dd</c> or ""). Two-way bindable via <c>@bind-To</c>.</summary>
    [Parameter] public string? To { get; set; }
    [Parameter] public EventCallback<string?> ToChanged { get; set; }

    [Parameter] public string? AriaLabel { get; set; }
    [Parameter] public string? FromPlaceholder { get; set; }
    [Parameter] public string? ToPlaceholder { get; set; }
    [Parameter] public string? Min { get; set; }
    [Parameter] public string? Max { get; set; }
    [Parameter] public string Separator { get; set; } = "–";

    private int _token;

    // initAll(Root) links the daterange (descendant) and inits both child pickers.
    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayDatepicker.initAll", Root);

    protected override async ValueTask OnHydratedAsync()
        => _token = await JS.InvokeAsync<int>("FreedayBlazor.dateRangeOn", Root, Self, nameof(OnChange));

    protected override bool ShouldRender() => !Hydrated;

    /// <summary>Invoked by the bridge for either child's change; routes by data-role.</summary>
    [JSInvokable]
    public async Task OnChange(RangeDetail detail)
    {
        if (detail.Role == "from")
        {
            From = detail.Value;
            await FromChanged.InvokeAsync(detail.Value);
        }
        else if (detail.Role == "to")
        {
            To = detail.Value;
            await ToChanged.InvokeAsync(detail.Value);
        }
    }

    protected override async ValueTask CleanupAsync()
    {
        if (_token != 0)
        {
            await JS.InvokeVoidAsync("FreedayBlazor.off", _token);
        }
    }

    public sealed record RangeDetail(string? Value, string? Role);
}
