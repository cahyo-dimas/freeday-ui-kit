using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyTimepicker
{
    /// <summary>Selected time as <c>HH:MM</c> (24-hour), or "" when unset. Two-way bindable
    /// via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>Accessible label for the trigger.</summary>
    [Parameter] public string? Label { get; set; }

    /// <summary>Shown when there is no value. The enhancer's own default is <c>--:--</c>.</summary>
    [Parameter] public string? Placeholder { get; set; }

    /// <summary>Minutes between options. The enhancer's own default is 30.</summary>
    [Parameter] public int? Step { get; set; }

    /* null, not "30", for the default: an attribute the enhancer does not need is one no reader
       of the seed has to interpret, and the enhancer already falls back to 30. */
    private string? StepAttribute => Step is null ? null : Step.Value.ToString();

    /// <summary>Earliest selectable time (<c>HH:MM</c>). Default <c>00:00</c>.</summary>
    [Parameter] public string? Min { get; set; }

    /// <summary>Latest selectable time (<c>HH:MM</c>). Default <c>23:59</c>.</summary>
    [Parameter] public string? Max { get; set; }

    /// <summary>Id for the trigger the enhancer builds, so <c>aria-describedby</c> targets and
    /// other references can point at it. Note the trigger is a <c>&lt;button&gt;</c>, which is not
    /// a labelable element, so a <c>&lt;label for&gt;</c> will not activate it — use
    /// <see cref="Label"/>.</summary>
    [Parameter] public string? Id { get; set; }

    /// <summary>Id of the help or error text the trigger describes itself with.</summary>
    [Parameter] public string? Describedby { get; set; }

    /// <summary>Greyed and out of the tab order.</summary>
    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: focusable and showing its time, but the list will not open.
    /// Unlike <see cref="Disabled"/> it keeps tab order and is not greyed.</summary>
    [Parameter] public bool Readonly { get; set; }

    /// <summary>Marks the field invalid (<c>aria-invalid</c> + the error styling).</summary>
    [Parameter] public bool Invalid { get; set; }

    // The enhancer owns this control's DOM; init it directly (initAll would skip Root itself).
    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayTimepicker.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-time-select", nameof(OnSelect));

    // The enhancer owns the built trigger + listbox; never let Blazor re-render the seed.
    protected override bool ShouldRender() => !Hydrated;

    /* Which is exactly why the three states are pushed rather than re-rendered: the seed above is
       written once, so a page that disables this field later would otherwise be ignored. */
    protected override async Task OnParametersSetAsync()
    {
        if (!Hydrated) return;
        await JS.InvokeVoidAsync("FreedayTimepicker.setState", Root,
            new { disabled = Disabled, @readonly = Readonly, invalid = Invalid });
    }

    /// <summary>Invoked by the bridge when the reader picks a time (enhancer's fdy-time-select).</summary>
    [JSInvokable]
    public async Task OnSelect(SelectDetail detail)
    {
        Value = detail.Value;
        await ValueChanged.InvokeAsync(detail.Value);
    }

    /// <summary>The detail shape of the enhancer's <c>fdy-time-select</c> event.</summary>
    public sealed record SelectDetail(string Value);
}
