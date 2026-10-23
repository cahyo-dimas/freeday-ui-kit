using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// <c>FdyMonthpicker</c> on this stack is a seed, the way every other picker capability reaches
/// Blazor: the enhancer builds the trigger and the calendar from the empty div, and the only things
/// C# owns are the attributes written into that div and the binding the chosen month comes back
/// through. So that is what is asserted here.
///
/// The point of the component is the signature. <c>FdyDatepicker.Value</c> is one
/// <c>string?</c> holding <c>yyyy-MM-dd</c> or <c>yyyy-MM</c> depending on <c>Mode</c>, which no
/// C# type can state; here <c>Value</c> has one format and <c>Mode</c> does not exist. The last
/// test holds that: a <c>Mode</c> parameter on this component would put the old ambiguity back.
/// </summary>
public class FdyMonthpickerTests : BunitContext
{
    public FdyMonthpickerTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
        JSInterop.Setup<int>("FreedayBlazor.on", _ => true).SetResult(1);
    }

    [Fact]
    public void The_seed_asks_the_enhancer_for_the_month_grid()
    {
        var seed = Render<FdyMonthpicker>(p => p
            .Add(c => c.Value, "2026-10"))
            .Find("[data-fdy-datepicker]");

        // The enhancer's own check is `=== 'month'`, so this attribute is the whole mode switch,
        // and it is written by the component rather than chosen by the caller.
        Assert.Equal("month", seed.GetAttribute("data-mode"));
        Assert.Equal("2026-10", seed.GetAttribute("data-value"));
    }

    [Fact]
    public async Task A_picked_month_binds_back_as_yyyy_MM()
    {
        var seen = new List<string?>();
        var cut = Render<FdyMonthpicker>(p => p
            .Add(c => c.ValueChanged, (string? v) => seen.Add(v)));

        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyMonthpicker.ChangeDetail("2026-11", null)));

        Assert.Equal("2026-11", Assert.Single(seen));
        Assert.Equal("2026-11", cut.Instance.Value);
    }

    [Fact]
    public void Bounds_reach_the_seed_as_the_months_they_are()
    {
        var seed = Render<FdyMonthpicker>(p => p
            .Add(c => c.Min, "2026-03")
            .Add(c => c.Max, "2026-10"))
            .Find("[data-fdy-datepicker]");

        Assert.Equal("2026-03", seed.GetAttribute("data-min"));
        Assert.Equal("2026-10", seed.GetAttribute("data-max"));
    }

    [Fact]
    public void There_is_no_mode_to_get_wrong()
    {
        // The reason the component exists. A `Mode` parameter here would mean `Value` again carries
        // two formats chosen by something else, which is the defect being retired.
        Assert.Null(typeof(FdyMonthpicker).GetProperty("Mode"));
    }
}
