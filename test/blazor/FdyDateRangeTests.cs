using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// A range used to report each end on its own, so a page that reloaded on change reloaded with the
/// start alone and again when the end arrived (#063). <c>Settled</c> fires only when the range is
/// whole: both ends chosen, or both cleared. The enhancer's change reaches .NET through
/// <c>OnChange</c>, which is what these drive.
/// </summary>
public class FdyDateRangeTests : BunitContext
{
    public FdyDateRangeTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    [Fact]
    public async Task Settled_waits_for_the_second_end()
    {
        var settled = new List<FdyDateRange.SettledRange>();
        var cut = Render<FdyDateRange>(p => p
            .Add(c => c.Settled, (FdyDateRange.SettledRange r) => settled.Add(r)));

        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyDateRange.RangeDetail("2026-10-05", "from")));
        Assert.Empty(settled);

        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyDateRange.RangeDetail("2026-10-20", "to")));
        Assert.Equal(new FdyDateRange.SettledRange("2026-10-05", "2026-10-20"), Assert.Single(settled));
    }

    [Fact]
    public async Task An_end_cleared_by_the_enhancer_unsettles_the_range()
    {
        var settled = new List<FdyDateRange.SettledRange>();
        var cut = Render<FdyDateRange>(p => p
            .Add(c => c.From, "2026-10-05")
            .Add(c => c.To, "2026-10-20")
            .Add(c => c.Settled, (FdyDateRange.SettledRange r) => settled.Add(r)));

        // A start past the end: the enhancer clears the end and announces it, then the new start.
        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyDateRange.RangeDetail("", "to")));
        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyDateRange.RangeDetail("2026-10-25", "from")));

        Assert.Empty(settled);
        Assert.Equal("", cut.Instance.To);
    }

    [Fact]
    public void Single_layout_seeds_one_field_with_the_whole_interval()
    {
        var cut = Render<FdyDateRange>(p => p
            .Add(c => c.Layout, FdyDateRangeLayout.Single)
            .Add(c => c.From, "2026-11-01")
            .Add(c => c.To, "2026-11-30")
            .Add(c => c.AriaLabel, "Period"));

        var field = cut.Find("[data-fdy-daterange]");
        Assert.Equal("single", field.GetAttribute("data-layout"));
        Assert.Equal("2026-11-01/2026-11-30", field.GetAttribute("data-value"));
        Assert.Equal("Period", field.GetAttribute("data-label"));
        Assert.Empty(cut.FindAll("[data-fdy-datepicker]"));
    }

    [Fact]
    public void Single_layout_never_seeds_half_a_range()
    {
        var cut = Render<FdyDateRange>(p => p
            .Add(c => c.Layout, FdyDateRangeLayout.Single)
            .Add(c => c.From, "2026-11-01"));

        Assert.Null(cut.Find("[data-fdy-daterange]").GetAttribute("data-value"));
    }

    [Fact]
    public async Task Single_layout_moves_both_ends_together_and_settles_once()
    {
        var settled = new List<FdyDateRange.SettledRange>();
        string? from = null, to = null;
        var cut = Render<FdyDateRange>(p => p
            .Add(c => c.Layout, FdyDateRangeLayout.Single)
            .Add(c => c.FromChanged, (string? v) => from = v)
            .Add(c => c.ToChanged, (string? v) => to = v)
            .Add(c => c.Settled, (FdyDateRange.SettledRange r) => settled.Add(r)));

        await cut.InvokeAsync(() => cut.Instance.OnSettled(new FdyDateRange.SettledDetail("2026-11-03", "2026-11-13")));

        Assert.Equal("2026-11-03", from);
        Assert.Equal("2026-11-13", to);
        Assert.Equal(new FdyDateRange.SettledRange("2026-11-03", "2026-11-13"), Assert.Single(settled));
    }
}
