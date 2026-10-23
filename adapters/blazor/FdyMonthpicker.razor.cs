using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

/// <summary>
/// A picker that answers with a whole month (<c>yyyy-MM</c>).
/// </summary>
/// <remarks>
/// <para>This is the replacement for <c>FdyDatepicker</c> with <c>Mode="FdyDatepickerMode.Month"</c>,
/// which shipped in 3.8.0 and is deprecated. There, <c>Value</c> is one <c>string?</c> holding
/// <c>yyyy-MM-dd</c> or <c>yyyy-MM</c> and a different parameter decides which, so nothing about
/// the binding tells a caller what to store in it. Here it has one format and there is no
/// <c>Mode</c>. The deprecated spelling keeps working until 4.0.</para>
/// <para>It is a separate seed rather than a wrapper around <c>FdyDatepicker</c>: that component
/// renders once and then hands its DOM to the enhancer (<c>ShouldRender =&gt; !Hydrated</c>), so
/// nesting it would mean forwarding an <c>ElementReference</c> and an event subscription through a
/// component that owns neither. The logic the two share is the enhancer itself, which both reach
/// through <c>FreedayDatepicker.init</c>, and that is already one copy.</para>
/// <para>Month names come from the page's <c>&lt;html lang&gt;</c> through <c>Intl</c>, which is
/// what <c>&lt;input type="month"&gt;</c> cannot do: it names the month in the browser's language.
/// So an Indonesian page reads <c>Oktober 2026</c> with nothing configured.</para>
/// </remarks>
public partial class FdyMonthpicker
{
    /// <summary>The chosen month as an ISO string (<c>yyyy-MM</c>), or "" when unset. One format,
    /// always. Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>Accessible label for the trigger. Defaults to the enhancer's <c>Month</c>.</summary>
    [Parameter] public string? Label { get; set; }

    /// <summary>Shown while nothing is picked. Defaults to the enhancer's <c>Choose a month</c>.</summary>
    [Parameter] public string? Placeholder { get; set; }

    /// <summary>Earliest selectable month (ISO <c>yyyy-MM</c>; a full <c>yyyy-MM-dd</c> is read too,
    /// as its own month). A bound that falls inside a month leaves that month pickable.</summary>
    [Parameter] public string? Min { get; set; }

    /// <summary>Latest selectable month.</summary>
    [Parameter] public string? Max { get; set; }

    /// <summary>Id for the trigger the enhancer builds, so a form's own label can point at it.</summary>
    [Parameter] public string? Id { get; set; }

    /// <summary>Id of the help or error text the trigger describes itself with.</summary>
    [Parameter] public string? Describedby { get; set; }

    /// <summary>Greyed and out of the tab order.</summary>
    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: focusable and showing its month, but the calendar will not open.
    /// Unlike <see cref="Disabled"/> it keeps tab order and is not greyed.</summary>
    [Parameter] public bool Readonly { get; set; }

    /// <summary>Marks the field invalid (<c>aria-invalid</c> + the error styling).</summary>
    [Parameter] public bool Invalid { get; set; }

    /* The calendar's navigation labels, and only the ones this picker shows. Month NAMES follow the
       page's `lang` through Intl and need nothing here. The day grid's own arrows are absent along
       with the day grid, so there is no PrevMonthLabel to pass: the arrows beside a month grid step
       a YEAR. Leave one null and the enhancer's English default stands. */
    [Parameter] public string? PrevYearLabel { get; set; }
    [Parameter] public string? NextYearLabel { get; set; }
    [Parameter] public string? PrevYearsLabel { get; set; }
    [Parameter] public string? NextYearsLabel { get; set; }

    /// <summary>The title button that drills into the year grid. <c>{label}</c> is the year shown.</summary>
    [Parameter] public string? ChooseYearLabel { get; set; }

    /// <summary>The year grid's title, back to months. <c>{start}</c> and <c>{end}</c> are the page range.</summary>
    [Parameter] public string? BackToMonthsLabel { get; set; }

    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayDatepicker.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-datepicker-change", nameof(OnChange));

    // The enhancer owns the built trigger + calendar; never let Blazor re-render the seed.
    protected override bool ShouldRender() => !Hydrated;

    /* Which is why the three states are pushed rather than re-rendered: the seed is written once,
       so a page that disables this field later would otherwise be ignored in silence. */
    protected override async Task OnParametersSetAsync()
    {
        if (!Hydrated) return;
        await JS.InvokeVoidAsync("FreedayDatepicker.setState", Root,
            new { disabled = Disabled, @readonly = Readonly, invalid = Invalid });
    }

    /// <summary>Invoked by the bridge when the user picks (or clears) a month.</summary>
    [JSInvokable]
    public async Task OnChange(ChangeDetail detail)
    {
        Value = detail.Value;
        await ValueChanged.InvokeAsync(detail.Value);
    }

    /// <summary>The detail shape of the enhancer's <c>fdy-datepicker-change</c> event.</summary>
    public sealed record ChangeDetail(string? Value, string? Date);
}
