using Bunit;
using Microsoft.AspNetCore.Components;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// FdyAppShell is the first Blazor wrapper that reconciles a two-way binding against a JS enhancer
/// rather than driving a DOM element itself, and `dotnet build`, the stack's only gate until this
/// file existed, cannot see any of that. What is asserted here is the handshake: who wins on
/// hydrate, what the enhancer's event does to the binding, and that the two do not chase each other.
/// </summary>
public class FdyAppShellTests : BunitContext
{
    private const string IsVisible = "FreedayAppShell.isVisible";
    private const string SetVisible = "FreedayAppShell.setVisible";
    private const string Subscribe = "FreedayBlazor.on";

    public FdyAppShellTests()
    {
        // Loose mode covers the void calls (initAll, setVisible); the two that RETURN a value are
        // set up per-test, because their answers are what the component reasons about.
        JSInterop.Mode = JSRuntimeMode.Loose;
        JSInterop.Setup<int>(Subscribe, _ => true).SetResult(1);
    }

    [Fact]
    public void Unbound_it_adopts_what_the_shell_decided_from_the_viewport()
    {
        // The reason NavOpen is nullable: a caller cannot express "a column on a wide screen, hidden
        // on a narrow one" as a single initial value, so the shell answers and the binding follows.
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(true);
        bool? reported = null;

        Render<FdyAppShell>(p => p
            .Add(c => c.NavOpenChanged, EventCallback.Factory.Create<bool?>(this, v => reported = v)));

        Assert.True(reported);
        Assert.Empty(JSInterop.Invocations[SetVisible]);
    }

    [Fact]
    public void Unbound_and_hidden_reports_hidden_rather_than_assuming_visible()
    {
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(false);
        bool? reported = null;

        Render<FdyAppShell>(p => p
            .Add(c => c.NavOpenChanged, EventCallback.Factory.Create<bool?>(this, v => reported = v)));

        Assert.False(reported);
    }

    [Fact]
    public void Bound_the_caller_wins_and_is_pushed_down_on_hydrate()
    {
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(true);

        Render<FdyAppShell>(p => p.Add(c => c.NavOpen, false));

        var pushed = Assert.Single(JSInterop.Invocations[SetVisible]);
        Assert.Equal(false, pushed.Arguments[1]);
        // And the shell is never asked what it thinks; the caller already said.
        Assert.Empty(JSInterop.Invocations[IsVisible]);
    }

    [Fact]
    public async Task The_enhancers_event_reaches_the_binding()
    {
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(false);
        var reported = new List<bool?>();

        var cut = Render<FdyAppShell>(p => p
            .Add(c => c.NavOpenChanged, EventCallback.Factory.Create<bool?>(this, v => reported.Add(v))));
        reported.Clear();

        // What FreedayBlazor.on delivers when the toggle, Esc, the backdrop or a nav link fires.
        await cut.InvokeAsync(() => cut.Instance.OnNavChanged(new FdyAppShell.NavDetail(true)));

        Assert.Equal(new bool?[] { true }, reported);
    }

    [Fact]
    public async Task An_event_is_not_echoed_back_down_to_the_enhancer()
    {
        // The failure this guards: the enhancer announces a change, the binding updates, the new
        // parameter arrives, and the component pushes it straight back: two owners of one state
        // taking turns. `_lastNavOpen` is what stops it, and nothing else can see that it does.
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(false);
        bool? bound = null;

        var cut = Render<FdyAppShell>(p => p
            .Add(c => c.NavOpen, bound)
            .Add(c => c.NavOpenChanged, EventCallback.Factory.Create<bool?>(this, v => bound = v)));

        await cut.InvokeAsync(() => cut.Instance.OnNavChanged(new FdyAppShell.NavDetail(true)));
        cut.Render(p => p.Add(c => c.NavOpen, bound));

        Assert.Empty(JSInterop.Invocations[SetVisible]);
    }

    [Fact]
    public void A_caller_changing_its_mind_still_reaches_the_enhancer()
    {
        // The other half of the same guard: suppressing the echo must not suppress a real command.
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(false);

        var cut = Render<FdyAppShell>(p => p.Add(c => c.NavOpen, false));
        var beforeSecondPush = JSInterop.Invocations[SetVisible].Count;

        cut.Render(p => p.Add(c => c.NavOpen, true));

        var pushes = JSInterop.Invocations[SetVisible];
        Assert.Equal(beforeSecondPush + 1, pushes.Count);
        Assert.Equal(true, pushes.Last().Arguments[1]);
    }

    [Fact]
    public void It_renders_the_shell_the_enhancer_expects_to_find()
    {
        JSInterop.Setup<bool>(IsVisible, _ => true).SetResult(true);

        var cut = Render<FdyAppShell>(p => p
            .Add(c => c.Title, "Invoices")
            .Add(c => c.NavContent, (RenderFragment)(b => b.AddMarkupContent(0, "<nav class=\"fdy-nav\"></nav>"))));

        // data-fdy-app is the opt-in the enhancer scans for; without it the wrapper renders a shell
        // that looks right and does nothing at all.
        var root = cut.Find(".fdy-app");
        Assert.True(root.HasAttribute("data-fdy-app"));
        cut.Find(".fdy-app__sidebar");
        cut.Find(".fdy-app__navtoggle");
        cut.Find(".fdy-app__backdrop");
        Assert.Contains("Invoices", cut.Find(".fdy-app__title").TextContent);
    }
}
