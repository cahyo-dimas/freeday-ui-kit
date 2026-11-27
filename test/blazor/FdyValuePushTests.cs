using Bunit;
using Bunit.JSInterop;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// Six wrappers render their seed once and hand the DOM to an enhancer (<c>ShouldRender =&gt;
/// !Hydrated</c>). A value the HOST changed afterwards was therefore never shown: only the states
/// were pushed (#123). <c>FdyCombo</c> always pushed its value; these hold the other six to the same
/// contract. A value the user picked is not pushed back, which would be an echo.
/// </summary>
public class FdyValuePushTests : BunitContext
{
    public FdyValuePushTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
        JSInterop.Setup<int>("FreedayBlazor.on", _ => true).SetResult(1);
        JSInterop.Setup<int>("FreedayBlazor.dateRangeOn", _ => true).SetResult(1);
    }

    /// <summary>The arguments after the element of every call to <paramref name="identifier"/>.</summary>
    private object?[][] Pushed(string identifier) => JSInterop.Invocations[identifier]
        .Select(i => i.Arguments.Skip(1).ToArray()).ToArray();

    [Fact]
    public async Task Datepicker_pushes_a_value_the_host_changes_and_not_one_the_user_picked()
    {
        var cut = Render<FdyDatepicker>(p => p.Add(c => c.Value, "2026-11-01"));
        cut.Render(p => p.Add(c => c.Value, "2026-11-20"));
        Assert.Equal(new object?[] { "2026-11-20" }, Assert.Single(Pushed("FreedayDatepicker.setValue")));

        await cut.InvokeAsync(() => cut.Instance.OnChange(new FdyDatepicker.ChangeDetail("2026-11-25", null)));
        cut.Render(p => p.Add(c => c.Value, "2026-11-25"));
        Assert.Single(Pushed("FreedayDatepicker.setValue"));
    }

    [Fact]
    public void Datepicker_pushes_a_cleared_value_as_empty()
    {
        var cut = Render<FdyDatepicker>(p => p.Add(c => c.Value, "2026-11-01"));
        cut.Render(p => p.Add(c => c.Value, (string?)null));
        Assert.Equal(new object?[] { "" }, Assert.Single(Pushed("FreedayDatepicker.setValue")));
    }

    [Fact]
    public void Monthpicker_pushes_a_value_the_host_changes()
    {
        var cut = Render<FdyMonthpicker>(p => p.Add(c => c.Value, "2026-10"));
        cut.Render(p => p.Add(c => c.Value, "2026-11"));
        Assert.Equal(new object?[] { "2026-11" }, Assert.Single(Pushed("FreedayDatepicker.setValue")));
    }

    [Fact]
    public async Task Timepicker_pushes_a_value_the_host_changes_and_not_one_the_user_picked()
    {
        var cut = Render<FdyTimepicker>(p => p.Add(c => c.Value, "07:00"));
        cut.Render(p => p.Add(c => c.Value, "08:30"));
        Assert.Equal(new object?[] { "08:30" }, Assert.Single(Pushed("FreedayTimepicker.setValue")));

        await cut.InvokeAsync(() => cut.Instance.OnSelect(new FdyTimepicker.SelectDetail("09:00")));
        cut.Render(p => p.Add(c => c.Value, "09:00"));
        Assert.Single(Pushed("FreedayTimepicker.setValue"));
    }

    [Fact]
    public void Cascade_pushes_a_value_the_host_changes()
    {
        var nodes = new List<FdyCascadeNode> { new("a", "Alpha"), new("b", "Beta") };
        var cut = Render<FdyCascade>(p => p.Add(c => c.Nodes, nodes).Add(c => c.Value, "a"));
        cut.Render(p => p.Add(c => c.Value, "b"));
        Assert.Equal(new object?[] { "b" }, Assert.Single(Pushed("FreedayCascade.setValue")));
    }

    [Fact]
    public void Autocomplete_pushes_value_and_options_the_host_changes_and_compares_options_by_content()
    {
        var cut = Render<FdyAutocomplete>(p => p
            .Add(c => c.Options, new List<string> { "pcs", "box" })
            .Add(c => c.Value, "pcs"));

        cut.Render(p => p.Add(c => c.Options, new List<string> { "pcs", "box" }));
        Assert.Empty(JSInterop.Invocations["FreedayAutocomplete.setOptions"]);

        cut.Render(p => p.Add(c => c.Options, new List<string> { "kg", "litre" }).Add(c => c.Value, "kg"));
        var options = Assert.Single(Pushed("FreedayAutocomplete.setOptions"));
        Assert.Equal(new[] { "kg", "litre" }, (IEnumerable<string>)options[0]!);
        Assert.Equal(new object?[] { "kg" }, Assert.Single(Pushed("FreedayAutocomplete.setValue")));
    }

    [Fact]
    public void Autocomplete_reports_free_text_as_it_is_typed()
    {
        string? bound = "pcs";
        var cut = Render<FdyAutocomplete>(p => p
            .Add(c => c.Options, new List<string> { "pcs" })
            .Add(c => c.Value, bound)
            .Add(c => c.ValueChanged, (string? v) => bound = v));

        cut.Find("input").Input("dozen");

        Assert.Equal("dozen", bound);
        cut.Render(p => p.Add(c => c.Value, bound));
        Assert.Empty(JSInterop.Invocations["FreedayAutocomplete.setValue"]);
    }

    [Fact]
    public async Task Single_range_pushes_the_interval_and_not_a_range_the_user_picked()
    {
        var cut = Render<FdyDateRange>(p => p
            .Add(c => c.Layout, FdyDateRangeLayout.Single)
            .Add(c => c.From, "2026-11-01").Add(c => c.To, "2026-11-30"));
        cut.Render(p => p.Add(c => c.From, "2026-12-01").Add(c => c.To, "2026-12-31"));
        Assert.Equal(new object?[] { "2026-12-01/2026-12-31" }, Assert.Single(Pushed("FreedayDatepicker.setValue")));

        await cut.InvokeAsync(() => cut.Instance.OnSettled(new FdyDateRange.SettledDetail("2026-12-05", "2026-12-09")));
        cut.Render(p => p.Add(c => c.From, "2026-12-05").Add(c => c.To, "2026-12-09"));
        Assert.Single(Pushed("FreedayDatepicker.setValue"));
    }

    [Fact]
    public void Split_range_pushes_both_ends_together()
    {
        var cut = Render<FdyDateRange>(p => p.Add(c => c.From, "2026-11-01").Add(c => c.To, "2026-11-30"));
        cut.Render(p => p.Add(c => c.From, "2026-12-01").Add(c => c.To, null));
        Assert.Equal(new object?[] { "2026-12-01", "" }, Assert.Single(Pushed("FreedayDatepicker.setRange")));
    }
}
