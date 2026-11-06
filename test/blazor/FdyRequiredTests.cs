using Bunit;
using Bunit.JSInterop;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// <c>Required</c> on every value-bearing Blazor control (#114). Two halves, the same two
/// <see cref="FdyPickerStateTests"/> asserts for the other states: that the parameter reaches the
/// markup the form enhancer reads, and that a change AFTER hydration is pushed through interop.
/// The second is what was missing for the five controls 3.12.0 gave <c>Required</c>: it was
/// rendered once and never pushed, so a field required only under a condition kept whatever it
/// had at first render.
/// </summary>
public class FdyRequiredTests : BunitContext
{
    public FdyRequiredTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
        JSInterop.Setup<int>("FreedayBlazor.on", _ => true).SetResult(1);
        JSInterop.Setup<int>("FreedayBlazor.dateRangeOn", _ => true).SetResult(1);
    }

    private sealed record Customer(string Code);

    private static readonly IReadOnlyList<CflColumn<Customer>> Columns =
        new List<CflColumn<Customer>> { new("Code", c => c.Code) };

    /// <summary>The <c>required</c> member of the last state object pushed through <paramref name="identifier"/>.</summary>
    private bool LastPushedRequired(string identifier)
    {
        JSRuntimeInvocation last = JSInterop.Invocations[identifier].Last();
        object state = last.Arguments[1] ?? throw new InvalidOperationException($"{identifier} was pushed a null state");
        object? value = state.GetType().GetProperty("required")?.GetValue(state);
        return value is bool b ? b : throw new InvalidOperationException($"{identifier} pushed a state with no `required`: {state}");
    }

    [Fact]
    public void Autocomplete_puts_the_native_required_on_its_input()
    {
        var input = Render<FdyAutocomplete>(p => p
            .Add(c => c.Options, new List<string> { "pcs" })
            .Add(c => c.Required, true))
            .Find("input");

        Assert.True(input.HasAttribute("required"));
        Assert.False(Render<FdyAutocomplete>(p => p.Add(c => c.Options, new List<string> { "pcs" }))
            .Find("input").HasAttribute("required"));
    }

    [Fact]
    public void Every_render_once_control_pushes_a_later_Required()
    {
        var auto = Render<FdyAutocomplete>(p => p.Add(c => c.Options, new List<string> { "pcs" }));
        auto.Render(p => p.Add(c => c.Required, true));
        Assert.True(LastPushedRequired("FreedayAutocomplete.setState"));

        var combo = Render<FdyCombo<string>>(p => p
            .Add(c => c.Value, "a")
            .Add(c => c.Options, new List<FdyComboOption<string>> { new("a", "Alpha") }));
        combo.Render(p => p.Add(c => c.Required, true));
        Assert.True(LastPushedRequired("FreedayCombo.setState"));

        var date = Render<FdyDatepicker>();
        date.Render(p => p.Add(c => c.Required, true));
        Assert.True(LastPushedRequired("FreedayDatepicker.setState"));

        var time = Render<FdyTimepicker>();
        time.Render(p => p.Add(c => c.Required, true));
        Assert.True(LastPushedRequired("FreedayTimepicker.setState"));

        var cascade = Render<FdyCascade>(p => p.Add(c => c.Nodes, new List<FdyCascadeNode> { new("a", "Alpha") }));
        cascade.Render(p => p.Add(c => c.Required, true));
        Assert.True(LastPushedRequired("FreedayCascade.setState"));
    }

    [Fact]
    public void Monthpicker_pushes_a_later_Required()
    {
        var month = Render<FdyMonthpicker>();
        month.Render(p => p.Add(c => c.Required, true));
        Assert.True(LastPushedRequired("FreedayDatepicker.setState"));
    }

    [Fact]
    public void DateRange_requires_both_ends_and_pushes_a_later_change_to_both()
    {
        var cut = Render<FdyDateRange>(p => p.Add(c => c.Required, true));
        Assert.Equal(2, cut.FindAll("[data-fdy-datepicker][data-fdy-required]").Count);
        Assert.Empty(Render<FdyDateRange>().FindAll("[data-fdy-required]"));

        int before = JSInterop.Invocations["FreedayDatepicker.setState"].Count;
        cut.Render(p => p.Add(c => c.Required, false));
        Assert.Equal(before + 2, JSInterop.Invocations["FreedayDatepicker.setState"].Count);
        Assert.False(LastPushedRequired("FreedayDatepicker.setState"));
    }

    [Fact]
    public void Cfl_takes_the_kit_path_on_its_group_and_mirrors_the_picked_key()
    {
        var cut = Render<FdyCfl<Customer>>(p => p
            .Add(c => c.LoadPage, (string _, int _) => Task.FromResult(new CflPage<Customer>(new List<Customer>(), false)))
            .Add(c => c.Columns, Columns)
            .Add(c => c.Display, c => c.Code)
            .Add(c => c.RowKey, c => c.Code)
            .Add(c => c.Required, true));

        var group = cut.Find(".fdy-input-group");
        Assert.True(group.HasAttribute("data-fdy-required"));
        Assert.Equal("", group.GetAttribute("data-value"));
        // The form finds the element to mark and focus by aria-haspopup; without it the mark lands
        // on the group itself, which paints no border.
        Assert.Equal("dialog", cut.Find(".fdy-input-group__btn[aria-haspopup]").GetAttribute("aria-haspopup"));

        // Blazor renders this component, it does not hand it to an enhancer: the mirror follows Value.
        cut.Render(p => p.Add(c => c.Value, new Customer("C-1001")));
        Assert.Equal("C-1001", cut.Find(".fdy-input-group").GetAttribute("data-value"));

        cut.Render(p => p.Add(c => c.Required, false));
        Assert.False(cut.Find(".fdy-input-group").HasAttribute("data-fdy-required"));
    }

    [Fact]
    public void Cfl_multi_mirrors_every_picked_key()
    {
        var cut = Render<FdyCfl<Customer>>(p => p
            .Add(c => c.LoadPage, (string _, int _) => Task.FromResult(new CflPage<Customer>(new List<Customer>(), false)))
            .Add(c => c.Columns, Columns)
            .Add(c => c.Display, c => c.Code)
            .Add(c => c.RowKey, c => c.Code)
            .Add(c => c.Multiple, true)
            .Add(c => c.Values, new List<Customer> { new("C-1"), new("C-2") }));

        Assert.Equal("C-1,C-2", cut.Find(".fdy-input-group").GetAttribute("data-value"));
    }
}
