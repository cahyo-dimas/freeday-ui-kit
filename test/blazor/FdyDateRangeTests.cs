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
}
