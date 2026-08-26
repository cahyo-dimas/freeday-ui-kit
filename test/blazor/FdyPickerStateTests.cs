using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// The four picker wrappers used to be the thin ones: FdyDatepicker took six parameters against
/// its Vue twin's twenty-one, FdyAutocomplete six against eleven, FdyCascade eight against twelve,
/// and FdyCombo had every state but no Describedby. None of them could be disabled, locked or
/// marked invalid from a Blazor page at all (NEXT-UP #12).
///
/// Two things are asserted here, and the second is the one `dotnet build` can never see. First,
/// that each parameter reaches the markup the enhancer reads. Second, that a change AFTER the
/// first render is pushed through interop: these components stop rendering once hydrated
/// (`ShouldRender => !Hydrated`), so a parameter that is only rendered would go quiet the moment
/// a real form toggled it.
/// </summary>
public class FdyPickerStateTests : BunitContext
{
    public FdyPickerStateTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
        JSInterop.Setup<int>("FreedayBlazor.on", _ => true).SetResult(1);
    }

    [Fact]
    public void Datepicker_seeds_the_states_the_enhancer_reads()
    {
        var cut = Render<FdyDatepicker>(p => p
            .Add(c => c.Disabled, true)
            .Add(c => c.Readonly, true)
            .Add(c => c.Invalid, true)
            .Add(c => c.Id, "dp-1")
            .Add(c => c.Describedby, "dp-1-err"));

        var seed = cut.Find("[data-fdy-datepicker]");
        Assert.Equal("true", seed.GetAttribute("data-disabled"));
        Assert.Equal("true", seed.GetAttribute("data-readonly"));
        Assert.Equal("true", seed.GetAttribute("data-invalid"));
        Assert.Equal("dp-1", seed.GetAttribute("data-id"));
        Assert.Equal("dp-1-err", seed.GetAttribute("data-describedby"));
    }

    [Fact]
    public void Datepicker_omits_a_state_it_was_not_given_so_the_enhancer_default_stands()
    {
        var seed = Render<FdyDatepicker>().Find("[data-fdy-datepicker]");

        Assert.False(seed.HasAttribute("data-disabled"));
        Assert.False(seed.HasAttribute("data-readonly"));
        // An absent override must not render as an empty string: "" is a value, and it would blank
        // the label rather than leave the enhancer's own default in place.
        Assert.False(seed.HasAttribute("data-fdy-text-prev-month"));
    }

    [Fact]
    public void Datepicker_carries_the_navigation_labels_no_host_could_reach_before()
    {
        var seed = Render<FdyDatepicker>(p => p
            .Add(c => c.PrevMonthLabel, "Bulan sebelumnya")
            .Add(c => c.NextMonthLabel, "Bulan berikutnya")
            .Add(c => c.ChooseMonthLabel, "{label}, pilih bulan"))
            .Find("[data-fdy-datepicker]");

        Assert.Equal("Bulan sebelumnya", seed.GetAttribute("data-fdy-text-prev-month"));
        Assert.Equal("Bulan berikutnya", seed.GetAttribute("data-fdy-text-next-month"));
        Assert.Equal("{label}, pilih bulan", seed.GetAttribute("data-fdy-text-choose-month"));
    }

    [Fact]
    public void Datepicker_pushes_a_later_state_change_through_interop()
    {
        var cut = Render<FdyDatepicker>(p => p.Add(c => c.Readonly, false));
        Assert.Empty(JSInterop.Invocations["FreedayDatepicker.setState"]);

        cut.Render(p => p.Add(c => c.Readonly, true));

        // The seed is never re-rendered, so this call IS the change reaching the DOM.
        Assert.NotEmpty(JSInterop.Invocations["FreedayDatepicker.setState"]);
    }

    [Fact]
    public void Cascade_seeds_the_states_and_pushes_a_later_change()
    {
        var cut = Render<FdyCascade>(p => p
            .Add(c => c.Nodes, new List<FdyCascadeNode> { new("a", "Alpha") })
            .Add(c => c.Disabled, true));

        Assert.Equal("true", cut.Find("[data-fdy-cascade]").GetAttribute("data-disabled"));

        cut.Render(p => p
            .Add(c => c.Nodes, new List<FdyCascadeNode> { new("a", "Alpha") })
            .Add(c => c.Disabled, false));
        Assert.NotEmpty(JSInterop.Invocations["FreedayCascade.setState"]);
    }

    [Fact]
    public void Autocomplete_renders_the_states_on_the_input_itself()
    {
        var input = Render<FdyAutocomplete>(p => p
            .Add(c => c.Options, new List<string> { "Alpha" })
            .Add(c => c.Readonly, true)
            .Add(c => c.Invalid, true)
            .Add(c => c.Describedby, "ac-err"))
            .Find("input");

        Assert.True(input.HasAttribute("readonly"));
        Assert.Equal("true", input.GetAttribute("aria-invalid"));
        Assert.Equal("ac-err", input.GetAttribute("aria-describedby"));
    }

    [Fact]
    public void Combo_finally_points_at_its_own_error_text()
    {
        var button = Render<FdyCombo<string>>(p => p
            .Add(c => c.Value, "a")
            .Add(c => c.Options, new List<FdyComboOption<string>> { new("a", "Alpha") })
            .Add(c => c.Invalid, true)
            .Add(c => c.Describedby, "combo-err"))
            .Find("button");

        Assert.Equal("combo-err", button.GetAttribute("aria-describedby"));
        Assert.Equal("true", button.GetAttribute("aria-invalid"));
    }
}
