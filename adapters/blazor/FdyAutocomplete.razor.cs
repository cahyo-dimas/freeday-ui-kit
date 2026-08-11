using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyAutocomplete
{
    /// <summary>The selected text. Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>The suggestions to filter and choose from (their text is the value).</summary>
    [Parameter, EditorRequired] public IReadOnlyList<string> Options { get; set; } = Array.Empty<string>();

    [Parameter] public string? Placeholder { get; set; }
    [Parameter] public string? AriaLabel { get; set; }

    /// <summary>Text shown when no option matches the typed query.</summary>
    [Parameter] public string EmptyText { get; set; } = "No results";

    private readonly string _listId = $"fdy-ac-{Guid.NewGuid():N}";

    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayAutocomplete.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-autocomplete-select", nameof(OnSelect));

    protected override bool ShouldRender() => !Hydrated;

    /// <summary>Invoked by the bridge when the user picks a suggestion.</summary>
    [JSInvokable]
    public async Task OnSelect(SelectDetail detail)
    {
        Value = detail.Value;
        await ValueChanged.InvokeAsync(detail.Value);
    }

    /// <summary>The (DOM-safe) detail of the enhancer's <c>fdy-autocomplete-select</c> event.</summary>
    public sealed record SelectDetail(string? Value);
}
