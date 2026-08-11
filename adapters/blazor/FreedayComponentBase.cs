using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

/// <summary>
/// Shared lifecycle for Freeday Blazor components that wrap a vanilla <c>fdy-*</c> enhancer:
/// hydrate the enhancer over the Blazor-rendered markup once on first render, forward its
/// bubbling <c>fdy-*</c> events to <c>[JSInvokable]</c> handlers, and clean both up on dispose.
/// The host page must load <c>dist/freeday.js</c> and <c>adapters/blazor/freeday-blazor.js</c>.
/// </summary>
/// <typeparam name="TSelf">The concrete component type (CRTP) so the .NET reference handed to
/// JS is typed to the instance and resolves its <c>[JSInvokable]</c> methods.</typeparam>
public abstract class FreedayComponentBase<TSelf> : ComponentBase, IAsyncDisposable
    where TSelf : FreedayComponentBase<TSelf>
{
    [Inject] protected IJSRuntime JS { get; set; } = default!;

    /// <summary>The component's root element, handed to the enhancer for hydration.</summary>
    protected ElementReference Root;

    private DotNetObjectReference<TSelf>? _self;
    private readonly List<int> _tokens = new();
    private bool _hydrated;

    /// <summary>True once the enhancer has been hydrated over the first render. Components whose
    /// DOM is owned by the enhancer (combo, datepicker, …) should stop rendering after this
    /// (<c>ShouldRender() =&gt; !Hydrated</c>) so Blazor never fights the enhancer's imperative
    /// DOM mutations; subsequent changes are pushed through the enhancer's API instead.</summary>
    protected bool Hydrated => _hydrated;

    /// <summary>A stable .NET reference the JS bridge invokes callbacks on.</summary>
    protected DotNetObjectReference<TSelf> Self => _self ??= DotNetObjectReference.Create((TSelf)this);

    /// <summary>Hydrate the enhancer(s) over this component's markup. Defaults to re-running every
    /// registered enhancer over <see cref="Root"/>; override to call a specific enhancer.</summary>
    protected virtual ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayBlazor.initAll", Root);

    /// <summary>Runs once after the first render, right after <see cref="HydrateAsync"/> — wire event
    /// subscriptions here.</summary>
    protected virtual ValueTask OnHydratedAsync() => ValueTask.CompletedTask;

    /// <summary>Extra teardown beyond event unsubscription (e.g. a dialog subscription).</summary>
    protected virtual ValueTask CleanupAsync() => ValueTask.CompletedTask;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender || _hydrated) return;
        _hydrated = true;
        await HydrateAsync();
        await OnHydratedAsync();
    }

    /// <summary>Subscribe a bubbling <c>fdy-*</c> event on <see cref="Root"/> to a
    /// <c>[JSInvokable]</c> method; the subscription is removed on dispose.</summary>
    protected async Task SubscribeAsync(string eventName, string method)
    {
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", Root, eventName, Self, method));
    }

    public async ValueTask DisposeAsync()
    {
        foreach (int token in _tokens)
        {
            try { await JS.InvokeVoidAsync("FreedayBlazor.off", token); }
            catch (JSDisconnectedException) { /* circuit/runtime already gone */ }
        }
        try { await CleanupAsync(); }
        catch (JSDisconnectedException) { /* circuit/runtime already gone */ }
        _self?.Dispose();
        GC.SuppressFinalize(this);
    }
}
