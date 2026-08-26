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

    /// <summary>Id for the trigger the enhancer builds, so a form's own label can point at it.</summary>
    [Parameter] public string? Id { get; set; }

    /// <summary>Id of the help or error text the trigger describes itself with.</summary>
    [Parameter] public string? Describedby { get; set; }

    /// <summary>Greyed and out of the tab order.</summary>
    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: focusable and showing its date, but the calendar will not open.
    /// Unlike <see cref="Disabled"/> it keeps tab order and is not greyed.</summary>
    [Parameter] public bool Readonly { get; set; }

    /// <summary>Marks the field invalid (<c>aria-invalid</c> + the error styling).</summary>
    [Parameter] public bool Invalid { get; set; }

    /* The calendar's own navigation labels. Month and weekday NAMES follow the page's `lang`
       through Intl and need nothing here; these are the buttons around them, which until 2.1.1
       were literals inside the enhancer that no host could reach. Leave one null and the
       enhancer's English default stands. */
    [Parameter] public string? PrevMonthLabel { get; set; }
    [Parameter] public string? NextMonthLabel { get; set; }
    [Parameter] public string? PrevYearLabel { get; set; }
    [Parameter] public string? NextYearLabel { get; set; }
    [Parameter] public string? PrevYearsLabel { get; set; }
    [Parameter] public string? NextYearsLabel { get; set; }

    /// <summary>The title button that drills into the month grid. <c>{label}</c> is the period shown.</summary>
    [Parameter] public string? ChooseMonthLabel { get; set; }

    /// <summary>The title button that drills into the year grid. <c>{label}</c> is the period shown.</summary>
    [Parameter] public string? ChooseYearLabel { get; set; }

    /// <summary>The year grid's title, back to months. <c>{start}</c> and <c>{end}</c> are the page range.</summary>
    [Parameter] public string? BackToMonthsLabel { get; set; }

    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayDatepicker.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-datepicker-change", nameof(OnChange));

    // The enhancer owns the built trigger + calendar; never let Blazor re-render the seed.
    protected override bool ShouldRender() => !Hydrated;

    /* Which is exactly why the three states are pushed rather than re-rendered: the seed above is
       written once, so a page that disables this field later would otherwise be ignored in
       silence. */
    protected override async Task OnParametersSetAsync()
    {
        if (!Hydrated) return;
        await JS.InvokeVoidAsync("FreedayDatepicker.setState", Root,
            new { disabled = Disabled, @readonly = Readonly, invalid = Invalid });
    }

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
