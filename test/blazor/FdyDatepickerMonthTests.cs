using Bunit;
using Xunit;

/* `Mode` and `FdyDatepickerMode.Month` are deprecated as of 3.9.0, replaced by FdyMonthpicker. This
   file is the test that proves the deprecated path still behaves, so it has to keep writing them,
   and a warning here would be the build complaining about the one use that is deliberate. Scoped to
   this file, so a real caller still gets told. */
#pragma warning disable CS0618

namespace Freeday.Blazor.Tests;

/// <summary>
/// A month picker reached Blazor the same way every other picker capability does: through the seed.
/// This wrapper renders once (<c>ShouldRender =&gt; !Hydrated</c>) and the enhancer builds the
/// trigger and the calendar, so the only thing C# owns here is the attribute that chooses the mode
/// and the binding the chosen month comes back through. Both are asserted, and the second one
/// matters: the value shape changes with the mode, from <c>yyyy-MM-dd</c> to <c>yyyy-MM</c>, and a
/// parameter that quietly rejected the shorter string would leave the mode unusable on this stack
/// while looking present in the markup.
/// </summary>
public class FdyDatepickerMonthTests : BunitContext
{
    public FdyDatepickerMonthTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
        JSInterop.Setup<int>("FreedayBlazor.on", _ => true).SetResult(1);
    }

    [Fact]
    public void Month_mode_reaches_the_seed_the_enhancer_reads()
    {
        var seed = Render<FdyDatepicker>(p => p
            .Add(c => c.Mode, FdyDatepickerMode.Month)
            .Add(c => c.Value, "2026-10"))
            .Find("[data-fdy-datepicker]");

        Assert.Equal("month", seed.GetAttribute("data-mode"));
        Assert.Equal("2026-10", seed.GetAttribute("data-value"));
    }

    [Fact]
    public void The_day_picker_is_the_absence_of_the_attribute()
    {
        // Not data-mode="day": the enhancer checks for "month", so anything else is the old path,
        // and an attribute nobody reads is one more thing to keep in step.
        var seed = Render<FdyDatepicker>().Find("[data-fdy-datepicker]");

        Assert.False(seed.HasAttribute("data-mode"));
    }

    [Fact]
    public async Task A_picked_month_binds_back_as_yyyy_MM()
    {
        var seen = new List<string?>();
        var cut = Render<FdyDatepicker>(p => p
            .Add(c => c.Mode, FdyDatepickerMode.Month)
            .Add(c => c.ValueChanged, (string? v) => seen.Add(v)));

        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyDatepicker.ChangeDetail("2026-11", null)));

        Assert.Equal("2026-11", Assert.Single(seen));
        Assert.Equal("2026-11", cut.Instance.Value);
    }
}
