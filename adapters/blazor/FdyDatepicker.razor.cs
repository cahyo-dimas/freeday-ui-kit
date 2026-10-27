using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyDatepicker
{
    /// <summary>Selected date as an ISO string (<c>yyyy-MM-dd</c>), or <c>yyyy-MM</c> when
    /// <see cref="Mode"/> is <see cref="FdyDatepickerMode.Month"/>, or "" when unset.
    /// Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>What the picker answers with. <see cref="FdyDatepickerMode.Day"/> (default) is the
    /// calendar as it always was. <see cref="FdyDatepickerMode.Month"/> opens on the month grid,
    /// stops there, and reports <c>yyyy-MM</c>.</summary>
    [Obsolete("Use FdyMonthpicker for a month. This parameter makes Value, Min and Max carry " +
              "yyyy-MM-dd or yyyy-MM while a different parameter decides which, so the binding " +
              "cannot state what to store in it. Still works, unchanged, and removed in 4.0.")]
    [Parameter] public FdyDatepickerMode Mode { get; set; } = FdyDatepickerMode.Day;

    /* null rather than "day" for the default: an attribute the enhancer does not need is an
       attribute no reader of the seed has to interpret, and the enhancer's own check is
       `=== 'month'`, so the day path is the absence of this.

       The pragma is the kit reading its OWN deprecated member, which is the one place that has to
       keep doing so: the promise is that `Mode` keeps working until 4.0, and it cannot work if the
       seed stops looking at it. Scoped to these two lines so every other use still warns. */
#pragma warning disable CS0618
    private string? ModeAttribute => Mode == FdyDatepickerMode.Month ? "month" : null;
#pragma warning restore CS0618

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

    /// <summary>Let a <c>data-fdy-validate</c> form demand this control be filled. Renders
    /// <c>data-fdy-required</c> on the root, and <c>freeday-form.js</c> refuses the submit, paints
    /// the message in the field and focuses the trigger. Needed because the trigger is a
    /// <c>&lt;button&gt;</c>: <c>willValidate</c> is false, so a plain <c>required</c> on it has
    /// never meant anything. Override the message with <c>data-fdy-msg-required</c> on the root.</summary>
    [Parameter] public bool Required { get; set; }

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

/// <summary>What <see cref="FdyDatepicker"/> answers with.</summary>
/// <remarks>The enum goes with <see cref="FdyDatepicker.Mode"/> in 4.0, so only
/// <see cref="Day"/> is left unmarked: it names the behaviour a picker with no
/// <c>Mode</c> already has, and writing it changes nothing.</remarks>
public enum FdyDatepickerMode
{
    /// <summary>A single day, reported as <c>yyyy-MM-dd</c>.</summary>
    Day,

    /// <summary>A whole month, reported as <c>yyyy-MM</c>.</summary>
    [Obsolete("Use FdyMonthpicker, whose Value is yyyy-MM and has no Mode to read. " +
              "Still works, unchanged, and removed in 4.0.")]
    Month,
}
