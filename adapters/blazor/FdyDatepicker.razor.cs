using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyDatepicker
{
    /// <summary>Selected date as an ISO string (<c>yyyy-MM-dd</c>), or "" when unset.
    /// Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>Accessible label for the trigger.</summary>
    [Parameter] public string? Label { get; set; }
    [Parameter] public string? Placeholder { get; set; }

    /// <summary>Earliest selectable date (ISO <c>yyyy-MM-dd</c>); days before it are disabled.</summary>
    [Parameter] public string? Min { get; set; }
    [Parameter] public string? Max { get; set; }

    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayDatepicker.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-datepicker-change", nameof(OnChange));

    // The enhancer owns the built trigger + calendar; never let Blazor re-render the seed.
    protected override bool ShouldRender() => !Hydrated;

    /// <summary>Invoked by the bridge when the user picks (or clears) a date.</summary>
    [JSInvokable]
    public async Task OnChange(ChangeDetail detail)
    {
        Value = detail.Value;
        await ValueChanged.InvokeAsync(detail.Value);
    }

    /// <summary>The detail shape of the enhancer's <c>fdy-datepicker-change</c> event.</summary>
    public sealed record ChangeDetail(string? Value, string? Date);
}
