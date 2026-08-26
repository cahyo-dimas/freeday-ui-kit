using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyAppShell
{
    /// <summary>
    /// Whether the nav is visible to the reader, one idea, in both modes: above the nav breakpoint
    /// a hidden nav is a collapsed column, below it a visible nav is an overlay. The kit owns that
    /// mapping so an app never reasons about the viewport to answer a question about its own UI.
    /// <para>
    /// Leave it <c>null</c> (the default) and the shell keeps its own, starting from the viewport:
    /// a column on a wide screen, hidden on a narrow one. That default is why this is nullable,
    /// a caller cannot express it as a single initial value before it knows the viewport. Bind it
    /// (<c>@bind-NavOpen</c>) when the app wants to drive it from a menu or a saved preference.
    /// </para>
    /// </summary>
    [Parameter] public bool? NavOpen { get; set; }
    [Parameter] public EventCallback<bool?> NavOpenChanged { get; set; }

    /// <summary>Plain-text page title; ignored when <see cref="TitleContent"/> is supplied.</summary>
    [Parameter] public string Title { get; set; } = string.Empty;
    [Parameter] public RenderFragment? TitleContent { get; set; }

    /// <summary>The brand block at the top of the sidebar.</summary>
    [Parameter] public RenderFragment? BrandContent { get; set; }

    /// <summary>The navigation itself, normally a <c>.fdy-nav</c> list.</summary>
    [Parameter] public RenderFragment? NavContent { get; set; }

    /// <summary>Topbar actions, rendered after the title.</summary>
    [Parameter] public RenderFragment? TopbarContent { get; set; }

    /// <summary>The skip link, if the app ships one. Rendered as the shell's first child.</summary>
    [Parameter] public RenderFragment? SkipContent { get; set; }

    /// <summary>The page itself.</summary>
    [Parameter] public RenderFragment? ChildContent { get; set; }

    /// <summary>Custom glyph for the nav toggle; a hamburger is used when null.</summary>
    [Parameter] public RenderFragment? ToggleIcon { get; set; }

    [Parameter] public string ToggleLabel { get; set; } = "Toggle navigation";

    /// <summary>
    /// How a VISIBLE nav sits on a wide viewport: <see cref="FdyNavMode.Push"/> (default) makes it
    /// a column that displaces the content, <see cref="FdyNavMode.Overlay"/> floats it over the page
    /// with a backdrop. Below the nav breakpoint it is ignored — the nav is off-canvas there by
    /// definition, so there is nothing to choose.
    /// </summary>
    [Parameter] public FdyNavMode NavMode { get; set; } = FdyNavMode.Push;

    private string ShellClass =>
        NavMode == FdyNavMode.Overlay ? "fdy-app fdy-app--nav-overlay" : "fdy-app";

    private int _navToken;
    private bool? _lastNavOpen;
    private FdyNavMode _lastNavMode = FdyNavMode.Push;

    protected override async ValueTask HydrateAsync()
    {
        await JS.InvokeVoidAsync("FreedayBlazor.initAll", Root);
        _navToken = await JS.InvokeAsync<int>(
            "FreedayBlazor.on", Root, "fdy-app-nav", Self, nameof(OnNavChanged));

        if (NavOpen is bool wanted)
        {
            // A caller that bound a value is authoritative, push it down.
            await JS.InvokeVoidAsync("FreedayAppShell.setVisible", Root, wanted);
            _lastNavOpen = wanted;
        }
        else
        {
            // Nobody bound one, so adopt what the shell decided from the viewport. Without this the
            // bound value would claim `false` next to a nav that is plainly a visible column.
            bool visible = await JS.InvokeAsync<bool>("FreedayAppShell.isVisible", Root);
            _lastNavOpen = visible;
            await SetNavOpenAsync(visible);
        }
    }

    protected override async Task OnParametersSetAsync()
    {
        // Only reconcile once the shell is wired, and only when the caller actually changed it,
        // echoing our own event back down would fight the enhancer for the same state.
        if (_navToken != 0 && NavOpen is bool wanted && wanted != _lastNavOpen)
        {
            _lastNavOpen = wanted;
            await JS.InvokeVoidAsync("FreedayAppShell.setVisible", Root, wanted);
        }

        // Switching the mode moves the answer to "is the nav visible?" from one state class to the
        // other, so `inert` and `aria-expanded` describe the old arrangement until the shell re-reads
        // the DOM. Blazor has rendered the new class by now; this tells the enhancer to look again.
        if (_navToken != 0 && NavMode != _lastNavMode)
        {
            _lastNavMode = NavMode;
            await JS.InvokeVoidAsync("FreedayAppShell.refresh", Root);
        }
    }

    /// <summary>Invoked by the bridge when the shell's nav visibility changes for any reason,
    /// the toggle, Esc, the backdrop, following a nav link, or the viewport crossing the
    /// breakpoint.</summary>
    [JSInvokable]
    public async Task OnNavChanged(NavDetail detail)
    {
        _lastNavOpen = detail.Visible;
        await SetNavOpenAsync(detail.Visible);
    }

    private async Task SetNavOpenAsync(bool visible)
    {
        if (NavOpenChanged.HasDelegate)
        {
            await NavOpenChanged.InvokeAsync(visible);
        }
        else
        {
            NavOpen = visible;
            StateHasChanged();
        }
    }

    protected override async ValueTask CleanupAsync()
    {
        if (_navToken != 0)
        {
            await JS.InvokeVoidAsync("FreedayBlazor.off", _navToken);
        }
    }

    public sealed record NavDetail(bool Visible);
}

/// <summary>
/// How a visible nav sits on a wide viewport. The JS adapters take the same idea as the string
/// union <c>'push' | 'overlay'</c>; C# gets an enum, for the same reason the column filter type is
/// one — a typo in a string reaches the renderer, a typo in an enum member does not compile.
/// </summary>
public enum FdyNavMode
{
    /// <summary>A column that displaces the content (the default, and what every 2.x shell did).</summary>
    Push,

    /// <summary>Floats over the page with a backdrop, the way it already behaves on a narrow one.</summary>
    Overlay,
}
